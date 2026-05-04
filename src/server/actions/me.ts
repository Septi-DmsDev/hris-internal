"use server";

import { db } from "@/lib/db";
import { getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import {
  employeeDivisionHistories,
  employeeGradeHistories,
  employees,
  employeePositionHistories,
  employeeScheduleAssignments,
  employeeStatusHistories,
  employeeSupervisorHistories,
  workSchedules,
} from "@/lib/db/schema/employee";
import { attendanceTickets, employeeReviews, incidentLogs } from "@/lib/db/schema/hr";
import { branches, divisions, grades, positions } from "@/lib/db/schema/master";
import { payrollPeriods, payrollResults } from "@/lib/db/schema/payroll";
import { dailyActivityEntries } from "@/lib/db/schema/point";
import { aliasedTable, and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { resolvePointTargetForDivision } from "@/config/constants";
import type { UserRole } from "@/types";
import {
  buildPersonalQuickActions,
  buildTeamworkActivitySummary,
  type PersonalQuickAction,
  resolveMyAccessState,
  type TeamworkActivitySummary,
} from "./me.helpers";

type MyEmployeeCore = {
  id: string;
  employeeCode: string;
  fullName: string;
  nickname: string | null;
  photoUrl: string | null;
  phoneNumber: string | null;
  address: string | null;
  startDate: Date;
  trainingGraduationDate: Date | null;
  branchName: string | null;
  divisionName: string | null;
  positionName: string | null;
  gradeName: string | null;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus: string;
  payrollStatus: string;
  supervisorName: string | null;
  isActive: boolean;
  notes: string | null;
};

type MyScheduleSummary = {
  scheduleName: string | null;
  scheduleCode: string | null;
  effectiveStartDate: Date | null;
  effectiveEndDate: Date | null;
} | null;

type MyTicketSummary = {
  ticketType: string;
  status: string;
  startDate: Date;
  endDate: Date;
  payrollImpact: string | null;
} | null;

type MyReviewSummary = {
  totalScore: string | null;
  category: string | null;
  status: string;
  periodStartDate: Date;
  periodEndDate: Date;
} | null;

type MyIncidentSummary = {
  activeCount: number;
  latestIncidentType: string | null;
  latestIncidentDate: Date | null;
};

type MyPerformanceSummary = {
  periodStartDate: Date;
  periodEndDate: Date;
  performancePercent: string;
  totalApprovedPoints: string;
  totalTargetPoints: number;
  status: string;
} | null;

type MyPayrollSummary = {
  periodId: string;
  periodCode: string;
  periodStatus: string;
  takeHomePay: string;
  performancePercent: string;
  calculatedAt: Date;
} | null;

type MyHistoryRow = {
  effectiveDate: Date;
  previousLabel: string | null;
  nextLabel: string | null;
  notes: string | null;
};

type MyStatusHistoryRow = {
  effectiveDate: Date;
  previousEmploymentStatus: string | null;
  newEmploymentStatus: string;
  previousPayrollStatus: string | null;
  newPayrollStatus: string;
  notes: string | null;
};

export type MyDashboardResult = {
  redirectTo: string | null;
  role: UserRole;
  userEmail: string;
  employee: MyEmployeeCore | null;
  quickActions: PersonalQuickAction[];
  activeSchedule: MyScheduleSummary;
  latestTicket: MyTicketSummary;
  latestReview: MyReviewSummary;
  incidentSummary: MyIncidentSummary;
  latestPerformance: MyPerformanceSummary;
  teamworkActivitySummary: TeamworkActivitySummary | null;
  latestPayroll: MyPayrollSummary;
  emptyReason: string | null;
};

export type MyProfileResult = {
  redirectTo: string | null;
  role: UserRole;
  userEmail: string;
  employee: MyEmployeeCore | null;
  activeSchedule: MyScheduleSummary;
  histories: {
    divisions: MyHistoryRow[];
    positions: MyHistoryRow[];
    grades: MyHistoryRow[];
    supervisors: MyHistoryRow[];
    statuses: MyStatusHistoryRow[];
  };
  emptyReason: string | null;
};

const PAYROLL_SUMMARY_ROLES: UserRole[] = [
  "HRD",
  "FINANCE",
  "MANAGERIAL",
  "PAYROLL_VIEWER",
  "SPV",
  "KABAG",
  "TEAMWORK",
];

async function getMyEmployeeCore(employeeId: string): Promise<MyEmployeeCore | null> {
  const supervisor = aliasedTable(employees, "supervisor");

  const rows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      nickname: employees.nickname,
      photoUrl: employees.photoUrl,
      phoneNumber: employees.phoneNumber,
      address: employees.address,
      startDate: employees.startDate,
      trainingGraduationDate: employees.trainingGraduationDate,
      branchName: branches.name,
      divisionName: divisions.name,
      positionName: positions.name,
      gradeName: grades.name,
      employeeGroup: employees.employeeGroup,
      employmentStatus: employees.employmentStatus,
      payrollStatus: employees.payrollStatus,
      supervisorName: supervisor.fullName,
      isActive: employees.isActive,
      notes: employees.notes,
    })
    .from(employees)
    .leftJoin(branches, eq(employees.branchId, branches.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(grades, eq(employees.gradeId, grades.id))
    .leftJoin(supervisor, eq(employees.supervisorEmployeeId, supervisor.id))
    .where(eq(employees.id, employeeId))
    .limit(1);

  return rows[0] ?? null;
}

async function getActiveSchedule(employeeId: string): Promise<MyScheduleSummary> {
  const rows = await db
    .select({
      scheduleName: workSchedules.name,
      scheduleCode: workSchedules.code,
      effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
      effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
    })
    .from(employeeScheduleAssignments)
    .leftJoin(workSchedules, eq(employeeScheduleAssignments.scheduleId, workSchedules.id))
    .where(eq(employeeScheduleAssignments.employeeId, employeeId))
    .orderBy(desc(employeeScheduleAssignments.effectiveStartDate))
    .limit(1);

  return rows[0] ?? null;
}

async function getLatestTicket(employeeId: string): Promise<MyTicketSummary> {
  const rows = await db
    .select({
      ticketType: attendanceTickets.ticketType,
      status: attendanceTickets.status,
      startDate: attendanceTickets.startDate,
      endDate: attendanceTickets.endDate,
      payrollImpact: attendanceTickets.payrollImpact,
    })
    .from(attendanceTickets)
    .where(eq(attendanceTickets.employeeId, employeeId))
    .orderBy(desc(attendanceTickets.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

async function getLatestReview(employeeId: string): Promise<MyReviewSummary> {
  const rows = await db
    .select({
      totalScore: employeeReviews.totalScore,
      category: employeeReviews.category,
      status: employeeReviews.status,
      periodStartDate: employeeReviews.periodStartDate,
      periodEndDate: employeeReviews.periodEndDate,
    })
    .from(employeeReviews)
    .where(eq(employeeReviews.employeeId, employeeId))
    .orderBy(desc(employeeReviews.periodEndDate), desc(employeeReviews.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

async function getIncidentSummary(employeeId: string): Promise<MyIncidentSummary> {
  const rows = await db
    .select({
      incidentType: incidentLogs.incidentType,
      incidentDate: incidentLogs.incidentDate,
    })
    .from(incidentLogs)
    .where(and(eq(incidentLogs.employeeId, employeeId), eq(incidentLogs.isActive, true)))
    .orderBy(desc(incidentLogs.incidentDate));

  return {
    activeCount: rows.length,
    latestIncidentType: rows[0]?.incidentType ?? null,
    latestIncidentDate: rows[0]?.incidentDate ?? null,
  };
}

export async function getLatestPerformance(employeeId: string): Promise<MyPerformanceSummary> {
  // Periode berjalan: tgl 26 bulan lalu s/d tgl 25 bulan ini (atau 26 bulan ini s/d 25 bulan depan)
  const today = new Date();
  const day = today.getDate();
  const periodStart = day >= 26
    ? new Date(today.getFullYear(), today.getMonth(), 26)
    : new Date(today.getFullYear(), today.getMonth() - 1, 26);
  const periodEnd = day >= 26
    ? new Date(today.getFullYear(), today.getMonth() + 1, 25)
    : new Date(today.getFullYear(), today.getMonth(), 25);

  const SUBMITTED_STATUSES = ["DIAJUKAN", "DIAJUKAN_ULANG", "DISETUJUI_SPV", "OVERRIDE_HRD", "DIKUNCI_PAYROLL"] as const;
  const APPROVED_STATUSES = ["DISETUJUI_SPV", "OVERRIDE_HRD", "DIKUNCI_PAYROLL"];

  const [entries, empRows, leaveRows] = await Promise.all([
    db
      .select({
        workDate: dailyActivityEntries.workDate,
        totalPoints: dailyActivityEntries.totalPoints,
        status: dailyActivityEntries.status,
      })
      .from(dailyActivityEntries)
      .where(
        and(
          eq(dailyActivityEntries.employeeId, employeeId),
          gte(dailyActivityEntries.workDate, periodStart),
          lte(dailyActivityEntries.workDate, periodEnd),
          inArray(dailyActivityEntries.status, [...SUBMITTED_STATUSES])
        )
      ),
    db
      .select({ divisionName: divisions.name })
      .from(employees)
      .leftJoin(divisions, eq(employees.divisionId, divisions.id))
      .where(eq(employees.id, employeeId))
      .limit(1),
    db
      .select({ daysCount: attendanceTickets.daysCount })
      .from(attendanceTickets)
      .where(
        and(
          eq(attendanceTickets.employeeId, employeeId),
          lte(attendanceTickets.startDate, periodEnd),
          gte(attendanceTickets.endDate, periodStart),
          inArray(attendanceTickets.status, ["APPROVED_SPV", "APPROVED_HRD", "AUTO_APPROVED", "LOCKED"])
        )
      ),
  ]);

  if (entries.length === 0) return null;

  const targetDailyPoints = resolvePointTargetForDivision(empRows[0]?.divisionName);

  // Group submitted entries by workDate (gunakan local time, konsisten dengan countTargetDaysForPeriod)
  const dailyPointsMap = new Map<string, number>();
  let totalApprovedPoints = 0;
  for (const entry of entries) {
    const d = entry.workDate;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dailyPointsMap.set(key, (dailyPointsMap.get(key) ?? 0) + Number(entry.totalPoints));
    if (APPROVED_STATUSES.includes(entry.status)) {
      totalApprovedPoints += Number(entry.totalPoints);
    }
  }

  // Performa = rata-rata persentase harian dari hari yang sudah submit
  const dailyPercents = Array.from(dailyPointsMap.values()).map(
    (pts) => (targetDailyPoints > 0 ? (pts / targetDailyPoints) * 100 : 0)
  );
  const performancePercent =
    dailyPercents.length > 0
      ? (dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length).toFixed(2)
      : "0.00";

  // Target days efektif = hari kerja Senin–Sabtu dalam periode dikurangi hari izin yang disetujui
  let workingDays = 0;
  const cursor = new Date(periodStart);
  while (cursor <= periodEnd) {
    if (cursor.getDay() !== 0) workingDays++; // 0 = Minggu
    cursor.setDate(cursor.getDate() + 1);
  }
  const leaveDays = leaveRows.reduce((sum, r) => sum + r.daysCount, 0);
  const effectiveTargetDays = Math.max(0, workingDays - leaveDays);
  const totalTargetPoints = targetDailyPoints * effectiveTargetDays;

  return {
    periodStartDate: periodStart,
    periodEndDate: periodEnd,
    performancePercent,
    totalApprovedPoints: totalApprovedPoints.toFixed(2),
    totalTargetPoints,
    status: "BERJALAN",
  };
}

async function getLatestPayroll(employeeId: string): Promise<MyPayrollSummary> {
  const rows = await db
    .select({
      periodId: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      periodStatus: payrollPeriods.status,
      takeHomePay: payrollResults.takeHomePay,
      performancePercent: payrollResults.performancePercent,
      calculatedAt: payrollResults.calculatedAt,
    })
    .from(payrollResults)
    .innerJoin(payrollPeriods, eq(payrollResults.periodId, payrollPeriods.id))
    .where(eq(payrollResults.employeeId, employeeId))
    .orderBy(desc(payrollResults.calculatedAt))
    .limit(1);

  return rows[0] ?? null;
}

async function getTeamworkActivitySummary(employeeId: string): Promise<TeamworkActivitySummary> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 30);

  const rows = await db
    .select({
      status: dailyActivityEntries.status,
      totalPoints: dailyActivityEntries.totalPoints,
    })
    .from(dailyActivityEntries)
    .where(
      and(
        eq(dailyActivityEntries.employeeId, employeeId),
        gte(dailyActivityEntries.workDate, sinceDate)
      )
    )
    .orderBy(desc(dailyActivityEntries.workDate), desc(dailyActivityEntries.createdAt));

  return buildTeamworkActivitySummary(rows);
}

async function getPersonalHistories(employeeId: string): Promise<MyProfileResult["histories"]> {
  const previousDivision = aliasedTable(divisions, "previous_division");
  const nextDivision = aliasedTable(divisions, "new_division");
  const previousPosition = aliasedTable(positions, "previous_position");
  const nextPosition = aliasedTable(positions, "new_position");
  const previousGrade = aliasedTable(grades, "previous_grade");
  const nextGrade = aliasedTable(grades, "new_grade");
  const previousSupervisor = aliasedTable(employees, "previous_supervisor");
  const nextSupervisor = aliasedTable(employees, "new_supervisor");

  const [divisionRows, positionRows, gradeRows, supervisorRows, statusRows] =
    await Promise.all([
      db
        .select({
          effectiveDate: employeeDivisionHistories.effectiveDate,
          previousLabel: previousDivision.name,
          nextLabel: nextDivision.name,
          notes: employeeDivisionHistories.notes,
        })
        .from(employeeDivisionHistories)
        .leftJoin(previousDivision, eq(employeeDivisionHistories.previousDivisionId, previousDivision.id))
        .leftJoin(nextDivision, eq(employeeDivisionHistories.newDivisionId, nextDivision.id))
        .where(eq(employeeDivisionHistories.employeeId, employeeId))
        .orderBy(desc(employeeDivisionHistories.effectiveDate))
        .limit(5),
      db
        .select({
          effectiveDate: employeePositionHistories.effectiveDate,
          previousLabel: previousPosition.name,
          nextLabel: nextPosition.name,
          notes: employeePositionHistories.notes,
        })
        .from(employeePositionHistories)
        .leftJoin(previousPosition, eq(employeePositionHistories.previousPositionId, previousPosition.id))
        .leftJoin(nextPosition, eq(employeePositionHistories.newPositionId, nextPosition.id))
        .where(eq(employeePositionHistories.employeeId, employeeId))
        .orderBy(desc(employeePositionHistories.effectiveDate))
        .limit(5),
      db
        .select({
          effectiveDate: employeeGradeHistories.effectiveDate,
          previousLabel: previousGrade.name,
          nextLabel: nextGrade.name,
          notes: employeeGradeHistories.notes,
        })
        .from(employeeGradeHistories)
        .leftJoin(previousGrade, eq(employeeGradeHistories.previousGradeId, previousGrade.id))
        .leftJoin(nextGrade, eq(employeeGradeHistories.newGradeId, nextGrade.id))
        .where(eq(employeeGradeHistories.employeeId, employeeId))
        .orderBy(desc(employeeGradeHistories.effectiveDate))
        .limit(5),
      db
        .select({
          effectiveDate: employeeSupervisorHistories.effectiveDate,
          previousLabel: previousSupervisor.fullName,
          nextLabel: nextSupervisor.fullName,
          notes: employeeSupervisorHistories.notes,
        })
        .from(employeeSupervisorHistories)
        .leftJoin(previousSupervisor, eq(employeeSupervisorHistories.previousSupervisorEmployeeId, previousSupervisor.id))
        .leftJoin(nextSupervisor, eq(employeeSupervisorHistories.newSupervisorEmployeeId, nextSupervisor.id))
        .where(eq(employeeSupervisorHistories.employeeId, employeeId))
        .orderBy(desc(employeeSupervisorHistories.effectiveDate))
        .limit(5),
      db
        .select({
          effectiveDate: employeeStatusHistories.effectiveDate,
          previousEmploymentStatus: employeeStatusHistories.previousEmploymentStatus,
          newEmploymentStatus: employeeStatusHistories.newEmploymentStatus,
          previousPayrollStatus: employeeStatusHistories.previousPayrollStatus,
          newPayrollStatus: employeeStatusHistories.newPayrollStatus,
          notes: employeeStatusHistories.notes,
        })
        .from(employeeStatusHistories)
        .where(eq(employeeStatusHistories.employeeId, employeeId))
        .orderBy(desc(employeeStatusHistories.effectiveDate))
        .limit(5),
    ]);

  return {
    divisions: divisionRows,
    positions: positionRows,
    grades: gradeRows,
    supervisors: supervisorRows,
    statuses: statusRows,
  };
}

export async function getMyDashboard(): Promise<MyDashboardResult> {
  await requireAuth();
  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const accessState = resolveMyAccessState(role, roleRow.employeeId);
  const userEmail = user?.email ?? "";
  const quickActions = buildPersonalQuickActions(role);

  if (!accessState.canAccess) {
    return {
      redirectTo: accessState.redirectTo,
      role,
      userEmail,
      employee: null,
      quickActions: [],
      activeSchedule: null,
      latestTicket: null,
      latestReview: null,
      incidentSummary: { activeCount: 0, latestIncidentType: null, latestIncidentDate: null },
      latestPerformance: null,
      teamworkActivitySummary: null,
      latestPayroll: null,
      emptyReason: null,
    };
  }

  if (!roleRow.employeeId) {
    return {
      redirectTo: null,
      role,
      userEmail,
      employee: null,
      quickActions,
      activeSchedule: null,
      latestTicket: null,
      latestReview: null,
      incidentSummary: { activeCount: 0, latestIncidentType: null, latestIncidentDate: null },
      latestPerformance: null,
      teamworkActivitySummary: null,
      latestPayroll: null,
      emptyReason: "Akun Anda belum terhubung ke data karyawan. Hubungi HRD.",
    };
  }

  const employee = await getMyEmployeeCore(roleRow.employeeId);
  if (!employee) {
    return {
      redirectTo: null,
      role,
      userEmail,
      employee: null,
      quickActions,
      activeSchedule: null,
      latestTicket: null,
      latestReview: null,
      incidentSummary: { activeCount: 0, latestIncidentType: null, latestIncidentDate: null },
      latestPerformance: null,
      teamworkActivitySummary: null,
      latestPayroll: null,
      emptyReason: "Data karyawan pribadi tidak ditemukan atau belum aktif.",
    };
  }

  const [activeSchedule, latestTicket, latestReview, incidentSummary, latestPerformance, teamworkActivitySummary, latestPayroll] =
    await Promise.all([
      getActiveSchedule(employee.id),
      getLatestTicket(employee.id),
      getLatestReview(employee.id),
      getIncidentSummary(employee.id),
      employee.employeeGroup === "TEAMWORK" ? getLatestPerformance(employee.id) : Promise.resolve(null),
      employee.employeeGroup === "TEAMWORK" ? getTeamworkActivitySummary(employee.id) : Promise.resolve(null),
      PAYROLL_SUMMARY_ROLES.includes(role) ? getLatestPayroll(employee.id) : Promise.resolve(null),
    ]);

  return {
    redirectTo: null,
    role,
    userEmail,
    employee,
    quickActions,
    activeSchedule,
    latestTicket,
    latestReview,
    incidentSummary,
    latestPerformance,
    teamworkActivitySummary,
    latestPayroll,
    emptyReason: null,
  };
}

export async function getMyProfile(): Promise<MyProfileResult> {
  await requireAuth();
  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const accessState = resolveMyAccessState(role, roleRow.employeeId);
  const userEmail = user?.email ?? "";

  if (!accessState.canAccess) {
    return {
      redirectTo: accessState.redirectTo,
      role,
      userEmail,
      employee: null,
      activeSchedule: null,
      histories: {
        divisions: [],
        positions: [],
        grades: [],
        supervisors: [],
        statuses: [],
      },
      emptyReason: null,
    };
  }

  if (!roleRow.employeeId) {
    return {
      redirectTo: null,
      role,
      userEmail,
      employee: null,
      activeSchedule: null,
      histories: {
        divisions: [],
        positions: [],
        grades: [],
        supervisors: [],
        statuses: [],
      },
      emptyReason: "Akun Anda belum terhubung ke data karyawan. Hubungi HRD.",
    };
  }

  const employee = await getMyEmployeeCore(roleRow.employeeId);
  if (!employee) {
    return {
      redirectTo: null,
      role,
      userEmail,
      employee: null,
      activeSchedule: null,
      histories: {
        divisions: [],
        positions: [],
        grades: [],
        supervisors: [],
        statuses: [],
      },
      emptyReason: "Data karyawan pribadi tidak ditemukan atau belum aktif.",
    };
  }

  const [activeSchedule, histories] = await Promise.all([
    getActiveSchedule(employee.id),
    getPersonalHistories(employee.id),
  ]);

  return {
    redirectTo: null,
    role,
    userEmail,
    employee,
    activeSchedule,
    histories,
    emptyReason: null,
  };
}
