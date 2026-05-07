"use server";

import { format } from "date-fns";
import { getUser, checkRole, getCurrentUserRoleRow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { employeeAttendanceRecords } from "@/lib/db/schema/hr";
import { divisions } from "@/lib/db/schema/master";
import { attendanceRecordSchema } from "@/lib/validations/attendance";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

const ATTENDANCE_MANAGE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];

function normalizeDateInput(value?: string | null) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function getAttendanceWorkspace(selectedDateInput?: string) {
  const authError = await checkRole(ATTENDANCE_MANAGE_ROLES);
  if (authError) return authError;

  const roleRow = await getCurrentUserRoleRow();
  const selectedDate = normalizeDateInput(selectedDateInput);
  const employeeRows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      divisionName: divisions.name,
    })
    .from(employees)
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.fullName));

  const records = await db
    .select({
      id: employeeAttendanceRecords.id,
      employeeId: employeeAttendanceRecords.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      attendanceDate: employeeAttendanceRecords.attendanceDate,
      attendanceStatus: employeeAttendanceRecords.attendanceStatus,
      checkInTime: employeeAttendanceRecords.checkInTime,
      checkOutTime: employeeAttendanceRecords.checkOutTime,
      punctualityStatus: employeeAttendanceRecords.punctualityStatus,
      source: employeeAttendanceRecords.source,
      notes: employeeAttendanceRecords.notes,
      updatedAt: employeeAttendanceRecords.updatedAt,
    })
    .from(employeeAttendanceRecords)
    .innerJoin(employees, eq(employeeAttendanceRecords.employeeId, employees.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(eq(employeeAttendanceRecords.attendanceDate, selectedDate))
    .orderBy(asc(employees.fullName), desc(employeeAttendanceRecords.updatedAt));

  return {
    role: roleRow.role as UserRole,
    selectedDate: format(selectedDate, "yyyy-MM-dd"),
    employees: employeeRows,
    records,
  };
}

export async function upsertAttendanceRecord(input: unknown) {
  const authError = await checkRole(ATTENDANCE_MANAGE_ROLES);
  if (authError) return authError;

  const parsed = attendanceRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input absensi tidak valid." };
  }

  const user = await getUser();
  const [employee] = await db
    .select({ id: employees.id, isActive: employees.isActive })
    .from(employees)
    .where(eq(employees.id, parsed.data.employeeId))
    .limit(1);

  if (!employee?.isActive) {
    return { error: "Karyawan tidak aktif atau tidak ditemukan." };
  }

  const punctualityStatus = parsed.data.attendanceStatus === "HADIR"
    ? parsed.data.punctualityStatus
    : null;
  const payload = {
    employeeId: parsed.data.employeeId,
    attendanceDate: parsed.data.attendanceDate,
    attendanceStatus: parsed.data.attendanceStatus,
    checkInTime: parsed.data.checkInTime ?? null,
    checkOutTime: parsed.data.checkOutTime ?? null,
    punctualityStatus,
    source: "MANUAL" as const,
    recordedByUserId: user?.id ?? null,
    notes: parsed.data.notes ?? null,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: employeeAttendanceRecords.id })
    .from(employeeAttendanceRecords)
    .where(
      and(
        eq(employeeAttendanceRecords.employeeId, parsed.data.employeeId),
        eq(employeeAttendanceRecords.attendanceDate, parsed.data.attendanceDate)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(employeeAttendanceRecords)
      .set(payload)
      .where(eq(employeeAttendanceRecords.id, existing.id));
  } else {
    await db.insert(employeeAttendanceRecords).values(payload);
  }

  revalidatePath("/absensi");
  revalidatePath("/payroll");
  return { success: true };
}
