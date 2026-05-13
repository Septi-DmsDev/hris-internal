import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { employeeAttendanceRecords } from "@/lib/db/schema/hr";
import { employeeScheduleAssignments, workScheduleDays } from "@/lib/db/schema/employee";
import { admsRawTapIngestSchema } from "@/lib/validations/attendance";
import { classifyTaps } from "@/server/attendance-engine/classify-taps";
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
    if (!selected) { selected = row; continue; }
    const selectedStart = startOfLocalDay(selected.effectiveStartDate);
    if (rowStart > selectedStart) { selected = row; continue; }
    if (rowStart.getTime() === selectedStart.getTime()) {
      const selC = selected.createdAt ? new Date(selected.createdAt).getTime() : 0;
      const rowC = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      if (rowC >= selC) selected = row;
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
  const parsed = admsRawTapIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Payload tidak valid.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const attendanceDate = new Date(parsed.data.date);
  const dayOfWeek = attendanceDate.getDay();

  // Group taps by employeeCode, sorted ascending
  const tapsByEmployee = new Map<string, string[]>();
  for (const tap of parsed.data.taps) {
    const existing = tapsByEmployee.get(tap.employeeCode) ?? [];
    existing.push(tap.time);
    tapsByEmployee.set(tap.employeeCode, existing);
  }
  for (const [code, times] of tapsByEmployee) {
    tapsByEmployee.set(code, [...times].sort());
  }

  const uniqueCodes = [...tapsByEmployee.keys()];
  const employeeRows = await db
    .select({ id: employees.id, employeeCode: employees.employeeCode, isActive: employees.isActive })
    .from(employees)
    .where(inArray(employees.employeeCode, uniqueCodes));

  const employeeByCode = new Map(employeeRows.map((row) => [row.employeeCode, row]));
  const employeeIds = employeeRows.map((row) => row.id);

  const [assignmentRows, existingRows] = await Promise.all([
    employeeIds.length > 0
      ? db.select({
          employeeId: employeeScheduleAssignments.employeeId,
          scheduleId: employeeScheduleAssignments.scheduleId,
          effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
          effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
          createdAt: employeeScheduleAssignments.createdAt,
        })
        .from(employeeScheduleAssignments)
        .where(inArray(employeeScheduleAssignments.employeeId, employeeIds))
      : Promise.resolve([]),
    employeeIds.length > 0
      ? db.select({
          id: employeeAttendanceRecords.id,
          source: employeeAttendanceRecords.source,
          employeeId: employeeAttendanceRecords.employeeId,
          attendanceDate: employeeAttendanceRecords.attendanceDate,
        })
        .from(employeeAttendanceRecords)
        .where(
          and(
            inArray(employeeAttendanceRecords.employeeId, employeeIds),
            eq(employeeAttendanceRecords.attendanceDate, attendanceDate)
          )
        )
      : Promise.resolve([]),
  ]);

  const scheduleIds = [...new Set(assignmentRows.map((r) => r.scheduleId))];
  const scheduleDayRows = scheduleIds.length > 0
    ? await db.select({
        scheduleId: workScheduleDays.scheduleId,
        dayOfWeek: workScheduleDays.dayOfWeek,
        isWorkingDay: workScheduleDays.isWorkingDay,
        dayStatus: workScheduleDays.dayStatus,
        startTime: workScheduleDays.startTime,
        endTime: workScheduleDays.endTime,
        breakStart: workScheduleDays.breakStart,
        breakEnd: workScheduleDays.breakEnd,
        checkOutStart: workScheduleDays.checkOutStart,
        breakToleranceMinutes: workScheduleDays.breakToleranceMinutes,
        checkInToleranceMinutes: workScheduleDays.checkInToleranceMinutes,
        checkOutToleranceMinutes: workScheduleDays.checkOutToleranceMinutes,
      })
      .from(workScheduleDays)
      .where(inArray(workScheduleDays.scheduleId, scheduleIds))
    : [];

  const assignmentByEmployee = new Map<string, typeof assignmentRows>();
  for (const row of assignmentRows) {
    const cur = assignmentByEmployee.get(row.employeeId) ?? [];
    cur.push(row);
    assignmentByEmployee.set(row.employeeId, cur);
  }

  const scheduleDayMap = new Map<string, Map<number, (typeof scheduleDayRows)[0]>>();
  for (const row of scheduleDayRows) {
    const cur = scheduleDayMap.get(row.scheduleId) ?? new Map<number, (typeof scheduleDayRows)[0]>();
    cur.set(row.dayOfWeek, row);
    scheduleDayMap.set(row.scheduleId, cur);
  }

  const existingByEmployee = new Map<string, { id: string; source: string }>();
  for (const row of existingRows) {
    existingByEmployee.set(row.employeeId, { id: row.id, source: row.source });
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ employeeCode: string; reason: string }> = [];

  type InsertPayload = typeof employeeAttendanceRecords.$inferInsert;
  type UpdateEntry = { id: string; employeeCode: string; payload: Omit<InsertPayload, "id"> };

  const insertPayloads: InsertPayload[] = [];
  const updatePayloads: UpdateEntry[] = [];

  for (const [employeeCode, sortedTimes] of tapsByEmployee) {
    const employee = employeeByCode.get(employeeCode);
    if (!employee || !employee.isActive) {
      skipped += 1;
      errors.push({ employeeCode, reason: "Karyawan tidak ditemukan/tidak aktif." });
      continue;
    }

    const existing = existingByEmployee.get(employee.id);
    if (existing && existing.source === "MANUAL") {
      skipped += 1;
      errors.push({ employeeCode, reason: "Sudah ada absensi MANUAL, dilewati." });
      continue;
    }

    const assignment = pickAssignmentForDate(
      assignmentByEmployee.get(employee.id) ?? [],
      attendanceDate
    );
    const scheduleDay = assignment
      ? scheduleDayMap.get(assignment.scheduleId)?.get(dayOfWeek) ?? null
      : null;

    const classified = classifyTaps(sortedTimes, scheduleDay
      ? {
          isWorkingDay: scheduleDay.isWorkingDay,
          startTime: scheduleDay.startTime,
          endTime: scheduleDay.endTime,
          breakStart: scheduleDay.breakStart,
          breakEnd: scheduleDay.breakEnd,
          checkOutStart: scheduleDay.checkOutStart,
        }
      : null
    );

    const punctualityStatus = resolveAttendancePunctuality({
      checkInTime: classified.checkInTime ?? null,
      checkOutTime: classified.checkOutTime ?? null,
      breakOutTime: classified.breakOutTime ?? null,
      breakInTime: classified.breakInTime ?? null,
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
            checkOutStart: scheduleDay.checkOutStart,
            checkOutToleranceMinutes: scheduleDay.checkOutToleranceMinutes,
          }
        : null,
    });

    const payload = {
      employeeId: employee.id,
      attendanceDate,
      attendanceStatus: "HADIR" as const,
      checkInTime: classified.checkInTime ?? null,
      checkOutTime: classified.checkOutTime ?? null,
      punctualityStatus,
      source: "FINGERPRINT_ADMS" as const,
      rawPayload: {
        taps: sortedTimes,
        breakOutTime: classified.breakOutTime ?? null,
        breakInTime: classified.breakInTime ?? null,
        employeeCode,
      },
      syncedAt: new Date(),
      notes: null,
      updatedAt: new Date(),
    };

    if (existing) {
      updatePayloads.push({ id: existing.id, employeeCode, payload });
      updated += 1;
    } else {
      insertPayloads.push(payload);
      inserted += 1;
    }
  }

  if (insertPayloads.length > 0) {
    try {
      await db.insert(employeeAttendanceRecords).values(insertPayloads);
    } catch (err) {
      inserted = 0;
      errors.push({ employeeCode: "BATCH_INSERT", reason: String(err) });
    }
  }

  if (updatePayloads.length > 0) {
    const results = await Promise.allSettled(
      updatePayloads.map((p) =>
        db.update(employeeAttendanceRecords).set(p.payload).where(eq(employeeAttendanceRecords.id, p.id))
      )
    );
    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        updated -= 1;
        errors.push({ employeeCode: updatePayloads[i]?.employeeCode ?? "", reason: String(result.reason) });
      }
    }
  }

  revalidatePath("/absensi");
  revalidatePath("/payroll");

  return NextResponse.json({
    success: true,
    date: parsed.data.date,
    total: tapsByEmployee.size,
    inserted,
    updated,
    skipped,
    errors,
  });
}
