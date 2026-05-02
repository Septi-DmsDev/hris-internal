"use server";

import { db } from "@/lib/db";
import { getCurrentUserRoleRow, requireAuth } from "@/lib/auth/session";
import {
  employees,
  employeeScheduleAssignments,
  workSchedules,
  workScheduleDays,
} from "@/lib/db/schema/employee";
import { attendanceTickets } from "@/lib/db/schema/hr";
import { divisions } from "@/lib/db/schema/master";
import { and, asc, desc, eq, inArray, isNull, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScheduleCalendarDay = {
  date: string;
  dayOfWeek: number;
  dayStatus: string;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
  targetPoints: number;
  ticketOverride: string | null;
};

export type MyScheduleResult = {
  employeeId: string;
  employeeName: string;
  scheduleName: string;
  scheduleCode: string;
  month: number;
  year: number;
  days: ScheduleCalendarDay[];
};

export type TeamMember = {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  scheduleName: string | null;
  scheduleCode: string | null;
  scheduleId: string | null;
  effectiveStartDate: string | null;
};

export type ScheduleOption = {
  id: string;
  name: string;
  code: string;
};

// ─── getMySchedule ────────────────────────────────────────────────────────────

export async function getMySchedule(
  year?: number,
  month?: number
): Promise<MyScheduleResult | null> {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();

  if (!roleRow.employeeId) return null;

  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  // Get employee name
  const empRows = await db
    .select({ fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.id, roleRow.employeeId))
    .limit(1);

  if (!empRows[0]) return null;
  const employeeName = empRows[0].fullName;

  // Get latest active schedule assignment
  const assignmentRows = await db
    .select({
      scheduleId: employeeScheduleAssignments.scheduleId,
      scheduleName: workSchedules.name,
      scheduleCode: workSchedules.code,
    })
    .from(employeeScheduleAssignments)
    .leftJoin(workSchedules, eq(employeeScheduleAssignments.scheduleId, workSchedules.id))
    .where(
      and(
        eq(employeeScheduleAssignments.employeeId, roleRow.employeeId),
        isNull(employeeScheduleAssignments.effectiveEndDate)
      )
    )
    .orderBy(desc(employeeScheduleAssignments.effectiveStartDate))
    .limit(1);

  if (!assignmentRows[0] || !assignmentRows[0].scheduleName || !assignmentRows[0].scheduleCode) {
    return null;
  }

  const { scheduleId, scheduleName, scheduleCode } = assignmentRows[0];

  // Get all 7 schedule days for this schedule
  const scheduleDays = await db
    .select({
      dayOfWeek: workScheduleDays.dayOfWeek,
      dayStatus: workScheduleDays.dayStatus,
      isWorkingDay: workScheduleDays.isWorkingDay,
      startTime: workScheduleDays.startTime,
      endTime: workScheduleDays.endTime,
      targetPoints: workScheduleDays.targetPoints,
    })
    .from(workScheduleDays)
    .where(eq(workScheduleDays.scheduleId, scheduleId))
    .orderBy(asc(workScheduleDays.dayOfWeek));

  // Build a map: dayOfWeek -> schedule day config
  const dayConfigMap = new Map<number, (typeof scheduleDays)[0]>();
  for (const sd of scheduleDays) {
    dayConfigMap.set(sd.dayOfWeek, sd);
  }

  // Get approved tickets for this month
  const monthStart = new Date(targetYear, targetMonth - 1, 1);
  const monthEnd = new Date(targetYear, targetMonth, 0); // last day of month

  const approvedStatuses = ["AUTO_APPROVED", "APPROVED_SPV", "APPROVED_HRD"] as const;

  const tickets = await db
    .select({
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      endDate: attendanceTickets.endDate,
    })
    .from(attendanceTickets)
    .where(
      and(
        eq(attendanceTickets.employeeId, roleRow.employeeId),
        inArray(attendanceTickets.status, approvedStatuses),
        lte(attendanceTickets.startDate, monthEnd),
        gte(attendanceTickets.endDate, monthStart)
      )
    );

  // Build ticket override map: "yyyy-MM-dd" -> ticketType
  const ticketMap = new Map<string, string>();
  for (const ticket of tickets) {
    const start = ticket.startDate instanceof Date ? ticket.startDate : new Date(ticket.startDate);
    const end = ticket.endDate instanceof Date ? ticket.endDate : new Date(ticket.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      ticketMap.set(key, ticket.ticketType);
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Build calendar days array
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const days: ScheduleCalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(targetYear, targetMonth - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateStr = dateObj.toISOString().slice(0, 10);

    const config = dayConfigMap.get(dayOfWeek);
    const ticketOverride = ticketMap.get(dateStr) ?? null;

    days.push({
      date: dateStr,
      dayOfWeek,
      dayStatus: config?.dayStatus ?? "KERJA",
      isWorkingDay: config?.isWorkingDay ?? true,
      startTime: config?.startTime ?? null,
      endTime: config?.endTime ?? null,
      targetPoints: config?.targetPoints ?? 0,
      ticketOverride,
    });
  }

  return {
    employeeId: roleRow.employeeId,
    employeeName,
    scheduleName,
    scheduleCode,
    month: targetMonth,
    year: targetYear,
    days,
  };
}

// ─── getTeamSchedules ─────────────────────────────────────────────────────────

const TEAM_SCHEDULE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];

export async function getTeamSchedules(): Promise<TeamMember[]> {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!TEAM_SCHEDULE_ROLES.includes(role)) {
    return [];
  }

  const useDivisionScope =
    (role === "SPV" || role === "KABAG") && roleRow.divisionIds.length > 0;

  const baseConditions = [eq(employees.isActive, true)];

  const query = db
    .select({
      employeeId: employees.id,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      scheduleName: workSchedules.name,
      scheduleCode: workSchedules.code,
      scheduleId: employeeScheduleAssignments.scheduleId,
      effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
    })
    .from(employees)
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(
      employeeScheduleAssignments,
      and(
        eq(employeeScheduleAssignments.employeeId, employees.id),
        isNull(employeeScheduleAssignments.effectiveEndDate)
      )
    )
    .leftJoin(workSchedules, eq(employeeScheduleAssignments.scheduleId, workSchedules.id))
    .where(
      useDivisionScope
        ? and(...baseConditions, inArray(employees.divisionId, roleRow.divisionIds))
        : and(...baseConditions)
    )
    .orderBy(asc(employees.fullName));

  const rows = await query;

  return rows.map((r) => ({
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    employeeCode: r.employeeCode,
    divisionName: r.divisionName ?? "—",
    scheduleName: r.scheduleName ?? null,
    scheduleCode: r.scheduleCode ?? null,
    scheduleId: r.scheduleId ?? null,
    effectiveStartDate: r.effectiveStartDate
      ? String(r.effectiveStartDate).slice(0, 10)
      : null,
  }));
}

// ─── getScheduleOptions ───────────────────────────────────────────────────────

export async function getScheduleOptions(): Promise<ScheduleOption[]> {
  await requireAuth();

  const rows = await db
    .select({
      id: workSchedules.id,
      name: workSchedules.name,
      code: workSchedules.code,
    })
    .from(workSchedules)
    .where(eq(workSchedules.isActive, true))
    .orderBy(asc(workSchedules.name));

  return rows;
}

// ─── assignEmployeeSchedule ───────────────────────────────────────────────────

const assignSchema = z.object({
  employeeId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus yyyy-MM-dd"),
  notes: z.string().optional(),
});

const ASSIGN_ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV", "KABAG"];

export async function assignEmployeeSchedule(
  input: unknown
): Promise<{ success: true } | { error: string }> {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!ASSIGN_ALLOWED_ROLES.includes(role)) {
    return { error: "Akses ditolak. Hanya HRD, SPV, KABAG, atau Super Admin yang dapat mengatur jadwal." };
  }

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return { error: issues[0]?.message ?? "Input tidak valid." };
  }

  const { employeeId, scheduleId, effectiveDate, notes } = parsed.data;

  const effectiveDateObj = new Date(effectiveDate);

  try {
    // Close any existing active assignment (effectiveEndDate IS NULL)
    await db
      .update(employeeScheduleAssignments)
      .set({ effectiveEndDate: effectiveDateObj })
      .where(
        and(
          eq(employeeScheduleAssignments.employeeId, employeeId),
          isNull(employeeScheduleAssignments.effectiveEndDate)
        )
      );

    // Insert new assignment
    await db.insert(employeeScheduleAssignments).values({
      employeeId,
      scheduleId,
      effectiveStartDate: effectiveDateObj,
      effectiveEndDate: null,
      notes: notes ?? null,
    });

    revalidatePath("/schedule");
    revalidatePath("/scheduler");

    return { success: true };
  } catch (err) {
    console.error("[assignEmployeeSchedule] error:", err);
    return { error: "Gagal menyimpan penugasan jadwal. Coba lagi." };
  }
}
