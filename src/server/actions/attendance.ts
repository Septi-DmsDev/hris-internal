"use server";

import { format } from "date-fns";
import { getUser, checkRole, getCurrentUserRoleRow } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { attendanceFallbackRequests, employeeAttendanceRecords } from "@/lib/db/schema/hr";
import { branches, divisions } from "@/lib/db/schema/master";
import { attendanceFallbackDecisionSchema, attendanceFallbackRequestSchema, attendanceRecordSchema } from "@/lib/validations/attendance";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

const ATTENDANCE_MANAGE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
const ATTENDANCE_SELF_SERVICE_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL", "SPV", "KABAG", "FINANCE", "PAYROLL_VIEWER"];

function normalizeDateInput(value?: string | null) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
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

  const fallbackRequests = await db
    .select({
      id: attendanceFallbackRequests.id,
      employeeId: attendanceFallbackRequests.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      attendanceDate: attendanceFallbackRequests.attendanceDate,
      photoUrl: attendanceFallbackRequests.photoUrl,
      latitude: attendanceFallbackRequests.latitude,
      longitude: attendanceFallbackRequests.longitude,
      distanceMeters: attendanceFallbackRequests.distanceMeters,
      radiusMetersSnapshot: attendanceFallbackRequests.radiusMetersSnapshot,
      geofenceMatched: attendanceFallbackRequests.geofenceMatched,
      fingerprintFailureReason: attendanceFallbackRequests.fingerprintFailureReason,
      developerModeDisabledConfirmed: attendanceFallbackRequests.developerModeDisabledConfirmed,
      status: attendanceFallbackRequests.status,
      reviewNotes: attendanceFallbackRequests.reviewNotes,
      reviewedAt: attendanceFallbackRequests.reviewedAt,
      createdAt: attendanceFallbackRequests.createdAt,
    })
    .from(attendanceFallbackRequests)
    .innerJoin(employees, eq(attendanceFallbackRequests.employeeId, employees.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(eq(attendanceFallbackRequests.attendanceDate, selectedDate))
    .orderBy(desc(attendanceFallbackRequests.createdAt));

  return {
    role: roleRow.role as UserRole,
    selectedDate: format(selectedDate, "yyyy-MM-dd"),
    employees: employeeRows,
    records,
    fallbackRequests,
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

export async function submitAttendanceFallbackRequest(input: unknown) {
  const authError = await checkRole(ATTENDANCE_SELF_SERVICE_ROLES);
  if (authError) return authError;

  const parsed = attendanceFallbackRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input fallback absensi tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  if (!roleRow.employeeId) {
    return { error: "Akun Anda belum terhubung ke data karyawan." };
  }

  const [employee] = await db
    .select({
      id: employees.id,
      isActive: employees.isActive,
      branchLat: branches.latitude,
      branchLon: branches.longitude,
      radiusMeters: branches.maxAttendanceRadiusMeters,
    })
    .from(employees)
    .leftJoin(branches, eq(employees.branchId, branches.id))
    .where(eq(employees.id, roleRow.employeeId))
    .limit(1);

  if (!employee?.isActive) {
    return { error: "Data karyawan tidak aktif atau tidak ditemukan." };
  }

  const branchLat = employee.branchLat != null ? Number(employee.branchLat) : null;
  const branchLon = employee.branchLon != null ? Number(employee.branchLon) : null;
  const radiusMeters = employee.radiusMeters ?? 150;
  let distanceMeters: number | null = null;
  let geofenceMatched = false;

  if (branchLat != null && branchLon != null) {
    distanceMeters = haversineMeters(branchLat, branchLon, parsed.data.latitude, parsed.data.longitude);
    geofenceMatched = distanceMeters <= radiusMeters;
  }

  const [existing] = await db
    .select({ id: attendanceFallbackRequests.id, status: attendanceFallbackRequests.status })
    .from(attendanceFallbackRequests)
    .where(
      and(
        eq(attendanceFallbackRequests.employeeId, roleRow.employeeId),
        eq(attendanceFallbackRequests.attendanceDate, parsed.data.attendanceDate)
      )
    )
    .limit(1);

  const payload = {
    employeeId: roleRow.employeeId,
    attendanceDate: parsed.data.attendanceDate,
    photoUrl: parsed.data.photoUrl,
    latitude: String(parsed.data.latitude),
    longitude: String(parsed.data.longitude),
    branchLatitudeSnapshot: branchLat != null ? String(branchLat) : null,
    branchLongitudeSnapshot: branchLon != null ? String(branchLon) : null,
    radiusMetersSnapshot: radiusMeters,
    distanceMeters,
    geofenceMatched,
    fingerprintFailureReason: parsed.data.fingerprintFailureReason,
    developerModeDisabledConfirmed: parsed.data.developerModeDisabledConfirmed,
    status: "PENDING" as const,
    createdByUserId: user?.id ?? roleRow.userId,
    updatedAt: new Date(),
  };

  if (existing && existing.status === "APPROVED") {
    return { error: "Request fallback untuk tanggal ini sudah disetujui." };
  }

  if (existing) {
    await db
      .update(attendanceFallbackRequests)
      .set(payload)
      .where(eq(attendanceFallbackRequests.id, existing.id));
  } else {
    await db.insert(attendanceFallbackRequests).values(payload);
  }

  revalidatePath("/absensi");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function approveAttendanceFallbackRequest(input: unknown) {
  const authError = await checkRole(ATTENDANCE_MANAGE_ROLES);
  if (authError) return authError;

  const parsed = attendanceFallbackDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input approval fallback tidak valid." };
  }

  const user = await getUser();
  const [request] = await db
    .select()
    .from(attendanceFallbackRequests)
    .where(eq(attendanceFallbackRequests.id, parsed.data.requestId))
    .limit(1);

  if (!request) return { error: "Request fallback tidak ditemukan." };
  if (request.status === "APPROVED") return { error: "Request sudah disetujui." };

  await db.transaction(async (tx) => {
    await tx
      .update(attendanceFallbackRequests)
      .set({
        status: "APPROVED",
        reviewedByUserId: user?.id ?? null,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.reviewNotes ?? request.reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(attendanceFallbackRequests.id, request.id));

    const [existingAttendance] = await tx
      .select({ id: employeeAttendanceRecords.id })
      .from(employeeAttendanceRecords)
      .where(
        and(
          eq(employeeAttendanceRecords.employeeId, request.employeeId),
          eq(employeeAttendanceRecords.attendanceDate, request.attendanceDate)
        )
      )
      .limit(1);

    const attendancePayload = {
      employeeId: request.employeeId,
      attendanceDate: request.attendanceDate,
      attendanceStatus: "HADIR" as const,
      punctualityStatus: "TEPAT_WAKTU" as const,
      source: "MANUAL" as const,
      recordedByUserId: user?.id ?? null,
      notes: `Approved fallback fingerprint. ${parsed.data.reviewNotes ?? ""}`.trim(),
      updatedAt: new Date(),
    };

    if (existingAttendance) {
      await tx
        .update(employeeAttendanceRecords)
        .set(attendancePayload)
        .where(eq(employeeAttendanceRecords.id, existingAttendance.id));
    } else {
      await tx.insert(employeeAttendanceRecords).values(attendancePayload);
    }
  });

  revalidatePath("/absensi");
  revalidatePath("/payroll");
  return { success: true };
}

export async function rejectAttendanceFallbackRequest(input: unknown) {
  const authError = await checkRole(ATTENDANCE_MANAGE_ROLES);
  if (authError) return authError;

  const parsed = attendanceFallbackDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input reject fallback tidak valid." };
  }

  const user = await getUser();
  const [request] = await db
    .select()
    .from(attendanceFallbackRequests)
    .where(eq(attendanceFallbackRequests.id, parsed.data.requestId))
    .limit(1);

  if (!request) return { error: "Request fallback tidak ditemukan." };
  if (request.status === "REJECTED") return { error: "Request sudah ditolak." };

  await db.transaction(async (tx) => {
    await tx
      .update(attendanceFallbackRequests)
      .set({
        status: "REJECTED",
        reviewedByUserId: user?.id ?? null,
        reviewedAt: new Date(),
        reviewNotes: parsed.data.reviewNotes ?? request.reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(attendanceFallbackRequests.id, request.id));

    const [existingAttendance] = await tx
      .select({ id: employeeAttendanceRecords.id })
      .from(employeeAttendanceRecords)
      .where(
        and(
          eq(employeeAttendanceRecords.employeeId, request.employeeId),
          eq(employeeAttendanceRecords.attendanceDate, request.attendanceDate)
        )
      )
      .limit(1);

    const attendancePayload = {
      employeeId: request.employeeId,
      attendanceDate: request.attendanceDate,
      attendanceStatus: "ALPA" as const,
      punctualityStatus: null,
      source: "MANUAL" as const,
      recordedByUserId: user?.id ?? null,
      notes: `Rejected fallback fingerprint. ${parsed.data.reviewNotes ?? ""}`.trim(),
      updatedAt: new Date(),
    };

    if (existingAttendance) {
      await tx
        .update(employeeAttendanceRecords)
        .set(attendancePayload)
        .where(eq(employeeAttendanceRecords.id, existingAttendance.id));
    } else {
      await tx.insert(employeeAttendanceRecords).values(attendancePayload);
    }
  });

  revalidatePath("/absensi");
  revalidatePath("/payroll");
  return { success: true };
}

export async function getMyAttendanceFallbackRequests() {
  const authError = await checkRole(ATTENDANCE_SELF_SERVICE_ROLES);
  if (authError) return [];
  const roleRow = await getCurrentUserRoleRow();
  if (!roleRow.employeeId) return [];

  return db
    .select({
      id: attendanceFallbackRequests.id,
      attendanceDate: attendanceFallbackRequests.attendanceDate,
      photoUrl: attendanceFallbackRequests.photoUrl,
      distanceMeters: attendanceFallbackRequests.distanceMeters,
      radiusMetersSnapshot: attendanceFallbackRequests.radiusMetersSnapshot,
      geofenceMatched: attendanceFallbackRequests.geofenceMatched,
      fingerprintFailureReason: attendanceFallbackRequests.fingerprintFailureReason,
      status: attendanceFallbackRequests.status,
      reviewNotes: attendanceFallbackRequests.reviewNotes,
      createdAt: attendanceFallbackRequests.createdAt,
    })
    .from(attendanceFallbackRequests)
    .where(eq(attendanceFallbackRequests.employeeId, roleRow.employeeId))
    .orderBy(desc(attendanceFallbackRequests.createdAt));
}
