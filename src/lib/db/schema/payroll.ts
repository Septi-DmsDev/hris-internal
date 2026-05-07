import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./auth";
import { employees, employmentStatusEnum, payrollStatusEnum } from "./employee";
import { branches, divisions, employeeGroupEnum, grades, positions } from "./master";
import { monthlyPointPerformances } from "./point";

export const payrollPeriodStatusEnum = pgEnum("payroll_period_status", [
  "OPEN",
  "DATA_REVIEW",
  "DRAFT",
  "FINALIZED",
  "PAID",
  "LOCKED",
]);

export const payrollAdjustmentTypeEnum = pgEnum("payroll_adjustment_type", [
  "ADDITION",
  "DEDUCTION",
]);

export const managerialKpiStatusEnum = pgEnum("managerial_kpi_status", [
  "DRAFT",
  "VALIDATED",
  "LOCKED",
]);

export const payrollAuditActionEnum = pgEnum("payroll_audit_action", [
  "CREATE_PERIOD",
  "GENERATE_PREVIEW",
  "FINALIZE",
  "MARK_PAID",
  "LOCK",
  "ADD_ADJUSTMENT",
]);

export const employeeSalaryConfigs = pgTable("employee_salary_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .unique()
    .references(() => employees.id, { onDelete: "cascade" }),
  baseSalaryAmount: numeric("base_salary_amount", { precision: 12, scale: 2 }),
  gradeAllowanceAmount: numeric("grade_allowance_amount", { precision: 12, scale: 2 }),
  tenureAllowanceAmount: numeric("tenure_allowance_amount", { precision: 12, scale: 2 }),
  dailyAllowanceAmount: numeric("daily_allowance_amount", { precision: 12, scale: 2 }),
  performanceBonusBaseAmount: numeric("performance_bonus_base_amount", { precision: 12, scale: 2 }),
  achievementBonus140Amount: numeric("achievement_bonus_140_amount", { precision: 12, scale: 2 }),
  achievementBonus165Amount: numeric("achievement_bonus_165_amount", { precision: 12, scale: 2 }),
  fulltimeBonusAmount: numeric("fulltime_bonus_amount", { precision: 12, scale: 2 }),
  disciplineBonusAmount: numeric("discipline_bonus_amount", { precision: 12, scale: 2 }),
  teamBonusAmount: numeric("team_bonus_amount", { precision: 12, scale: 2 }),
  overtimeRateAmount: numeric("overtime_rate_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const gradeCompensationConfigs = pgTable("grade_compensation_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  gradeId: uuid("grade_id")
    .notNull()
    .unique()
    .references(() => grades.id, { onDelete: "cascade" }),
  allowanceAmount: numeric("allowance_amount", { precision: 12, scale: 2 }),
  bonusKinerja80: numeric("bonus_kinerja_80", { precision: 12, scale: 2 }),
  bonusKinerja90: numeric("bonus_kinerja_90", { precision: 12, scale: 2 }),
  bonusKinerja100: numeric("bonus_kinerja_100", { precision: 12, scale: 2 }),
  bonusKinerjaTeam80: numeric("bonus_kinerja_team_80", { precision: 12, scale: 2 }),
  bonusKinerjaTeam90: numeric("bonus_kinerja_team_90", { precision: 12, scale: 2 }),
  bonusKinerjaTeam100: numeric("bonus_kinerja_team_100", { precision: 12, scale: 2 }),
  bonusDisiplin80: numeric("bonus_disiplin_80", { precision: 12, scale: 2 }),
  bonusDisiplin90: numeric("bonus_disiplin_90", { precision: 12, scale: 2 }),
  bonusDisiplin100: numeric("bonus_disiplin_100", { precision: 12, scale: 2 }),
  bonusPrestasi140: numeric("bonus_prestasi_140", { precision: 12, scale: 2 }),
  bonusPrestasi165: numeric("bonus_prestasi_165", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const payrollPeriods = pgTable("payroll_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodCode: varchar("period_code", { length: 7 }).notNull().unique(),
  periodStartDate: date("period_start_date", { mode: "date" }).notNull(),
  periodEndDate: date("period_end_date", { mode: "date" }).notNull(),
  status: payrollPeriodStatusEnum("status").notNull().default("OPEN"),
  notes: text("notes"),
  previewGeneratedAt: timestamp("preview_generated_at", { withTimezone: true }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const managerialKpiSummaries = pgTable("managerial_kpi_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  performancePercent: numeric("performance_percent", { precision: 7, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  status: managerialKpiStatusEnum("status").notNull().default("DRAFT"),
  validatedByUserId: uuid("validated_by_user_id"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
}, (table) => [
  uniqueIndex("managerial_kpi_period_employee_uidx").on(table.periodId, table.employeeId),
]);

export const payrollEmployeeSnapshots = pgTable("payroll_employee_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  employeeCodeSnapshot: varchar("employee_code_snapshot", { length: 50 }).notNull(),
  employeeNameSnapshot: varchar("employee_name_snapshot", { length: 150 }).notNull(),
  branchSnapshotId: uuid("branch_snapshot_id").references(() => branches.id, { onDelete: "set null" }),
  branchSnapshotName: varchar("branch_snapshot_name", { length: 100 }),
  divisionSnapshotId: uuid("division_snapshot_id").references(() => divisions.id, { onDelete: "set null" }),
  divisionSnapshotName: varchar("division_snapshot_name", { length: 100 }).notNull(),
  positionSnapshotId: uuid("position_snapshot_id").references(() => positions.id, { onDelete: "set null" }),
  positionSnapshotName: varchar("position_snapshot_name", { length: 100 }).notNull(),
  gradeSnapshotId: uuid("grade_snapshot_id").references(() => grades.id, { onDelete: "set null" }),
  gradeSnapshotName: varchar("grade_snapshot_name", { length: 50 }),
  employeeGroupSnapshot: employeeGroupEnum("employee_group_snapshot").notNull(),
  employmentStatusSnapshot: employmentStatusEnum("employment_status_snapshot").notNull(),
  payrollStatusSnapshot: payrollStatusEnum("payroll_status_snapshot").notNull(),
  baseSalaryAmount: numeric("base_salary_amount", { precision: 12, scale: 2 }).notNull(),
  gradeAllowanceAmount: numeric("grade_allowance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  tenureAllowanceAmount: numeric("tenure_allowance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dailyAllowanceAmount: numeric("daily_allowance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  performanceBonusBaseAmount: numeric("performance_bonus_base_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  achievementBonus140Amount: numeric("achievement_bonus_140_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  achievementBonus165Amount: numeric("achievement_bonus_165_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  fulltimeBonusAmount: numeric("fulltime_bonus_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  disciplineBonusAmount: numeric("discipline_bonus_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  teamBonusAmount: numeric("team_bonus_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  overtimeRateAmount: numeric("overtime_rate_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  scheduledWorkDays: integer("scheduled_work_days").notNull().default(0),
  activeEmploymentDays: integer("active_employment_days").notNull().default(0),
  snapshotTakenAt: timestamp("snapshot_taken_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payrollResults = pgTable("payroll_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  snapshotId: uuid("snapshot_id")
    .notNull()
    .references(() => payrollEmployeeSnapshots.id, { onDelete: "cascade" }),
  monthlyPerformanceId: uuid("monthly_performance_id").references(() => monthlyPointPerformances.id, {
    onDelete: "set null",
  }),
  managerialKpiSummaryId: uuid("managerial_kpi_summary_id").references(() => managerialKpiSummaries.id, {
    onDelete: "set null",
  }),
  performancePercent: numeric("performance_percent", { precision: 7, scale: 2 }).notNull().default("0"),
  totalApprovedPoints: numeric("total_approved_points", { precision: 14, scale: 2 }).notNull().default("0"),
  totalTargetPoints: numeric("total_target_points", { precision: 14, scale: 2 }).notNull().default("0"),
  approvedUnpaidLeaveDays: integer("approved_unpaid_leave_days").notNull().default(0),
  approvedPaidLeaveDays: integer("approved_paid_leave_days").notNull().default(0),
  incidentDeductionAmount: numeric("incident_deduction_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  spPenaltyMultiplier: numeric("sp_penalty_multiplier", { precision: 5, scale: 2 }).notNull().default("1"),
  manualAdjustmentAmount: numeric("manual_adjustment_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  baseSalaryPaid: numeric("base_salary_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  gradeAllowancePaid: numeric("grade_allowance_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  tenureAllowancePaid: numeric("tenure_allowance_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  dailyAllowancePaid: numeric("daily_allowance_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  overtimeAmount: numeric("overtime_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  bonusFulltimeAmount: numeric("bonus_fulltime_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  bonusDisciplineAmount: numeric("bonus_discipline_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  bonusKinerjaAmount: numeric("bonus_kinerja_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  bonusPrestasiAmount: numeric("bonus_prestasi_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  bonusTeamAmount: numeric("bonus_team_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAdditionAmount: numeric("total_addition_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalDeductionAmount: numeric("total_deduction_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  takeHomePay: numeric("take_home_pay", { precision: 12, scale: 2 }).notNull().default("0"),
  breakdown: jsonb("breakdown").$type<Record<string, unknown>>().notNull().default({}),
  status: payrollPeriodStatusEnum("status").notNull().default("DRAFT"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow().notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const payrollAdjustments = pgTable("payroll_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  adjustmentType: payrollAdjustmentTypeEnum("adjustment_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  appliedByUserId: uuid("applied_by_user_id").notNull(),
  appliedByRole: userRoleEnum("applied_by_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recurringPayrollAdjustments = pgTable("recurring_payroll_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  adjustmentType: payrollAdjustmentTypeEnum("adjustment_type").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  appliedByUserId: uuid("applied_by_user_id").notNull(),
  appliedByRole: userRoleEnum("applied_by_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const payrollAuditLogs = pgTable("payroll_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "set null" }),
  action: payrollAuditActionEnum("action").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  actorRole: userRoleEnum("actor_role").notNull(),
  notes: text("notes"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EmployeeSalaryConfig = typeof employeeSalaryConfigs.$inferSelect;
export type NewEmployeeSalaryConfig = typeof employeeSalaryConfigs.$inferInsert;
export type GradeCompensationConfig = typeof gradeCompensationConfigs.$inferSelect;
export type NewGradeCompensationConfig = typeof gradeCompensationConfigs.$inferInsert;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type NewPayrollPeriod = typeof payrollPeriods.$inferInsert;
export type ManagerialKpiSummary = typeof managerialKpiSummaries.$inferSelect;
export type NewManagerialKpiSummary = typeof managerialKpiSummaries.$inferInsert;
export type PayrollEmployeeSnapshot = typeof payrollEmployeeSnapshots.$inferSelect;
export type NewPayrollEmployeeSnapshot = typeof payrollEmployeeSnapshots.$inferInsert;
export type PayrollResult = typeof payrollResults.$inferSelect;
export type NewPayrollResult = typeof payrollResults.$inferInsert;
export type PayrollAdjustment = typeof payrollAdjustments.$inferSelect;
export type NewPayrollAdjustment = typeof payrollAdjustments.$inferInsert;
export type RecurringPayrollAdjustment = typeof recurringPayrollAdjustments.$inferSelect;
export type NewRecurringPayrollAdjustment = typeof recurringPayrollAdjustments.$inferInsert;
export type PayrollAuditLog = typeof payrollAuditLogs.$inferSelect;
export type NewPayrollAuditLog = typeof payrollAuditLogs.$inferInsert;
