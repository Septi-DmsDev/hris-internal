"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { attendanceTickets, leaveQuotas } from "@/lib/db/schema/hr";
import { checkRole, getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { createTicketSchema, ticketDecisionSchema } from "@/lib/validations/hr";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";
import { divisions } from "@/lib/db/schema/master";

const APPROVER_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV"];
// Semua role adalah karyawan yang bisa ajukan tiket untuk diri sendiri
const SELF_SERVICE_TICKET_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL", "FINANCE", "PAYROLL_VIEWER"];
const TICKET_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL", "FINANCE", "PAYROLL_VIEWER"];

function diffDays(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

async function getEmployeeLeaveQuota(employeeId: string, year: number) {
  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.year, year)))
    .limit(1);
  return quota ?? null;
}

async function hasLeaveEligibility(employeeId: string) {
  const [emp] = await db
    .select({ startDate: employees.startDate })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp?.startDate) return false;
  const months = Math.floor(
    (Date.now() - new Date(emp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  return months >= 12;
}

async function getEmployeeDivisionId(employeeId: string) {
  const [employeeRow] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return employeeRow?.divisionId ?? null;
}

export async function getTickets() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const user = await getUser();

  if (!TICKET_READ_ROLES.includes(role)) {
    return { role, tickets: [] };
  }

  const employeeDivision = divisions;

  const baseQuery = db
    .select({
      id: attendanceTickets.id,
      employeeId: attendanceTickets.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: employeeDivision.name,
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      endDate: attendanceTickets.endDate,
      daysCount: attendanceTickets.daysCount,
      reason: attendanceTickets.reason,
      status: attendanceTickets.status,
      payrollImpact: attendanceTickets.payrollImpact,
      reviewNotes: attendanceTickets.reviewNotes,
      rejectionReason: attendanceTickets.rejectionReason,
      createdAt: attendanceTickets.createdAt,
    })
    .from(attendanceTickets)
    .leftJoin(employees, eq(attendanceTickets.employeeId, employees.id))
    .leftJoin(employeeDivision, eq(employees.divisionId, employeeDivision.id));

  const rows =
    role === "SPV" && roleRow.divisionId
      ? await baseQuery
          .where(eq(employees.divisionId, roleRow.divisionId))
          .orderBy(desc(attendanceTickets.createdAt))
      : SELF_SERVICE_TICKET_ROLES.includes(role) && user
        ? await baseQuery
            .where(eq(attendanceTickets.createdByUserId, user.id))
            .orderBy(desc(attendanceTickets.createdAt))
        : await baseQuery.orderBy(desc(attendanceTickets.createdAt));

  return { role, tickets: rows };
}

export async function createTicket(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL", "FINANCE", "PAYROLL_VIEWER"]);
  if (authError) return authError;

  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tiket tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  // Self-service: TEAMWORK/MANAGERIAL wajib punya employeeId di userRoles
  if (SELF_SERVICE_TICKET_ROLES.includes(role)) {
    if (!roleRow.employeeId) {
      return { error: "Akun Anda belum terhubung ke data karyawan. Hubungi HRD." };
    }
    // Override employeeId dengan data diri sendiri — tidak boleh buat tiket atas nama orang lain
    parsed.data.employeeId = roleRow.employeeId;
  }

  if (role === "SPV") {
    if (!roleRow.divisionId) {
      return { error: "SPV belum terhubung ke divisi." };
    }

    const employeeDivisionId = await getEmployeeDivisionId(parsed.data.employeeId);
    if (!employeeDivisionId || employeeDivisionId !== roleRow.divisionId) {
      return { error: "SPV hanya boleh membuat tiket untuk karyawan di divisinya." };
    }
  }

  const { startDate, endDate } = parsed.data;
  const daysCount = diffDays(startDate, endDate);

  try {
    await db.insert(attendanceTickets).values({
      employeeId: parsed.data.employeeId,
      ticketType: parsed.data.ticketType,
      startDate,
      endDate,
      daysCount,
      reason: parsed.data.reason,
      attachmentUrl: parsed.data.attachmentUrl || null,
      status: "SUBMITTED",
      createdByUserId: user?.id ?? parsed.data.employeeId,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Karyawan tidak ditemukan." };
    throw e;
  }

  revalidatePath("/tickets");
  return { success: true };
}

export async function approveTicket(input: unknown) {
  const authError = await checkRole(APPROVER_ROLES);
  if (authError) return authError;

  const parsed = ticketDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const [ticket] = await db
    .select({
      id: attendanceTickets.id,
      employeeId: attendanceTickets.employeeId,
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      status: attendanceTickets.status,
    })
    .from(attendanceTickets)
    .where(eq(attendanceTickets.id, parsed.data.ticketId))
    .limit(1);

  if (!ticket) return { error: "Tiket tidak ditemukan." };
  if (!["SUBMITTED", "NEED_REVIEW"].includes(ticket.status)) {
    return { error: "Tiket tidak dalam status yang dapat disetujui." };
  }
  if (role === "SPV") {
    if (!roleRow.divisionId) {
      return { error: "SPV belum terhubung ke divisi." };
    }

    const employeeDivisionId = await getEmployeeDivisionId(ticket.employeeId);
    if (!employeeDivisionId || employeeDivisionId !== roleRow.divisionId) {
      return { error: "SPV hanya boleh menyetujui tiket di divisinya." };
    }
  }

  const approvedStatus = role === "SPV" ? "APPROVED_SPV" : "APPROVED_HRD";

  await db.transaction(async (tx) => {
    let payrollImpact = parsed.data.payrollImpact ?? "UNPAID";

    if (!parsed.data.payrollImpact && ticket.ticketType !== "SETENGAH_HARI") {
      const year = new Date(ticket.startDate).getFullYear();
      const eligible = await hasLeaveEligibility(ticket.employeeId);

      if (eligible) {
        const quota = await getEmployeeLeaveQuota(ticket.employeeId, year);
        if (quota) {
          const [monthlyUpdated] = await tx
            .update(leaveQuotas)
            .set({
              monthlyQuotaUsed: sql`${leaveQuotas.monthlyQuotaUsed} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(leaveQuotas.id, quota.id),
                sql`${leaveQuotas.monthlyQuotaUsed} < ${leaveQuotas.monthlyQuotaTotal}`
              )
            )
            .returning({ id: leaveQuotas.id });

          if (monthlyUpdated) {
            payrollImpact = "PAID_QUOTA_MONTHLY";
          } else {
            const [annualUpdated] = await tx
              .update(leaveQuotas)
              .set({
                annualQuotaUsed: sql`${leaveQuotas.annualQuotaUsed} + 1`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(leaveQuotas.id, quota.id),
                  sql`${leaveQuotas.annualQuotaUsed} < ${leaveQuotas.annualQuotaTotal}`
                )
              )
              .returning({ id: leaveQuotas.id });

            if (annualUpdated) {
              payrollImpact = "PAID_QUOTA_ANNUAL";
            }
          }
        }
      }
    }

    await tx
      .update(attendanceTickets)
      .set({
        status: approvedStatus,
        payrollImpact,
        reviewNotes: parsed.data.notes,
        approvedByUserId: user?.id ?? null,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(attendanceTickets.id, parsed.data.ticketId));
  });

  revalidatePath("/tickets");
  return { success: true };
}

export async function rejectTicket(input: unknown) {
  const authError = await checkRole(APPROVER_ROLES);
  if (authError) return authError;

  const parsed = ticketDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  if (!parsed.data.rejectionReason?.trim()) {
    return { error: "Alasan penolakan wajib diisi." };
  }

  const user = await getUser();

  const [ticket] = await db
    .select({
      id: attendanceTickets.id,
      employeeId: attendanceTickets.employeeId,
      status: attendanceTickets.status,
    })
    .from(attendanceTickets)
    .where(eq(attendanceTickets.id, parsed.data.ticketId))
    .limit(1);

  if (!ticket) return { error: "Tiket tidak ditemukan." };
  if (!["SUBMITTED", "NEED_REVIEW"].includes(ticket.status)) {
    return { error: "Tiket tidak dalam status yang dapat ditolak." };
  }
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  if (role === "SPV") {
    if (!roleRow.divisionId) {
      return { error: "SPV belum terhubung ke divisi." };
    }

    const employeeDivisionId = await getEmployeeDivisionId(ticket.employeeId);
    if (!employeeDivisionId || employeeDivisionId !== roleRow.divisionId) {
      return { error: "SPV hanya boleh menolak tiket di divisinya." };
    }
  }

  await db
    .update(attendanceTickets)
    .set({
      status: "REJECTED",
      rejectionReason: parsed.data.rejectionReason,
      rejectedByUserId: user?.id ?? null,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendanceTickets.id, parsed.data.ticketId));

  revalidatePath("/tickets");
  return { success: true };
}

export async function cancelTicket(ticketId: string) {
  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const [ticket] = await db
    .select()
    .from(attendanceTickets)
    .where(eq(attendanceTickets.id, ticketId))
    .limit(1);

  if (!ticket) return { error: "Tiket tidak ditemukan." };
  if (!["DRAFT", "SUBMITTED"].includes(ticket.status)) {
    return { error: "Tiket yang sudah diproses tidak bisa dibatalkan." };
  }
  if (ticket.createdByUserId !== user.id && !["SUPER_ADMIN", "HRD"].includes(role)) {
    return { error: "Hanya pembuat tiket atau HRD/Super Admin yang dapat membatalkan tiket ini." };
  }

  await db
    .update(attendanceTickets)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(attendanceTickets.id, ticketId));

  revalidatePath("/tickets");
  return { success: true };
}

export async function generateLeaveQuota(employeeId: string, year: number) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return authError;

  const eligible = await hasLeaveEligibility(employeeId);
  if (!eligible) return { error: "Karyawan belum memenuhi syarat kuota cuti (minimal 1 tahun kerja)." };

  const existing = await getEmployeeLeaveQuota(employeeId, year);
  if (existing) return { error: `Kuota cuti tahun ${year} sudah ada untuk karyawan ini.` };

  await db.insert(leaveQuotas).values({
    employeeId,
    year,
    monthlyQuotaTotal: 12,
    monthlyQuotaUsed: 0,
    annualQuotaTotal: 3,
    annualQuotaUsed: 0,
  });

  revalidatePath("/tickets");
  return { success: true };
}
