import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { employeeAttendanceRecords } from "@/lib/db/schema/hr";
import { employeeScheduleAssignments, workScheduleDays } from "@/lib/db/schema/employee";
import { admsAttendanceIngestSchema } from "@/lib/validations/attendance";
import { resolveAttendancePunctuality } from "@/server/attendance-engine/resolve-attendance-punctuality";

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pickAssignmentForDate<
  T extends { effectiveStartDate: Date; effectiveEndDate: Date | null; createdAt?: Date | null }
>(rows: T[], date: Date) {
  const target = startOfLocalDay(date);
  let selected: T | null = null;

  for (const row of rows) {
    const rowStart = startOfLocalDay(row.effectiveStartDate);
    const rowEnd = row.effectiveEndDate ? startOfLocalDay(row.effectiveEndDate) : null;

    if (rowStart > target) continue;
    if (rowEnd && rowEnd < target) continue;

    if (!selected) {
      selected = row;
      continue;
    }

    const selectedStart = startOfLocalDay(selected.effectiveStartDate);
    if (rowStart > selectedStart) {
      selected = row;
      continue;
    }

    if (rowStart.getTime() === selectedStart.getTime()) {
      const selectedCreated = selected.createdAt ? new Date(selected.createdAt).getTime() : 0;
      const rowCreated = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      if (rowCreated >= selectedCreated) {
        selected = row;
      }
    }
  }

  return selected;
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.ADMS_INGEST_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ error: "Server ADMS belum dikonfigurasi." }, { status: 500 });
  }

  const token = getBearerToken(request);
  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = admsAttendanceIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? "Payload ADMS tidak valid.",
      issues: parsed.error.issues,
    }, { status: 400 });
  }

  const uniqueCodes = [...new Set(parsed.data.records.map((item) => item.employeeCode))];
  const employeeRows = await db
    .select({ id: employees.id, employeeCode: employees.employeeCode, isActive: employees.isActive })
    .from(employees)
    .where(inArray(employees.employeeCode, uniqueCodes));

  const employeeByCode = new Map(employeeRows.map((row) => [row.employeeCode, row]));
  const employeeIds = employeeRows.map((row) => row.id);
  const assignmentRows = employeeIds.length > 0
    ? await db
        .select({
          employeeId: employeeScheduleAssignments.employeeId,
          scheduleId: employeeScheduleAssignments.scheduleId,
          effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
          effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
          createdAt: employeeScheduleAssignments.createdAt,
        })
        .from(employeeScheduleAssignments)
        .where(inArray(employeeScheduleAssignments.employeeId, employeeIds))
    : [];
  const scheduleIds = [...new Set(assignmentRows.map((row) => row.scheduleId))];
  const scheduleDayRows = scheduleIds.length > 0
    ? await db
        .select({
          scheduleId: workScheduleDays.scheduleId,
          dayOfWeek: workScheduleDays.dayOfWeek,
          isWorkingDay: workScheduleDays.isWorkingDay,
          dayStatus: workScheduleDays.dayStatus,
          startTime: workScheduleDays.startTime,
          endTime: workScheduleDays.endTime,
          breakStart: workScheduleDays.breakStart,
          breakEnd: workScheduleDays.breakEnd,
          breakToleranceMinutes: workScheduleDays.breakToleranceMinutes,
          checkInToleranceMinutes: workScheduleDays.checkInToleranceMinutes,
        })
        .from(workScheduleDays)
        .where(inArray(workScheduleDays.scheduleId, scheduleIds))
    : [];

  const assignmentByEmployee = new Map<string, typeof assignmentRows>();
  for (const row of assignmentRows) {
    const current = assignmentByEmployee.get(row.employeeId) ?? [];
    current.push(row);
    assignmentByEmployee.set(row.employeeId, current);
  }

  const scheduleDayMap = new Map<string, Map<number, (typeof scheduleDayRows)[0]>>();
  for (const row of scheduleDayRows) {
    const current = scheduleDayMap.get(row.scheduleId) ?? new Map<number, (typeof scheduleDayRows)[0]>();
    current.set(row.dayOfWeek, row);
    scheduleDayMap.set(row.scheduleId, current);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ employeeCode: string; attendanceDate: string; reason: string }> = [];

  for (const item of parsed.data.records) {
    const employee = employeeByCode.get(item.employeeCode);
    const attendanceDateIso = item.attendanceDate.toISOString().slice(0, 10);

    if (!employee || !employee.isActive) {
      skipped += 1;
      errors.push({ employeeCode: item.employeeCode, attendanceDate: attendanceDateIso, reason: "Karyawan tidak ditemukan/tidak aktif." });
      continue;
    }

    const [existing] = await db
      .select({ id: employeeAttendanceRecords.id, source: employeeAttendanceRecords.source })
      .from(employeeAttendanceRecords)
      .where(
        and(
          eq(employeeAttendanceRecords.employeeId, employee.id),
          eq(employeeAttendanceRecords.attendanceDate, item.attendanceDate)
        )
      )
      .limit(1);

    if (existing && existing.source === "MANUAL") {
      skipped += 1;
      errors.push({ employeeCode: item.employeeCode, attendanceDate: attendanceDateIso, reason: "Sudah ada absensi MANUAL, dilewati." });
      continue;
    }

    const dayOfWeek = item.attendanceDate.getDay();
    const assignment = pickAssignmentForDate(assignmentByEmployee.get(employee.id) ?? [], item.attendanceDate);
    const scheduleDay = assignment
      ? scheduleDayMap.get(assignment.scheduleId)?.get(dayOfWeek) ?? null
      : null;
    const punctualityStatus = resolveAttendancePunctuality({
      checkInTime: item.checkInTime ?? null,
      checkOutTime: item.checkOutTime ?? null,
      breakOutTime: item.breakOutTime ?? null,
      breakInTime: item.breakInTime ?? null,
      scheduleDay: scheduleDay
        ? {
            isWorkingDay: scheduleDay.isWorkingDay,
            dayStatus: scheduleDay.dayStatus,
            startTime: scheduleDay.startTime,
            endTime: scheduleDay.endTime,
            breakStart: scheduleDay.breakStart,
            breakEnd: scheduleDay.breakEnd,
            breakToleranceMinutes: scheduleDay.breakToleranceMinutes,
            checkInToleranceMinutes: scheduleDay.checkInToleranceMinutes,
          }
        : null,
    });

    const payload = {
      employeeId: employee.id,
      attendanceDate: item.attendanceDate,
      attendanceStatus: item.attendanceStatus,
      checkInTime: item.checkInTime ?? null,
      checkOutTime: item.checkOutTime ?? null,
      punctualityStatus,
      source: "FINGERPRINT_ADMS" as const,
      externalDeviceId: parsed.data.deviceId,
      externalUserCode: item.externalUserCode ?? item.employeeCode,
      rawPayload: {
        ...(item.rawPayload ?? {}),
        externalEventId: item.externalEventId ?? null,
        employeeCode: item.employeeCode,
        breakOutTime: item.breakOutTime ?? null,
        breakInTime: item.breakInTime ?? null,
      },
      syncedAt: new Date(),
      notes: item.notes ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(employeeAttendanceRecords)
        .set(payload)
        .where(eq(employeeAttendanceRecords.id, existing.id));
      updated += 1;
    } else {
      await db.insert(employeeAttendanceRecords).values(payload);
      inserted += 1;
    }
  }

  revalidatePath("/absensi");
  revalidatePath("/payroll");

  return NextResponse.json({
    success: true,
    deviceId: parsed.data.deviceId,
    total: parsed.data.records.length,
    inserted,
    updated,
    skipped,
    errors,
  });
}
