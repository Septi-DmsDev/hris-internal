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
import { dailyActivityEntries } from "@/lib/db/schema/point";
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

export type TicketHistoryItem = {
  ticketType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: string;
  reason: string;
};

export type MyScheduleResult = {
  employeeId: string;
  employeeName: string;
  scheduleName: string;
  scheduleCode: string;
  month: number;
  year: number;
  days: ScheduleCalendarDay[];
  periodTotalTargetPoints: number;
  periodApprovedPoints: number;
  dailyTargetNeeded: number | null;
  remainingWorkingDays: number;
  ticketHistory: TicketHistoryItem[];
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

  // Periode kerja: tgl 26 bulan sebelumnya s/d tgl 25 bulan ini
  const periodStart = new Date(targetYear, targetMonth - 2, 26); // mis. 26 Apr
  const periodEnd = new Date(targetYear, targetMonth - 1, 25);   // mis. 25 Mei

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
        lte(attendanceTickets.startDate, periodEnd),
        gte(attendanceTickets.endDate, periodStart)
      )
    );

  // Gunakan komponen lokal (bukan toISOString) agar tidak terjadi offset UTC+7
  function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Build ticket override map: "yyyy-MM-dd" -> ticketType
  const ticketMap = new Map<string, string>();
  for (const ticket of tickets) {
    const rawStart = ticket.startDate instanceof Date ? ticket.startDate : new Date(ticket.startDate);
    const rawEnd = ticket.endDate instanceof Date ? ticket.endDate : new Date(ticket.endDate);
    // Normalisasi ke lokal midnight agar iterasi hari akurat
    const cur = new Date(rawStart.getFullYear(), rawStart.getMonth(), rawStart.getDate());
    const endNorm = new Date(rawEnd.getFullYear(), rawEnd.getMonth(), rawEnd.getDate());
    while (cur <= endNorm) {
      ticketMap.set(localDateStr(cur), ticket.ticketType);
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Build calendar days untuk rentang periode kerja
  const days: ScheduleCalendarDay[] = [];
  const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
  const endCursor = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());

  while (cursor <= endCursor) {
    const dateStr = localDateStr(cursor);
    const dayOfWeek = cursor.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
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
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Sidebar metrics ───────────────────────────────────────────────────────────

  // Total target poin periode (jumlah targetPoints hari kerja dalam periode)
  const periodTotalTargetPoints = days
    .filter((d) => d.isWorkingDay)
    .reduce((sum, d) => sum + d.targetPoints, 0);

  // Sisa hari kerja dari hari ini (inklusif) sampai akhir periode
  const nowNow = new Date();
  const todayLocal = new Date(nowNow.getFullYear(), nowNow.getMonth(), nowNow.getDate());
  let remainingWorkingDays = 0;
  const remCursor = new Date(todayLocal);
  while (remCursor <= endCursor) {
    if (remCursor.getDay() !== 0) remainingWorkingDays++;
    remCursor.setDate(remCursor.getDate() + 1);
  }

  // Poin yang sudah disetujui SPV/HRD dalam periode
  const APPROVED_PERF = ["DISETUJUI_SPV", "OVERRIDE_HRD", "DIKUNCI_PAYROLL"] as const;
  const approvedEntries = await db
    .select({ totalPoints: dailyActivityEntries.totalPoints })
    .from(dailyActivityEntries)
    .where(
      and(
        eq(dailyActivityEntries.employeeId, roleRow.employeeId),
        gte(dailyActivityEntries.workDate, periodStart),
        lte(dailyActivityEntries.workDate, periodEnd),
        inArray(dailyActivityEntries.status, APPROVED_PERF)
      )
    );
  const periodApprovedPoints = approvedEntries.reduce((sum, e) => sum + Number(e.totalPoints), 0);

  // Target poin harian yang dibutuhkan = (total target - approved) / sisa hari kerja
  const dailyTargetNeeded =
    remainingWorkingDays > 0
      ? Math.max(0, periodTotalTargetPoints - periodApprovedPoints) / remainingWorkingDays
      : null;

  // Riwayat perizinan (3 bulan ke belakang, semua status)
  const historyWindowStart = new Date(nowNow.getFullYear(), nowNow.getMonth() - 2, 1);
  const ticketHistoryRows = await db
    .select({
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      endDate: attendanceTickets.endDate,
      daysCount: attendanceTickets.daysCount,
      status: attendanceTickets.status,
      reason: attendanceTickets.reason,
    })
    .from(attendanceTickets)
    .where(
      and(
        eq(attendanceTickets.employeeId, roleRow.employeeId),
        gte(attendanceTickets.startDate, historyWindowStart)
      )
    )
    .orderBy(desc(attendanceTickets.startDate))
    .limit(15);

  const ticketHistory: TicketHistoryItem[] = ticketHistoryRows.map((t) => {
    const s = t.startDate instanceof Date ? t.startDate : new Date(t.startDate);
    const e = t.endDate instanceof Date ? t.endDate : new Date(t.endDate);
    return {
      ticketType: t.ticketType,
      startDate: localDateStr(new Date(s.getFullYear(), s.getMonth(), s.getDate())),
      endDate: localDateStr(new Date(e.getFullYear(), e.getMonth(), e.getDate())),
      daysCount: t.daysCount,
      status: t.status,
      reason: t.reason,
    };
  });

  return {
    employeeId: roleRow.employeeId,
    employeeName,
    scheduleName,
    scheduleCode,
    month: targetMonth,
    year: targetYear,
    days,
    periodTotalTargetPoints,
    periodApprovedPoints,
    dailyTargetNeeded,
    remainingWorkingDays,
    ticketHistory,
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
