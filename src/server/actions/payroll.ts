"use server";

import { GAJI_POKOK_REGULER_DEFAULT, GAJI_TRAINING_DEFAULT, SP_MULTIPLIER } from "@/config/constants";
import { getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  employeeDivisionHistories,
  employeeGradeHistories,
  employeePositionHistories,
  employeeScheduleAssignments,
  employees,
  workScheduleDays,
} from "@/lib/db/schema/employee";
import { attendanceTickets, incidentLogs } from "@/lib/db/schema/hr";
import { branches, divisions, grades, positions } from "@/lib/db/schema/master";
import {
  employeeSalaryConfigs,
  gradeCompensationConfigs,
  managerialKpiSummaries,
  payrollAdjustments,
  payrollAuditLogs,
  payrollEmployeeSnapshots,
  payrollPeriods,
  payrollResults,
} from "@/lib/db/schema/payroll";
import {
  dailyActivityApprovalLogs,
  dailyActivityEntries,
  monthlyPointPerformances,
} from "@/lib/db/schema/point";
import {
  createPayrollPeriodSchema,
  managerialKpiSummarySchema,
  payrollAdjustmentSchema,
  gradeCompensationConfigSchema,
  payrollPeriodActionSchema,
  salaryConfigSchema,
} from "@/lib/validations/payroll";
import { calculateManagerialPayroll } from "@/server/payroll-engine/calculate-managerial-payroll";
import { calculateTeamworkPayroll } from "@/server/payroll-engine/calculate-teamwork-payroll";
import { resolvePayrollPeriod } from "@/server/payroll-engine/resolve-payroll-period";
import { resolvePayrollStatusTransition } from "@/server/payroll-engine/resolve-payroll-status-transition";
import { resolveTenureAllowanceAmount } from "@/server/payroll-engine/resolve-tenure-allowance";
import { countTargetDaysForPeriod } from "@/server/point-engine/count-target-days-for-period";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { PayrollAdjustmentType, PayrollPeriodStatus, UserRole } from "@/types";
import { canReadPayrollEmployeeDetail } from "./payroll.helpers";

const PAYROLL_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "FINANCE", "PAYROLL_VIEWER"];
const PAYROLL_WRITE_ROLES: UserRole[] = ["SUPER_ADMIN", "FINANCE"];
const APPROVED_TICKET_STATUSES = ["AUTO_APPROVED", "APPROVED_SPV", "APPROVED_HRD"] as const;
const LOCKABLE_ACTIVITY_STATUSES = ["DISETUJUI_SPV", "OVERRIDE_HRD"] as const;

type PayrollReadAccess =
  | { error: string }
  | {
      roleRow: Awaited<ReturnType<typeof getCurrentUserRoleRow>>;
      role: UserRole;
    };

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function roundCurrency(amount: number) {
  return Number(amount.toFixed(2));
}

function resolveTieredBonusAmount(
  performancePercent: number,
  bonus80: number,
  bonus90: number,
  bonus100: number
) {
  if (performancePercent >= 100) return bonus100;
  if (performancePercent >= 90) return bonus90;
  if (performancePercent >= 80) return bonus80;
  return 0;
}

function normalizeDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function countCalendarDaysInclusive(start: Date, end: Date) {
  const cursorStart = normalizeDate(start);
  const cursorEnd = normalizeDate(end);
  const diff = cursorEnd.getTime() - cursorStart.getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

function countOverlapDays(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  const overlapStart = normalizeDate(start) > normalizeDate(rangeStart) ? normalizeDate(start) : normalizeDate(rangeStart);
  const overlapEnd = normalizeDate(end) < normalizeDate(rangeEnd) ? normalizeDate(end) : normalizeDate(rangeEnd);
  if (overlapStart > overlapEnd) return 0;
  return countCalendarDaysInclusive(overlapStart, overlapEnd);
}

function resolveActiveEmploymentDays(startDate: Date, periodStartDate: Date, periodEndDate: Date) {
  if (normalizeDate(startDate) > normalizeDate(periodEndDate)) return 0;
  const effectiveStart = normalizeDate(startDate) > normalizeDate(periodStartDate)
    ? normalizeDate(startDate)
    : normalizeDate(periodStartDate);
  return countCalendarDaysInclusive(effectiveStart, periodEndDate);
}

function resolveSpPenaltyMultiplier(incidentTypes: string[]) {
  if (incidentTypes.includes("SP2")) return SP_MULTIPLIER.SP2;
  if (incidentTypes.includes("SP1")) return SP_MULTIPLIER.SP1;
  return SP_MULTIPLIER.NONE;
}

async function assertPayrollReadAccess(): Promise<PayrollReadAccess> {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  if (!PAYROLL_READ_ROLES.includes(role)) {
    return { error: "Akses payroll ditolak." };
  }
  return { roleRow, role };
}

async function assertPayrollWriteAccess(): Promise<PayrollReadAccess> {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  if (!PAYROLL_WRITE_ROLES.includes(role)) {
    return { error: "Akses payroll ditolak." };
  }
  return { roleRow, role };
}

async function resolveDivisionSnapshot(
  employeeId: string,
  periodStartDate: Date,
  currentDivisionId: string | null,
  currentDivisionName: string | null
) {
  const [historyRow] = await db
    .select({
      divisionId: employeeDivisionHistories.newDivisionId,
      divisionName: divisions.name,
    })
    .from(employeeDivisionHistories)
    .leftJoin(divisions, eq(employeeDivisionHistories.newDivisionId, divisions.id))
    .where(
      and(
        eq(employeeDivisionHistories.employeeId, employeeId),
        lte(employeeDivisionHistories.effectiveDate, periodStartDate)
      )
    )
    .orderBy(desc(employeeDivisionHistories.effectiveDate))
    .limit(1);

  return {
    divisionSnapshotId: historyRow?.divisionId ?? currentDivisionId,
    divisionSnapshotName: historyRow?.divisionName ?? currentDivisionName ?? "UNKNOWN",
  };
}

async function resolvePositionSnapshot(
  employeeId: string,
  periodStartDate: Date,
  currentPositionId: string | null,
  currentPositionName: string | null
) {
  const [historyRow] = await db
    .select({
      positionId: employeePositionHistories.newPositionId,
      positionName: positions.name,
    })
    .from(employeePositionHistories)
    .leftJoin(positions, eq(employeePositionHistories.newPositionId, positions.id))
    .where(
      and(
        eq(employeePositionHistories.employeeId, employeeId),
        lte(employeePositionHistories.effectiveDate, periodStartDate)
      )
    )
    .orderBy(desc(employeePositionHistories.effectiveDate))
    .limit(1);

  return {
    positionSnapshotId: historyRow?.positionId ?? currentPositionId,
    positionSnapshotName: historyRow?.positionName ?? currentPositionName ?? "UNKNOWN",
  };
}

async function resolveGradeSnapshot(
  employeeId: string,
  periodStartDate: Date,
  currentGradeId: string | null,
  currentGradeName: string | null
) {
  const [historyRow] = await db
    .select({
      gradeId: employeeGradeHistories.newGradeId,
      gradeName: grades.name,
    })
    .from(employeeGradeHistories)
    .leftJoin(grades, eq(employeeGradeHistories.newGradeId, grades.id))
    .where(
      and(
        eq(employeeGradeHistories.employeeId, employeeId),
        lte(employeeGradeHistories.effectiveDate, periodStartDate)
      )
    )
    .orderBy(desc(employeeGradeHistories.effectiveDate))
    .limit(1);

  return {
    gradeSnapshotId: historyRow?.gradeId ?? currentGradeId,
    gradeSnapshotName: historyRow?.gradeName ?? currentGradeName ?? null,
  };
}

async function resolveScheduledWorkDays(employeeId: string, periodStartDate: Date, periodEndDate: Date) {
  const assignmentRows = await db
    .select({
      effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
      effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
      scheduleId: employeeScheduleAssignments.scheduleId,
    })
    .from(employeeScheduleAssignments)
    .where(
      and(
        eq(employeeScheduleAssignments.employeeId, employeeId),
        lte(employeeScheduleAssignments.effectiveStartDate, periodEndDate),
        or(
          gte(employeeScheduleAssignments.effectiveEndDate, periodStartDate),
          isNull(employeeScheduleAssignments.effectiveEndDate)
        )
      )
    )
    .orderBy(asc(employeeScheduleAssignments.effectiveStartDate));

  if (assignmentRows.length === 0) return 0;

  const scheduleIds = [...new Set(assignmentRows.map((row) => row.scheduleId))];
  const scheduleDayRows = await db
    .select({
      scheduleId: workScheduleDays.scheduleId,
      dayOfWeek: workScheduleDays.dayOfWeek,
      isWorkingDay: workScheduleDays.isWorkingDay,
    })
    .from(workScheduleDays)
    .where(inArray(workScheduleDays.scheduleId, scheduleIds));

  const workingDaysBySchedule = new Map<string, number[]>();
  for (const row of scheduleDayRows) {
    if (!row.isWorkingDay) continue;
    const current = workingDaysBySchedule.get(row.scheduleId) ?? [];
    current.push(row.dayOfWeek);
    workingDaysBySchedule.set(row.scheduleId, current);
  }

  return countTargetDaysForPeriod({
    periodStartDate,
    periodEndDate,
    assignments: assignmentRows.map((row) => ({
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
      workingDays: workingDaysBySchedule.get(row.scheduleId) ?? [],
    })),
  });
}

export async function getPayrollWorkspace(selectedPeriodId?: string) {
  const access = await assertPayrollReadAccess();
  if ("error" in access) return access;

  const periods = await db
    .select({
      id: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      periodStartDate: payrollPeriods.periodStartDate,
      periodEndDate: payrollPeriods.periodEndDate,
      status: payrollPeriods.status,
      notes: payrollPeriods.notes,
      previewGeneratedAt: payrollPeriods.previewGeneratedAt,
      finalizedAt: payrollPeriods.finalizedAt,
      paidAt: payrollPeriods.paidAt,
      lockedAt: payrollPeriods.lockedAt,
      createdAt: payrollPeriods.createdAt,
    })
    .from(payrollPeriods)
    .orderBy(desc(payrollPeriods.periodStartDate));

  const activePeriodId = periods.find((period) => period.id === selectedPeriodId)?.id ?? periods[0]?.id ?? null;
  const selectedPeriod = periods.find((period) => period.id === activePeriodId) ?? null;

  const results = activePeriodId
    ? await db
        .select({
          id: payrollResults.id,
          employeeId: payrollResults.employeeId,
          employeeName: payrollEmployeeSnapshots.employeeNameSnapshot,
          employeeCode: payrollEmployeeSnapshots.employeeCodeSnapshot,
          divisionName: payrollEmployeeSnapshots.divisionSnapshotName,
          positionName: payrollEmployeeSnapshots.positionSnapshotName,
          gradeName: payrollEmployeeSnapshots.gradeSnapshotName,
          employeeGroup: payrollEmployeeSnapshots.employeeGroupSnapshot,
          payrollStatus: payrollEmployeeSnapshots.payrollStatusSnapshot,
          performancePercent: payrollResults.performancePercent,
          approvedUnpaidLeaveDays: payrollResults.approvedUnpaidLeaveDays,
          baseSalaryPaid: payrollResults.baseSalaryPaid,
          gradeAllowancePaid: payrollResults.gradeAllowancePaid,
          tenureAllowancePaid: payrollResults.tenureAllowancePaid,
          bonusKinerjaAmount: payrollResults.bonusKinerjaAmount,
          bonusPrestasiAmount: payrollResults.bonusPrestasiAmount,
          bonusFulltimeAmount: payrollResults.bonusFulltimeAmount,
          bonusDisciplineAmount: payrollResults.bonusDisciplineAmount,
          bonusTeamAmount: payrollResults.bonusTeamAmount,
          incidentDeductionAmount: payrollResults.incidentDeductionAmount,
          manualAdjustmentAmount: payrollResults.manualAdjustmentAmount,
          totalAdditionAmount: payrollResults.totalAdditionAmount,
          totalDeductionAmount: payrollResults.totalDeductionAmount,
          takeHomePay: payrollResults.takeHomePay,
          status: payrollResults.status,
        })
        .from(payrollResults)
        .leftJoin(payrollEmployeeSnapshots, eq(payrollResults.snapshotId, payrollEmployeeSnapshots.id))
        .where(eq(payrollResults.periodId, activePeriodId))
        .orderBy(asc(payrollEmployeeSnapshots.employeeNameSnapshot))
    : [];

  const adjustments = activePeriodId
    ? await db
        .select({
          id: payrollAdjustments.id,
          employeeId: payrollAdjustments.employeeId,
          employeeName: employees.fullName,
          adjustmentType: payrollAdjustments.adjustmentType,
          amount: payrollAdjustments.amount,
          reason: payrollAdjustments.reason,
          createdAt: payrollAdjustments.createdAt,
        })
        .from(payrollAdjustments)
        .leftJoin(employees, eq(payrollAdjustments.employeeId, employees.id))
        .where(eq(payrollAdjustments.periodId, activePeriodId))
        .orderBy(desc(payrollAdjustments.createdAt))
    : [];

  const salaryConfigs = await db
    .select({
      employeeId: employees.id,
      employeeCode: employees.employeeCode,
      employeeName: employees.fullName,
      positionName: positions.name,
      divisionName: divisions.name,
      trainingGraduationDate: employees.trainingGraduationDate,
      employeeGroup: employees.employeeGroup,
      payrollStatus: employees.payrollStatus,
      baseSalaryAmount: employeeSalaryConfigs.baseSalaryAmount,
      gradeAllowanceAmount: employeeSalaryConfigs.gradeAllowanceAmount,
      tenureAllowanceAmount: employeeSalaryConfigs.tenureAllowanceAmount,
      dailyAllowanceAmount: employeeSalaryConfigs.dailyAllowanceAmount,
      performanceBonusBaseAmount: employeeSalaryConfigs.performanceBonusBaseAmount,
      achievementBonus140Amount: employeeSalaryConfigs.achievementBonus140Amount,
      achievementBonus165Amount: employeeSalaryConfigs.achievementBonus165Amount,
      fulltimeBonusAmount: employeeSalaryConfigs.fulltimeBonusAmount,
      disciplineBonusAmount: employeeSalaryConfigs.disciplineBonusAmount,
      teamBonusAmount: employeeSalaryConfigs.teamBonusAmount,
      overtimeRateAmount: employeeSalaryConfigs.overtimeRateAmount,
      notes: employeeSalaryConfigs.notes,
      updatedAt: employeeSalaryConfigs.updatedAt,
    })
    .from(employees)
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(employeeSalaryConfigs, eq(employees.id, employeeSalaryConfigs.employeeId))
    .where(
      and(
        eq(employees.isActive, true),
        inArray(employees.payrollStatus, ["TRAINING", "REGULER", "FINAL_PAYROLL"])
      )
    )
    .orderBy(asc(employees.fullName));

  const tenureReferenceDate = selectedPeriod?.periodEndDate ?? new Date();
  const salaryConfigsWithAutoTenure = salaryConfigs.map((row) => ({
    ...row,
    tenureAllowanceAmount: resolveTenureAllowanceAmount(row.trainingGraduationDate, tenureReferenceDate).toFixed(2),
  }));

  const managerialKpiRows = activePeriodId
    ? await db
        .select({
          id: managerialKpiSummaries.id,
          employeeId: managerialKpiSummaries.employeeId,
          employeeCode: employees.employeeCode,
          employeeName: employees.fullName,
          divisionName: divisions.name,
          performancePercent: managerialKpiSummaries.performancePercent,
          status: managerialKpiSummaries.status,
          notes: managerialKpiSummaries.notes,
          updatedAt: managerialKpiSummaries.updatedAt,
        })
        .from(managerialKpiSummaries)
        .leftJoin(employees, eq(managerialKpiSummaries.employeeId, employees.id))
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(eq(managerialKpiSummaries.periodId, activePeriodId))
        .orderBy(asc(employees.fullName))
    : [];

  const gradeCompensations = await db
    .select({
      gradeId: grades.id,
      gradeName: grades.name,
      allowanceAmount: gradeCompensationConfigs.allowanceAmount,
      bonusKinerja80: gradeCompensationConfigs.bonusKinerja80,
      bonusKinerja90: gradeCompensationConfigs.bonusKinerja90,
      bonusKinerja100: gradeCompensationConfigs.bonusKinerja100,
      bonusKinerjaTeam80: gradeCompensationConfigs.bonusKinerjaTeam80,
      bonusKinerjaTeam90: gradeCompensationConfigs.bonusKinerjaTeam90,
      bonusKinerjaTeam100: gradeCompensationConfigs.bonusKinerjaTeam100,
      bonusDisiplin80: gradeCompensationConfigs.bonusDisiplin80,
      bonusDisiplin90: gradeCompensationConfigs.bonusDisiplin90,
      bonusDisiplin100: gradeCompensationConfigs.bonusDisiplin100,
      bonusPrestasi140: gradeCompensationConfigs.bonusPrestasi140,
      bonusPrestasi165: gradeCompensationConfigs.bonusPrestasi165,
      isActive: gradeCompensationConfigs.isActive,
    })
    .from(grades)
    .leftJoin(gradeCompensationConfigs, eq(gradeCompensationConfigs.gradeId, grades.id))
    .where(eq(grades.isActive, true))
    .orderBy(asc(grades.name));

  return {
    role: access.role,
    canManage: PAYROLL_WRITE_ROLES.includes(access.role),
    activePeriodId,
    selectedPeriod,
    periods,
    results,
    adjustments,
    salaryConfigs: salaryConfigsWithAutoTenure,
    gradeCompensations,
    managerialKpiRows,
  };
}

export async function getPayrollEmployeeDetail(periodId: string, employeeId: string) {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const viewerCanReadPayrollWorkspace = PAYROLL_READ_ROLES.includes(role);

  if (!canReadPayrollEmployeeDetail(role, roleRow.employeeId, employeeId)) {
    return { error: "Akses payroll ditolak." };
  }

  const [detail] = await db
    .select({
      periodId: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      periodStartDate: payrollPeriods.periodStartDate,
      periodEndDate: payrollPeriods.periodEndDate,
      periodStatus: payrollPeriods.status,
      resultId: payrollResults.id,
      resultStatus: payrollResults.status,
      performancePercent: payrollResults.performancePercent,
      totalApprovedPoints: payrollResults.totalApprovedPoints,
      totalTargetPoints: payrollResults.totalTargetPoints,
      approvedUnpaidLeaveDays: payrollResults.approvedUnpaidLeaveDays,
      approvedPaidLeaveDays: payrollResults.approvedPaidLeaveDays,
      incidentDeductionAmount: payrollResults.incidentDeductionAmount,
      manualAdjustmentAmount: payrollResults.manualAdjustmentAmount,
      baseSalaryPaid: payrollResults.baseSalaryPaid,
      gradeAllowancePaid: payrollResults.gradeAllowancePaid,
      tenureAllowancePaid: payrollResults.tenureAllowancePaid,
      dailyAllowancePaid: payrollResults.dailyAllowancePaid,
      overtimeAmount: payrollResults.overtimeAmount,
      bonusFulltimeAmount: payrollResults.bonusFulltimeAmount,
      bonusDisciplineAmount: payrollResults.bonusDisciplineAmount,
      bonusKinerjaAmount: payrollResults.bonusKinerjaAmount,
      bonusPrestasiAmount: payrollResults.bonusPrestasiAmount,
      bonusTeamAmount: payrollResults.bonusTeamAmount,
      totalAdditionAmount: payrollResults.totalAdditionAmount,
      totalDeductionAmount: payrollResults.totalDeductionAmount,
      takeHomePay: payrollResults.takeHomePay,
      breakdown: payrollResults.breakdown,
      managerialKpiSummaryId: payrollResults.managerialKpiSummaryId,
      snapshotId: payrollEmployeeSnapshots.id,
      employeeId: payrollEmployeeSnapshots.employeeId,
      employeeCode: payrollEmployeeSnapshots.employeeCodeSnapshot,
      employeeName: payrollEmployeeSnapshots.employeeNameSnapshot,
      branchName: payrollEmployeeSnapshots.branchSnapshotName,
      divisionName: payrollEmployeeSnapshots.divisionSnapshotName,
      positionName: payrollEmployeeSnapshots.positionSnapshotName,
      gradeName: payrollEmployeeSnapshots.gradeSnapshotName,
      employeeGroup: payrollEmployeeSnapshots.employeeGroupSnapshot,
      employmentStatus: payrollEmployeeSnapshots.employmentStatusSnapshot,
      payrollStatus: payrollEmployeeSnapshots.payrollStatusSnapshot,
      baseSalaryConfigured: payrollEmployeeSnapshots.baseSalaryAmount,
      gradeAllowanceConfigured: payrollEmployeeSnapshots.gradeAllowanceAmount,
      tenureAllowanceConfigured: payrollEmployeeSnapshots.tenureAllowanceAmount,
      performanceBonusBaseConfigured: payrollEmployeeSnapshots.performanceBonusBaseAmount,
      achievementBonus140Configured: payrollEmployeeSnapshots.achievementBonus140Amount,
      achievementBonus165Configured: payrollEmployeeSnapshots.achievementBonus165Amount,
      fulltimeBonusConfigured: payrollEmployeeSnapshots.fulltimeBonusAmount,
      disciplineBonusConfigured: payrollEmployeeSnapshots.disciplineBonusAmount,
      teamBonusConfigured: payrollEmployeeSnapshots.teamBonusAmount,
      scheduledWorkDays: payrollEmployeeSnapshots.scheduledWorkDays,
      activeEmploymentDays: payrollEmployeeSnapshots.activeEmploymentDays,
      calculatedAt: payrollResults.calculatedAt,
      finalizedAt: payrollResults.finalizedAt,
    })
    .from(payrollResults)
    .leftJoin(payrollPeriods, eq(payrollResults.periodId, payrollPeriods.id))
    .leftJoin(payrollEmployeeSnapshots, eq(payrollResults.snapshotId, payrollEmployeeSnapshots.id))
    .where(and(eq(payrollResults.periodId, periodId), eq(payrollResults.employeeId, employeeId)))
    .limit(1);

  if (!detail) {
    return { error: "Detail payroll tidak ditemukan." };
  }

  const periodStartDate = detail.periodStartDate;
  const periodEndDate = detail.periodEndDate;
  if (!periodStartDate || !periodEndDate) {
    return { error: "Data periode payroll tidak lengkap." };
  }

  const [performance] = await db
    .select({
      id: monthlyPointPerformances.id,
      divisionSnapshotName: monthlyPointPerformances.divisionSnapshotName,
      targetDailyPoints: monthlyPointPerformances.targetDailyPoints,
      targetDays: monthlyPointPerformances.targetDays,
      totalTargetPoints: monthlyPointPerformances.totalTargetPoints,
      totalApprovedPoints: monthlyPointPerformances.totalApprovedPoints,
      performancePercent: monthlyPointPerformances.performancePercent,
      status: monthlyPointPerformances.status,
      calculatedAt: monthlyPointPerformances.calculatedAt,
    })
    .from(monthlyPointPerformances)
    .where(
      and(
        eq(monthlyPointPerformances.employeeId, employeeId),
        eq(monthlyPointPerformances.periodStartDate, periodStartDate),
        eq(monthlyPointPerformances.periodEndDate, periodEndDate)
      )
    )
    .limit(1);

  const [managerialKpi] = await db
    .select({
      id: managerialKpiSummaries.id,
      performancePercent: managerialKpiSummaries.performancePercent,
      notes: managerialKpiSummaries.notes,
      status: managerialKpiSummaries.status,
      validatedAt: managerialKpiSummaries.validatedAt,
    })
    .from(managerialKpiSummaries)
    .where(and(eq(managerialKpiSummaries.periodId, periodId), eq(managerialKpiSummaries.employeeId, employeeId)))
    .limit(1);

  const adjustments = await db
    .select({
      id: payrollAdjustments.id,
      adjustmentType: payrollAdjustments.adjustmentType,
      amount: payrollAdjustments.amount,
      reason: payrollAdjustments.reason,
      createdAt: payrollAdjustments.createdAt,
    })
    .from(payrollAdjustments)
    .where(and(eq(payrollAdjustments.periodId, periodId), eq(payrollAdjustments.employeeId, employeeId)))
    .orderBy(desc(payrollAdjustments.createdAt));

  const tickets = await db
    .select({
      id: attendanceTickets.id,
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      endDate: attendanceTickets.endDate,
      daysCount: attendanceTickets.daysCount,
      status: attendanceTickets.status,
      payrollImpact: attendanceTickets.payrollImpact,
      reason: attendanceTickets.reason,
    })
    .from(attendanceTickets)
    .where(
      and(
        eq(attendanceTickets.employeeId, employeeId),
        inArray(attendanceTickets.status, APPROVED_TICKET_STATUSES),
        lte(attendanceTickets.startDate, periodEndDate),
        gte(attendanceTickets.endDate, periodStartDate)
      )
    )
    .orderBy(desc(attendanceTickets.startDate));

  const incidents = await db
    .select({
      id: incidentLogs.id,
      incidentType: incidentLogs.incidentType,
      incidentDate: incidentLogs.incidentDate,
      impact: incidentLogs.impact,
      payrollDeduction: incidentLogs.payrollDeduction,
      description: incidentLogs.description,
      notes: incidentLogs.notes,
    })
    .from(incidentLogs)
    .where(
      and(
        eq(incidentLogs.employeeId, employeeId),
        eq(incidentLogs.isActive, true),
        gte(incidentLogs.incidentDate, periodStartDate),
        lte(incidentLogs.incidentDate, periodEndDate)
      )
    )
    .orderBy(desc(incidentLogs.incidentDate));

  return {
    role,
    viewerCanReadPayrollWorkspace,
    detail,
    performance: performance ?? null,
    managerialKpi: managerialKpi ?? null,
    adjustments,
    tickets,
    incidents,
  };
}

export async function upsertEmployeeSalaryConfig(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = salaryConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Konfigurasi salary tidak valid." };
  }

  const [employee] = await db
    .select({
      id: employees.id,
      employeeGroup: employees.employeeGroup,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.id, parsed.data.employeeId))
    .limit(1);

  if (!employee) return { error: "Karyawan tidak ditemukan." };
  if (!employee.isActive) {
    return { error: "Salary config payroll hanya dapat diatur untuk karyawan aktif." };
  }

  const payload = {
    employeeId: parsed.data.employeeId,
    baseSalaryAmount: parsed.data.baseSalaryAmount?.toFixed(2) ?? null,
    gradeAllowanceAmount: parsed.data.gradeAllowanceAmount?.toFixed(2) ?? null,
    tenureAllowanceAmount: parsed.data.tenureAllowanceAmount?.toFixed(2) ?? null,
    dailyAllowanceAmount: parsed.data.dailyAllowanceAmount?.toFixed(2) ?? null,
    performanceBonusBaseAmount: parsed.data.performanceBonusBaseAmount?.toFixed(2) ?? null,
    achievementBonus140Amount: parsed.data.achievementBonus140Amount?.toFixed(2) ?? null,
    achievementBonus165Amount: parsed.data.achievementBonus165Amount?.toFixed(2) ?? null,
    fulltimeBonusAmount: parsed.data.fulltimeBonusAmount?.toFixed(2) ?? null,
    disciplineBonusAmount: parsed.data.disciplineBonusAmount?.toFixed(2) ?? null,
    teamBonusAmount: parsed.data.teamBonusAmount?.toFixed(2) ?? null,
    overtimeRateAmount: parsed.data.overtimeRateAmount?.toFixed(2) ?? null,
    notes: parsed.data.notes || null,
  };

  const [existingConfig] = await db
    .select({ id: employeeSalaryConfigs.id })
    .from(employeeSalaryConfigs)
    .where(eq(employeeSalaryConfigs.employeeId, parsed.data.employeeId))
    .limit(1);

  if (existingConfig) {
    await db
      .update(employeeSalaryConfigs)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(employeeSalaryConfigs.employeeId, parsed.data.employeeId));
  } else {
    await db.insert(employeeSalaryConfigs).values(payload);
  }

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}

export async function upsertGradeCompensationConfig(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = gradeCompensationConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Konfigurasi kompensasi grade tidak valid." };
  }

  const [grade] = await db
    .select({ id: grades.id, isActive: grades.isActive })
    .from(grades)
    .where(eq(grades.id, parsed.data.gradeId))
    .limit(1);

  if (!grade) return { error: "Grade tidak ditemukan." };
  if (!grade.isActive) return { error: "Hanya grade aktif yang dapat diatur." };

  const payload = {
    gradeId: parsed.data.gradeId,
    allowanceAmount: parsed.data.allowanceAmount?.toFixed(2) ?? null,
    bonusKinerja80: parsed.data.bonusKinerja80?.toFixed(2) ?? null,
    bonusKinerja90: parsed.data.bonusKinerja90?.toFixed(2) ?? null,
    bonusKinerja100: parsed.data.bonusKinerja100?.toFixed(2) ?? null,
    bonusKinerjaTeam80: parsed.data.bonusKinerjaTeam80?.toFixed(2) ?? null,
    bonusKinerjaTeam90: parsed.data.bonusKinerjaTeam90?.toFixed(2) ?? null,
    bonusKinerjaTeam100: parsed.data.bonusKinerjaTeam100?.toFixed(2) ?? null,
    bonusDisiplin80: parsed.data.bonusDisiplin80?.toFixed(2) ?? null,
    bonusDisiplin90: parsed.data.bonusDisiplin90?.toFixed(2) ?? null,
    bonusDisiplin100: parsed.data.bonusDisiplin100?.toFixed(2) ?? null,
    bonusPrestasi140: parsed.data.bonusPrestasi140?.toFixed(2) ?? null,
    bonusPrestasi165: parsed.data.bonusPrestasi165?.toFixed(2) ?? null,
    isActive: parsed.data.isActive ?? true,
  };

  const [existing] = await db
    .select({ id: gradeCompensationConfigs.id })
    .from(gradeCompensationConfigs)
    .where(eq(gradeCompensationConfigs.gradeId, parsed.data.gradeId))
    .limit(1);

  if (existing) {
    await db
      .update(gradeCompensationConfigs)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(gradeCompensationConfigs.gradeId, parsed.data.gradeId));
  } else {
    await db.insert(gradeCompensationConfigs).values(payload);
  }

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}

export async function upsertManagerialKpiSummary(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = managerialKpiSummarySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input KPI managerial tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const [period] = await db
    .select({
      id: payrollPeriods.id,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, parsed.data.periodId))
    .limit(1);

  if (!period) return { error: "Periode payroll tidak ditemukan." };
  if (period.status === "PAID" || period.status === "LOCKED") {
    return { error: "Periode payroll yang sudah paid/locked tidak bisa diubah lagi." };
  }

  const [employee] = await db
    .select({
      id: employees.id,
      employeeGroup: employees.employeeGroup,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.id, parsed.data.employeeId))
    .limit(1);

  if (!employee) return { error: "Karyawan tidak ditemukan." };
  if (!employee.isActive) return { error: "Karyawan nonaktif tidak dapat diset KPI payroll." };
  if (employee.employeeGroup !== "MANAGERIAL") {
    return { error: "KPI managerial hanya berlaku untuk kelompok MANAGERIAL." };
  }

  const [existing] = await db
    .select({ id: managerialKpiSummaries.id })
    .from(managerialKpiSummaries)
    .where(
      and(
        eq(managerialKpiSummaries.periodId, parsed.data.periodId),
        eq(managerialKpiSummaries.employeeId, parsed.data.employeeId)
      )
    )
    .limit(1);

  const payload = {
    periodId: parsed.data.periodId,
    employeeId: parsed.data.employeeId,
    performancePercent: parsed.data.performancePercent.toFixed(2),
    notes: parsed.data.notes || null,
    status: "VALIDATED" as const,
    validatedByUserId: user.id,
    validatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(managerialKpiSummaries)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(managerialKpiSummaries.id, existing.id));
  } else {
    await db.insert(managerialKpiSummaries).values(payload);
  }

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}

export async function createPayrollPeriod(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = createPayrollPeriodSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input periode payroll tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const { periodCode, periodStartDate, periodEndDate } = resolvePayrollPeriod(parsed.data.periodCode);

  const [existingPeriod] = await db
    .select({ id: payrollPeriods.id })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.periodCode, periodCode))
    .limit(1);

  if (existingPeriod) {
    return { error: "Periode payroll sudah ada." };
  }

  const [period] = await db
    .insert(payrollPeriods)
    .values({
      periodCode,
      periodStartDate,
      periodEndDate,
      notes: parsed.data.notes,
      createdByUserId: user.id,
    })
    .returning({
      id: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
    });

  await db.insert(payrollAuditLogs).values({
    periodId: period.id,
    action: "CREATE_PERIOD",
    actorUserId: user.id,
    actorRole: access.role,
    notes: parsed.data.notes ?? `Periode ${period.periodCode} dibuat.`,
    payload: { periodCode },
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true, periodId: period.id };
}

export async function addPayrollAdjustment(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = payrollAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adjustment payroll tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const [period] = await db
    .select({
      id: payrollPeriods.id,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, parsed.data.periodId))
    .limit(1);

  if (!period) return { error: "Periode payroll tidak ditemukan." };
  if (period.status === "PAID" || period.status === "LOCKED") {
    return { error: "Adjustment tidak bisa ditambahkan pada periode yang sudah paid/locked." };
  }

  await db.transaction(async (tx) => {
    await tx.insert(payrollAdjustments).values({
      periodId: parsed.data.periodId,
      employeeId: parsed.data.employeeId,
      adjustmentType: parsed.data.adjustmentType as PayrollAdjustmentType,
      amount: parsed.data.amount.toFixed(2),
      reason: parsed.data.reason,
      appliedByUserId: user.id,
      appliedByRole: access.role,
    });

    await tx.insert(payrollAuditLogs).values({
      periodId: parsed.data.periodId,
      employeeId: parsed.data.employeeId,
      action: "ADD_ADJUSTMENT",
      actorUserId: user.id,
      actorRole: access.role,
      notes: parsed.data.reason,
      payload: {
        adjustmentType: parsed.data.adjustmentType,
        amount: parsed.data.amount,
      },
    });
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}

export async function generatePayrollPreview(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = payrollPeriodActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Periode payroll tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const [period] = await db
    .select({
      id: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      periodStartDate: payrollPeriods.periodStartDate,
      periodEndDate: payrollPeriods.periodEndDate,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, parsed.data.periodId))
    .limit(1);

  if (!period) return { error: "Periode payroll tidak ditemukan." };
  if (period.status === "PAID" || period.status === "LOCKED") {
    return { error: "Periode payroll yang sudah paid/locked tidak bisa digenerate ulang." };
  }

  const periodStartDate = normalizeDate(period.periodStartDate);
  const periodEndDate = normalizeDate(period.periodEndDate);
  const periodDayCount = countCalendarDaysInclusive(periodStartDate, periodEndDate);

  const employeeRows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      startDate: employees.startDate,
      branchId: employees.branchId,
      branchName: branches.name,
      divisionId: employees.divisionId,
      divisionName: divisions.name,
      positionId: employees.positionId,
      positionName: positions.name,
      gradeId: employees.gradeId,
      gradeName: grades.name,
      employeeGroup: employees.employeeGroup,
      employmentStatus: employees.employmentStatus,
      payrollStatus: employees.payrollStatus,
      trainingGraduationDate: employees.trainingGraduationDate,
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(branches, eq(employees.branchId, branches.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(grades, eq(employees.gradeId, grades.id))
    .where(
      and(
        eq(employees.isActive, true),
        inArray(employees.payrollStatus, ["TRAINING", "REGULER", "FINAL_PAYROLL"])
      )
    )
    .orderBy(asc(employees.fullName));

  const employeeIds = employeeRows.map((row) => row.id);

  const salaryConfigRows = employeeIds.length > 0
    ? await db
        .select()
        .from(employeeSalaryConfigs)
        .where(inArray(employeeSalaryConfigs.employeeId, employeeIds))
    : [];

  const salaryConfigMap = new Map(salaryConfigRows.map((row) => [row.employeeId, row]));
  const gradeCompensationRows = await db
    .select()
    .from(gradeCompensationConfigs)
    .where(eq(gradeCompensationConfigs.isActive, true));
  const gradeCompensationMap = new Map(gradeCompensationRows.map((row) => [row.gradeId, row]));

  const performanceRows = await db
    .select()
    .from(monthlyPointPerformances)
    .where(
      and(
        eq(monthlyPointPerformances.periodStartDate, period.periodStartDate),
        eq(monthlyPointPerformances.periodEndDate, period.periodEndDate)
      )
    );
  const performanceMap = new Map(performanceRows.map((row) => [row.employeeId, row]));

  const managerialKpiRows = employeeIds.length > 0
    ? await db
        .select()
        .from(managerialKpiSummaries)
        .where(
          and(
            eq(managerialKpiSummaries.periodId, parsed.data.periodId),
            inArray(managerialKpiSummaries.employeeId, employeeIds),
            eq(managerialKpiSummaries.status, "VALIDATED")
          )
        )
    : [];
  const managerialKpiMap = new Map(managerialKpiRows.map((row) => [row.employeeId, row]));

  const ticketRows = employeeIds.length > 0
    ? await db
        .select()
        .from(attendanceTickets)
        .where(
          and(
            inArray(attendanceTickets.employeeId, employeeIds),
            inArray(attendanceTickets.status, APPROVED_TICKET_STATUSES),
            lte(attendanceTickets.startDate, period.periodEndDate),
            gte(attendanceTickets.endDate, period.periodStartDate)
          )
        )
    : [];
  const ticketsByEmployee = new Map<string, typeof ticketRows>();
  for (const row of ticketRows) {
    const current = ticketsByEmployee.get(row.employeeId) ?? [];
    current.push(row);
    ticketsByEmployee.set(row.employeeId, current);
  }

  const incidentRows = employeeIds.length > 0
    ? await db
        .select()
        .from(incidentLogs)
        .where(
          and(
            inArray(incidentLogs.employeeId, employeeIds),
            eq(incidentLogs.isActive, true),
            gte(incidentLogs.incidentDate, period.periodStartDate),
            lte(incidentLogs.incidentDate, period.periodEndDate)
          )
        )
    : [];
  const incidentsByEmployee = new Map<string, typeof incidentRows>();
  for (const row of incidentRows) {
    const current = incidentsByEmployee.get(row.employeeId) ?? [];
    current.push(row);
    incidentsByEmployee.set(row.employeeId, current);
  }

  const adjustmentRows = await db
    .select()
    .from(payrollAdjustments)
    .where(eq(payrollAdjustments.periodId, parsed.data.periodId));
  const adjustmentsByEmployee = new Map<string, typeof adjustmentRows>();
  for (const row of adjustmentRows) {
    const current = adjustmentsByEmployee.get(row.employeeId) ?? [];
    current.push(row);
    adjustmentsByEmployee.set(row.employeeId, current);
  }

  const computedRows: Array<{
    snapshot: typeof payrollEmployeeSnapshots.$inferInsert;
    result: typeof payrollResults.$inferInsert;
  }> = [];
  const missingManagerialKpi: string[] = [];

  for (const employee of employeeRows) {
    const activeEmploymentDays = resolveActiveEmploymentDays(employee.startDate, periodStartDate, periodEndDate);
    if (activeEmploymentDays <= 0) continue;

    const divisionSnapshot = await resolveDivisionSnapshot(
      employee.id,
      periodStartDate,
      employee.divisionId,
      employee.divisionName
    );
    const positionSnapshot = await resolvePositionSnapshot(
      employee.id,
      periodStartDate,
      employee.positionId,
      employee.positionName
    );
    const gradeSnapshot = await resolveGradeSnapshot(
      employee.id,
      periodStartDate,
      employee.gradeId,
      employee.gradeName
    );
    const scheduledWorkDays = await resolveScheduledWorkDays(employee.id, periodStartDate, periodEndDate);

    const salaryConfig = salaryConfigMap.get(employee.id);
    const baseSalaryAmount = toNumber(salaryConfig?.baseSalaryAmount)
      || (employee.payrollStatus === "TRAINING" ? GAJI_TRAINING_DEFAULT : GAJI_POKOK_REGULER_DEFAULT);
    const gradeCompensation = gradeSnapshot.gradeSnapshotId
      ? gradeCompensationMap.get(gradeSnapshot.gradeSnapshotId)
      : undefined;
    const gradeAllowanceAmount = toNumber(salaryConfig?.gradeAllowanceAmount)
      || toNumber(gradeCompensation?.allowanceAmount);
    const tenureAllowanceAmount = resolveTenureAllowanceAmount(
      employee.trainingGraduationDate,
      periodEndDate
    );
    const fulltimeBonusAmount = toNumber(salaryConfig?.fulltimeBonusAmount);

    const performance = performanceMap.get(employee.id);
    const managerialKpi = managerialKpiMap.get(employee.id);
    const employeeTickets = ticketsByEmployee.get(employee.id) ?? [];
    const approvedUnpaidLeaveDays = employeeTickets
      .filter((ticket) => ticket.payrollImpact === "UNPAID")
      .reduce(
        (sum, ticket) => sum + countOverlapDays(ticket.startDate, ticket.endDate, periodStartDate, periodEndDate),
        0
      );
    const approvedPaidLeaveDays = employeeTickets
      .filter((ticket) => ticket.payrollImpact === "PAID_QUOTA_MONTHLY" || ticket.payrollImpact === "PAID_QUOTA_ANNUAL")
      .reduce(
        (sum, ticket) => sum + countOverlapDays(ticket.startDate, ticket.endDate, periodStartDate, periodEndDate),
        0
      );

    const employeeIncidents = incidentsByEmployee.get(employee.id) ?? [];
    const incidentDeductionAmount = roundCurrency(
      employeeIncidents.reduce((sum, incident) => sum + toNumber(incident.payrollDeduction), 0)
    );
    const spPenaltyMultiplier = resolveSpPenaltyMultiplier(employeeIncidents.map((incident) => incident.incidentType));
    const hasLateIncident = employeeIncidents.some((incident) => incident.incidentType === "TELAT");

    const employeeAdjustments = adjustmentsByEmployee.get(employee.id) ?? [];
    const manualAdjustmentAmount = roundCurrency(
      employeeAdjustments.reduce((sum, adjustment) => {
        const signedAmount = toNumber(adjustment.amount)
          * (adjustment.adjustmentType === "ADDITION" ? 1 : -1);
        return sum + signedAmount;
      }, 0)
    );

    const hasApprovedAbsence = approvedUnpaidLeaveDays + approvedPaidLeaveDays > 0;
    const teamworkPerformancePercent =
      performance && toNumber(performance.totalTargetPoints) > 0
        ? (toNumber(performance.totalApprovedPoints) / toNumber(performance.totalTargetPoints)) * 100
        : 0;
    const performancePercent =
      employee.employeeGroup === "MANAGERIAL"
        ? toNumber(managerialKpi?.performancePercent)
        : teamworkPerformancePercent;
    const performanceBonusByGrade = resolveTieredBonusAmount(
      performancePercent,
      toNumber(gradeCompensation?.bonusKinerja80),
      toNumber(gradeCompensation?.bonusKinerja90),
      toNumber(gradeCompensation?.bonusKinerja100)
    );
    const teamBonusByGrade = resolveTieredBonusAmount(
      performancePercent,
      toNumber(gradeCompensation?.bonusKinerjaTeam80),
      toNumber(gradeCompensation?.bonusKinerjaTeam90),
      toNumber(gradeCompensation?.bonusKinerjaTeam100)
    );
    const disciplineBonusByGrade = resolveTieredBonusAmount(
      performancePercent,
      toNumber(gradeCompensation?.bonusDisiplin80),
      toNumber(gradeCompensation?.bonusDisiplin90),
      toNumber(gradeCompensation?.bonusDisiplin100)
    );
    const achievementBonus140Amount = toNumber(salaryConfig?.achievementBonus140Amount)
      || toNumber(gradeCompensation?.bonusPrestasi140);
    const achievementBonus165Amount = toNumber(salaryConfig?.achievementBonus165Amount)
      || toNumber(gradeCompensation?.bonusPrestasi165);
    const performanceBonusBaseAmount = toNumber(salaryConfig?.performanceBonusBaseAmount)
      || performanceBonusByGrade;
    const disciplineBonusAmount = toNumber(salaryConfig?.disciplineBonusAmount)
      || disciplineBonusByGrade;
    const teamBonusAmount = toNumber(salaryConfig?.teamBonusAmount)
      || teamBonusByGrade;
    const fulltimeEligible = !hasApprovedAbsence;
    const disciplineEligible = fulltimeEligible && !hasLateIncident && performancePercent >= 80;

    if (employee.employeeGroup === "MANAGERIAL" && !managerialKpi) {
      missingManagerialKpi.push(employee.fullName);
      continue;
    }

    const payrollCalc = employee.employeeGroup === "MANAGERIAL"
      ? calculateManagerialPayroll({
          baseSalaryAmount,
          periodDayCount,
          activeEmploymentDays,
          scheduledWorkDays,
          unpaidLeaveDays: approvedUnpaidLeaveDays,
          performancePercent,
          performanceBonusBaseAmount,
          fulltimeBonusAmount,
          disciplineBonusAmount,
          teamBonusAmount,
          fulltimeEligible,
          disciplineEligible,
          spPenaltyMultiplier,
          incidentDeductionAmount,
          manualAdjustmentAmount,
        })
      : calculateTeamworkPayroll({
          payrollStatus: employee.payrollStatus,
          baseSalaryAmount,
          periodDayCount,
          activeEmploymentDays,
          scheduledWorkDays,
          unpaidLeaveDays: approvedUnpaidLeaveDays,
          performancePercent,
          performanceBonusBaseAmount,
          achievementBonus140Amount,
          achievementBonus165Amount,
          fulltimeBonusAmount,
          disciplineBonusAmount,
          teamBonusAmount,
          fulltimeEligible,
          disciplineEligible,
          spPenaltyMultiplier,
          incidentDeductionAmount,
          manualAdjustmentAmount,
        });

    const takeHomePay = roundCurrency(
      payrollCalc.takeHomePay + gradeAllowanceAmount + tenureAllowanceAmount
    );
    const totalAdditionAmount = roundCurrency(
      gradeAllowanceAmount +
        tenureAllowanceAmount +
        payrollCalc.performanceBonusAmount +
        payrollCalc.achievementBonusAmount +
        payrollCalc.fulltimeBonusPaid +
        payrollCalc.disciplineBonusPaid +
        payrollCalc.teamBonusPaid +
        Math.max(manualAdjustmentAmount, 0)
    );
    const totalDeductionAmount = roundCurrency(
      payrollCalc.unpaidLeaveDeductionAmount +
        payrollCalc.incidentDeductionAmount +
        Math.abs(Math.min(manualAdjustmentAmount, 0))
    );

    computedRows.push({
      snapshot: {
        periodId: parsed.data.periodId,
        employeeId: employee.id,
        employeeCodeSnapshot: employee.employeeCode,
        employeeNameSnapshot: employee.fullName,
        branchSnapshotId: employee.branchId,
        branchSnapshotName: employee.branchName,
        divisionSnapshotId: divisionSnapshot.divisionSnapshotId,
        divisionSnapshotName: divisionSnapshot.divisionSnapshotName,
        positionSnapshotId: positionSnapshot.positionSnapshotId,
        positionSnapshotName: positionSnapshot.positionSnapshotName,
        gradeSnapshotId: gradeSnapshot.gradeSnapshotId,
        gradeSnapshotName: gradeSnapshot.gradeSnapshotName,
        employeeGroupSnapshot: employee.employeeGroup,
        employmentStatusSnapshot: employee.employmentStatus,
        payrollStatusSnapshot: employee.payrollStatus,
        baseSalaryAmount: baseSalaryAmount.toFixed(2),
        gradeAllowanceAmount: gradeAllowanceAmount.toFixed(2),
        tenureAllowanceAmount: tenureAllowanceAmount.toFixed(2),
        dailyAllowanceAmount: "0.00",
        performanceBonusBaseAmount: performanceBonusBaseAmount.toFixed(2),
        achievementBonus140Amount: achievementBonus140Amount.toFixed(2),
        achievementBonus165Amount: achievementBonus165Amount.toFixed(2),
        fulltimeBonusAmount: fulltimeBonusAmount.toFixed(2),
        disciplineBonusAmount: disciplineBonusAmount.toFixed(2),
        teamBonusAmount: teamBonusAmount.toFixed(2),
        overtimeRateAmount: "0.00",
        scheduledWorkDays,
        activeEmploymentDays,
      },
      result: {
        periodId: parsed.data.periodId,
        employeeId: employee.id,
        snapshotId: "" as string,
        monthlyPerformanceId: employee.employeeGroup === "TEAMWORK" ? (performance?.id ?? null) : null,
        managerialKpiSummaryId: employee.employeeGroup === "MANAGERIAL" ? (managerialKpi?.id ?? null) : null,
        performancePercent: performancePercent.toFixed(2),
        totalApprovedPoints:
          employee.employeeGroup === "TEAMWORK" ? toNumber(performance?.totalApprovedPoints).toFixed(2) : "0.00",
        totalTargetPoints:
          employee.employeeGroup === "TEAMWORK" ? toNumber(performance?.totalTargetPoints).toFixed(2) : "0.00",
        approvedUnpaidLeaveDays,
        approvedPaidLeaveDays,
        incidentDeductionAmount: payrollCalc.incidentDeductionAmount.toFixed(2),
        spPenaltyMultiplier: spPenaltyMultiplier.toFixed(2),
        manualAdjustmentAmount: manualAdjustmentAmount.toFixed(2),
        baseSalaryPaid: payrollCalc.baseSalaryPaid.toFixed(2),
        gradeAllowancePaid: gradeAllowanceAmount.toFixed(2),
        tenureAllowancePaid: tenureAllowanceAmount.toFixed(2),
        dailyAllowancePaid: "0.00",
        overtimeAmount: "0.00",
        bonusFulltimeAmount: payrollCalc.fulltimeBonusPaid.toFixed(2),
        bonusDisciplineAmount: payrollCalc.disciplineBonusPaid.toFixed(2),
        bonusKinerjaAmount: payrollCalc.performanceBonusAmount.toFixed(2),
        bonusPrestasiAmount: payrollCalc.achievementBonusAmount.toFixed(2),
        bonusTeamAmount: payrollCalc.teamBonusPaid.toFixed(2),
        totalAdditionAmount: totalAdditionAmount.toFixed(2),
        totalDeductionAmount: totalDeductionAmount.toFixed(2),
        takeHomePay: takeHomePay.toFixed(2),
        breakdown: {
          fulltimeEligible,
          disciplineEligible,
          hasLateIncident,
          approvedUnpaidLeaveDays,
          approvedPaidLeaveDays,
          unpaidLeaveDeductionAmount: payrollCalc.unpaidLeaveDeductionAmount,
          incidentDeductionAmount: payrollCalc.incidentDeductionAmount,
          manualAdjustmentAmount,
          scheduledWorkDays,
          activeEmploymentDays,
          performanceSource:
            employee.employeeGroup === "MANAGERIAL" ? "MANAGERIAL_KPI" : "MONTHLY_POINT_PERFORMANCE",
        },
        status: "DRAFT" satisfies PayrollPeriodStatus,
      },
    });
  }

  if (missingManagerialKpi.length > 0) {
    return {
      error: `KPI managerial belum lengkap untuk: ${missingManagerialKpi.slice(0, 5).join(", ")}${missingManagerialKpi.length > 5 ? " dan lainnya" : ""}.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx.delete(payrollResults).where(eq(payrollResults.periodId, parsed.data.periodId));
    await tx.delete(payrollEmployeeSnapshots).where(eq(payrollEmployeeSnapshots.periodId, parsed.data.periodId));

    for (const row of computedRows) {
      const [snapshot] = await tx.insert(payrollEmployeeSnapshots).values(row.snapshot).returning({
        id: payrollEmployeeSnapshots.id,
      });

      await tx.insert(payrollResults).values({
        ...row.result,
        snapshotId: snapshot.id,
      });
    }

    await tx
      .update(payrollPeriods)
      .set({
        status: "DRAFT",
        previewGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, parsed.data.periodId));

    await tx.insert(payrollAuditLogs).values({
      periodId: parsed.data.periodId,
      action: "GENERATE_PREVIEW",
      actorUserId: user.id,
      actorRole: access.role,
      notes: `Preview payroll ${period.periodCode} digenerate.`,
      payload: {
        generatedEmployees: computedRows.length,
      },
    });
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true, generatedEmployees: computedRows.length };
}

export async function finalizePayroll(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = payrollPeriodActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Periode payroll tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const [period] = await db
    .select({
      id: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      periodStartDate: payrollPeriods.periodStartDate,
      periodEndDate: payrollPeriods.periodEndDate,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, parsed.data.periodId))
    .limit(1);

  if (!period) return { error: "Periode payroll tidak ditemukan." };
  if (period.status === "PAID" || period.status === "LOCKED") {
    return { error: "Periode payroll yang sudah paid/locked tidak bisa difinalisasi ulang." };
  }

  const [resultCount] = await db
    .select({ count: count() })
    .from(payrollResults)
    .where(eq(payrollResults.periodId, parsed.data.periodId));

  if (!Number(resultCount?.count ?? 0)) {
    return { error: "Belum ada preview payroll untuk periode ini." };
  }

  const lockableActivities = await db
    .select({ id: dailyActivityEntries.id })
    .from(dailyActivityEntries)
    .where(
      and(
        gte(dailyActivityEntries.workDate, period.periodStartDate),
        lte(dailyActivityEntries.workDate, period.periodEndDate),
        inArray(dailyActivityEntries.status, LOCKABLE_ACTIVITY_STATUSES)
      )
    );

  await db.transaction(async (tx) => {
    await tx
      .update(payrollResults)
      .set({
        status: "FINALIZED",
        finalizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollResults.periodId, parsed.data.periodId));

    await tx
      .update(payrollPeriods)
      .set({
        status: "FINALIZED",
        finalizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, parsed.data.periodId));

    await tx
      .update(monthlyPointPerformances)
      .set({
        status: "LOCKED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(monthlyPointPerformances.periodStartDate, period.periodStartDate),
          eq(monthlyPointPerformances.periodEndDate, period.periodEndDate)
        )
      );

    if (lockableActivities.length > 0) {
      const activityIds = lockableActivities.map((activity) => activity.id);

      await tx
        .update(dailyActivityEntries)
        .set({
          status: "DIKUNCI_PAYROLL",
          lockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(dailyActivityEntries.id, activityIds));

      await tx.insert(dailyActivityApprovalLogs).values(
        activityIds.map((activityId) => ({
          activityEntryId: activityId,
          action: "LOCK_PAYROLL" as const,
          actorUserId: user.id,
          actorRole: access.role,
          notes: `Dikunci payroll ${period.periodCode}`,
        }))
      );
    }

    await tx.insert(payrollAuditLogs).values({
      periodId: parsed.data.periodId,
      action: "FINALIZE",
      actorUserId: user.id,
      actorRole: access.role,
      notes: `Payroll ${period.periodCode} difinalisasi.`,
      payload: {
        lockedActivities: lockableActivities.length,
      },
    });
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}

export async function markPayrollPaid(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = payrollPeriodActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Periode payroll tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const [period] = await db
    .select({
      id: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, parsed.data.periodId))
    .limit(1);

  if (!period) return { error: "Periode payroll tidak ditemukan." };

  const transition = resolvePayrollStatusTransition(period.status as PayrollPeriodStatus, "mark_paid");
  if (!transition.allowed) {
    return { error: transition.reason ?? "Periode payroll tidak bisa ditandai PAID." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(payrollPeriods)
      .set({
        status: transition.nextStatus,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, parsed.data.periodId));

    await tx
      .update(payrollResults)
      .set({
        status: transition.nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(payrollResults.periodId, parsed.data.periodId));

    await tx
      .update(managerialKpiSummaries)
      .set({
        status: "LOCKED",
        updatedAt: new Date(),
      })
      .where(eq(managerialKpiSummaries.periodId, parsed.data.periodId));

    await tx.insert(payrollAuditLogs).values({
      periodId: parsed.data.periodId,
      action: "MARK_PAID",
      actorUserId: user.id,
      actorRole: access.role,
      notes: `Payroll ${period.periodCode} ditandai PAID.`,
      payload: { nextStatus: transition.nextStatus },
    });
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}

export async function lockPayrollPeriod(input: unknown) {
  const access = await assertPayrollWriteAccess();
  if ("error" in access) return access;

  const parsed = payrollPeriodActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Periode payroll tidak valid." };
  }

  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };

  const [period] = await db
    .select({
      id: payrollPeriods.id,
      periodCode: payrollPeriods.periodCode,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, parsed.data.periodId))
    .limit(1);

  if (!period) return { error: "Periode payroll tidak ditemukan." };

  const transition = resolvePayrollStatusTransition(period.status as PayrollPeriodStatus, "lock");
  if (!transition.allowed) {
    return { error: transition.reason ?? "Periode payroll tidak bisa dikunci." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(payrollPeriods)
      .set({
        status: transition.nextStatus,
        lockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, parsed.data.periodId));

    await tx
      .update(payrollResults)
      .set({
        status: transition.nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(payrollResults.periodId, parsed.data.periodId));

    await tx.insert(payrollAuditLogs).values({
      periodId: parsed.data.periodId,
      action: "LOCK",
      actorUserId: user.id,
      actorRole: access.role,
      notes: `Payroll ${period.periodCode} dikunci.`,
      payload: { nextStatus: transition.nextStatus },
    });
  });

  revalidatePath("/payroll");
  revalidatePath("/finance");
  return { success: true };
}
