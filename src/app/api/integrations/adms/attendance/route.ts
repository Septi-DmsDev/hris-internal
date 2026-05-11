import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { employeeAttendanceRecords } from "@/lib/db/schema/hr";
import { admsAttendanceIngestSchema } from "@/lib/validations/attendance";

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
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

    const payload = {
      employeeId: employee.id,
      attendanceDate: item.attendanceDate,
      attendanceStatus: item.attendanceStatus,
      checkInTime: item.checkInTime ?? null,
      checkOutTime: item.checkOutTime ?? null,
      punctualityStatus: item.attendanceStatus === "HADIR" ? item.punctualityStatus ?? null : null,
      source: "FINGERPRINT_ADMS" as const,
      externalDeviceId: parsed.data.deviceId,
      externalUserCode: item.externalUserCode ?? item.employeeCode,
      rawPayload: item.rawPayload ?? {
        externalEventId: item.externalEventId ?? null,
        employeeCode: item.employeeCode,
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
