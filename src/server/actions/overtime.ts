"use server";

import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { checkRole, getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { attendanceTickets, overtimeRequests } from "@/lib/db/schema/hr";
import { divisions } from "@/lib/db/schema/master";
import { resolvePayrollPeriod } from "@/server/payroll-engine/resolve-payroll-period";
import { overtimeDecisionSchema, overtimeRequestSchema } from "@/lib/validations/overtime";
import type { UserRole } from "@/types";

const OVERTIME_APPROVER_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV"];
const OVERTIME_SUBMITTER_ROLES: UserRole[] = ["TEAMWORK"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];

const OVERTIME_TYPE_CONFIG = {
  OVERTIME_1H: { overtimeHours: 1, breakHours: 0, baseAmount: 11_000, mealAmount: 0 },
  OVERTIME_2H: { overtimeHours: 2, breakHours: 0, baseAmount: 22_000, mealAmount: 0 },
  OVERTIME_3H: { overtimeHours: 3, breakHours: 0, baseAmount: 33_000, mealAmount: 10_000 },
  LEMBUR_FULLDAY: { overtimeHours: 8, breakHours: 1, baseAmount: 100_000, mealAmount: 20_000 },
  PATCH_ABSENCE_3H: { overtimeHours: 3, breakHours: 0, baseAmount: 11_000, mealAmount: 30_000 },
} as const;

type OvertimeType = keyof typeof OVERTIME_TYPE_CONFIG;

type OvertimeRequestRow = {
  id: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  divisionName: string | null;
  requestDate: Date;
  overtimeType: OvertimeType;
  overtimeHours: number;
  breakHours: number;
  baseAmount: string | number;
  mealAmount: string | number;
  totalAmount: string | number;
  periodCode: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
};

function resolvePeriodCodeFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getScopedOvertimeRows(role: UserRole, divisionIds: string[]) {
  const baseQuery = db
    .select({
      id: overtimeRequests.id,
      employeeId: overtimeRequests.employeeId,
      employeeCode: employees.employeeCode,
      employeeName: employees.fullName,
      divisionName: divisions.name,
      requestDate: overtimeRequests.requestDate,
      overtimeType: overtimeRequests.overtimeType,
      overtimeHours: overtimeRequests.overtimeHours,
      breakHours: overtimeRequests.breakHours,
      baseAmount: overtimeRequests.baseAmount,
      mealAmount: overtimeRequests.mealAmount,
      totalAmount: overtimeRequests.totalAmount,
      periodCode: overtimeRequests.periodCode,
      reason: overtimeRequests.reason,
      status: overtimeRequests.status,
      reviewNotes: overtimeRequests.reviewNotes,
      approvedAt: overtimeRequests.approvedAt,
      rejectedAt: overtimeRequests.rejectedAt,
      createdAt: overtimeRequests.createdAt,
    })
    .from(overtimeRequests)
    .leftJoin(employees, eq(overtimeRequests.employeeId, employees.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id));

  if (DIV_SCOPED_ROLES.includes(role)) {
    if (divisionIds.length === 0) return [];
    return (await baseQuery
      .where(inArray(employees.divisionId, divisionIds))
      .orderBy(desc(overtimeRequests.requestDate), desc(overtimeRequests.createdAt))) as OvertimeRequestRow[];
  }

  return (await baseQuery.orderBy(desc(overtimeRequests.requestDate), desc(overtimeRequests.createdAt))) as OvertimeRequestRow[];
}

export async function getOvertimeWorkspace() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const canSubmit = OVERTIME_SUBMITTER_ROLES.includes(role);
  const canApprove = OVERTIME_APPROVER_ROLES.includes(role);
  if (!canSubmit && !canApprove) {
    return { error: "Akses ditolak." };
  }

  const allRows = canApprove ? await getScopedOvertimeRows(role, roleRow.divisionIds) : [];

  const myRows = canSubmit && roleRow.employeeId
    ? ((await db
      .select({
        id: overtimeRequests.id,
        employeeId: overtimeRequests.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: employees.fullName,
        divisionName: divisions.name,
        requestDate: overtimeRequests.requestDate,
        overtimeType: overtimeRequests.overtimeType,
        overtimeHours: overtimeRequests.overtimeHours,
        breakHours: overtimeRequests.breakHours,
        baseAmount: overtimeRequests.baseAmount,
        mealAmount: overtimeRequests.mealAmount,
        totalAmount: overtimeRequests.totalAmount,
        periodCode: overtimeRequests.periodCode,
        reason: overtimeRequests.reason,
        status: overtimeRequests.status,
        reviewNotes: overtimeRequests.reviewNotes,
        approvedAt: overtimeRequests.approvedAt,
        rejectedAt: overtimeRequests.rejectedAt,
        createdAt: overtimeRequests.createdAt,
      })
      .from(overtimeRequests)
      .leftJoin(employees, eq(overtimeRequests.employeeId, employees.id))
      .leftJoin(divisions, eq(employees.divisionId, divisions.id))
      .where(eq(overtimeRequests.employeeId, roleRow.employeeId))
      .orderBy(desc(overtimeRequests.requestDate), desc(overtimeRequests.createdAt))) as OvertimeRequestRow[])
    : [];

  return {
    role,
    canSubmit,
    canApprove,
    myRequests: myRows,
    pendingRequests: allRows.filter((row) => row.status === "PENDING"),
    processedRequests: allRows.filter((row) => row.status !== "PENDING"),
  };
}

export async function submitOvertimeRequest(input: unknown) {
  const authError = await checkRole(OVERTIME_SUBMITTER_ROLES);
  if (authError) return authError;

  const parsed = overtimeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input overtime tidak valid." };
  }

  const roleRow = await getCurrentUserRoleRow();
  const user = await getUser();
  const actorUserId = user?.id ?? roleRow.userId;
  if (!roleRow.employeeId) {
    return { error: "Akun Anda belum terhubung ke data karyawan." };
  }

  const overtimeType = parsed.data.overtimeType as OvertimeType;
  const cfg = OVERTIME_TYPE_CONFIG[overtimeType];
  const periodCode = resolvePeriodCodeFromDate(parsed.data.requestDate);
  const period = resolvePayrollPeriod(periodCode);
  const totalAmount = cfg.baseAmount + cfg.mealAmount;

  if (overtimeType === "PATCH_ABSENCE_3H") {
    const [approvedAbsence] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceTickets)
      .where(
        and(
          eq(attendanceTickets.employeeId, roleRow.employeeId),
          inArray(attendanceTickets.ticketType, ["IZIN", "SAKIT", "CUTI"]),
          inArray(attendanceTickets.status, ["APPROVED_SPV", "APPROVED_HRD", "AUTO_APPROVED", "LOCKED"]),
          lte(attendanceTickets.startDate, period.periodEndDate),
          gte(attendanceTickets.endDate, period.periodStartDate),
        )
      );

    if ((approvedAbsence?.count ?? 0) === 0) {
      return { error: "Penambalan hanya bisa diajukan jika ada tiket IZIN/SAKIT/CUTI approved pada periode yang sama." };
    }

    const [existingPatchCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(overtimeRequests)
      .where(
        and(
          eq(overtimeRequests.employeeId, roleRow.employeeId),
          eq(overtimeRequests.periodCode, periodCode),
          eq(overtimeRequests.overtimeType, "PATCH_ABSENCE_3H"),
          or(eq(overtimeRequests.status, "PENDING"), eq(overtimeRequests.status, "APPROVED"))
        )
      );

    if ((existingPatchCount?.count ?? 0) >= 3) {
      return { error: "Penambalan overtime 3 jam maksimal 3x per periode kerja." };
    }
  }

  await db.insert(overtimeRequests).values({
    employeeId: roleRow.employeeId,
    requestDate: parsed.data.requestDate,
    overtimeType,
    overtimeHours: cfg.overtimeHours,
    breakHours: cfg.breakHours,
    baseAmount: cfg.baseAmount.toFixed(2),
    mealAmount: cfg.mealAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    periodCode,
    periodStartDate: period.periodStartDate,
    periodEndDate: period.periodEndDate,
    reason: parsed.data.reason,
    status: "PENDING",
    requestedByUserId: actorUserId,
  });

  revalidatePath("/overtime");
  return { success: true };
}

export async function decideOvertimeRequest(input: unknown) {
  const authError = await checkRole(OVERTIME_APPROVER_ROLES);
  if (authError) return authError;

  const parsed = overtimeDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Keputusan overtime tidak valid." };
  }

  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const user = await getUser();
  const actorUserId = user?.id ?? roleRow.userId;

  const [existing] = await db
    .select({
      id: overtimeRequests.id,
      employeeId: overtimeRequests.employeeId,
      status: overtimeRequests.status,
      employeeDivisionId: employees.divisionId,
    })
    .from(overtimeRequests)
    .leftJoin(employees, eq(overtimeRequests.employeeId, employees.id))
    .where(eq(overtimeRequests.id, parsed.data.requestId))
    .limit(1);

  if (!existing) return { error: "Pengajuan overtime tidak ditemukan." };
  if (existing.status !== "PENDING") return { error: "Pengajuan overtime sudah diproses." };

  if (DIV_SCOPED_ROLES.includes(role)) {
    if (!existing.employeeDivisionId || !roleRow.divisionIds.includes(existing.employeeDivisionId)) {
      return { error: "Akses ditolak untuk karyawan di luar scope divisi Anda." };
    }
  }

  if (parsed.data.action === "APPROVE") {
    await db
      .update(overtimeRequests)
      .set({
        status: "APPROVED",
        reviewNotes: parsed.data.reviewNotes?.trim() || null,
        approvedByUserId: actorUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, parsed.data.requestId));
  } else {
    if (!parsed.data.reviewNotes?.trim()) {
      return { error: "Alasan penolakan wajib diisi." };
    }
    await db
      .update(overtimeRequests)
      .set({
        status: "REJECTED",
        reviewNotes: parsed.data.reviewNotes.trim(),
        rejectedByUserId: actorUserId,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, parsed.data.requestId));
  }

  revalidatePath("/overtime");
  return { success: true };
}
