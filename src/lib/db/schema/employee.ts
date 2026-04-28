import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { branches, divisions, employeeGroupEnum, grades, positions } from "./master";

export const employmentStatusEnum = pgEnum("employment_status", [
  "TRAINING",
  "REGULER",
  "DIALIHKAN_TRAINING",
  "TIDAK_LOLOS",
  "NONAKTIF",
  "RESIGN",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
  "TRAINING",
  "REGULER",
  "FINAL_PAYROLL",
  "NONAKTIF",
]);

export const workDayStatusEnum = pgEnum("work_day_status", [
  "KERJA",
  "OFF",
  "CUTI",
  "SAKIT",
  "IZIN",
  "ALPA",
  "SETENGAH_HARI",
]);

export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeCode: varchar("employee_code", { length: 30 }).notNull().unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  photoUrl: text("photo_url"),
  phoneNumber: varchar("phone_number", { length: 30 }),
  address: text("address"),
  startDate: date("start_date", { mode: "date" }).notNull(),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  divisionId: uuid("division_id").notNull().references(() => divisions.id, { onDelete: "restrict" }),
  positionId: uuid("position_id").notNull().references(() => positions.id, { onDelete: "restrict" }),
  jobdesk: varchar("jobdesk", { length: 100 }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
  employeeGroup: employeeGroupEnum("employee_group").notNull(),
  employmentStatus: employmentStatusEnum("employment_status").notNull().default("TRAINING"),
  payrollStatus: payrollStatusEnum("payroll_status").notNull().default("TRAINING"),
  supervisorEmployeeId: uuid("supervisor_employee_id").references((): AnyPgColumn => employees.id, { onDelete: "set null" }),
  trainingGraduationDate: date("training_graduation_date", { mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const employeeDivisionHistories = pgTable("employee_division_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  previousDivisionId: uuid("previous_division_id").references(() => divisions.id, { onDelete: "set null" }),
  newDivisionId: uuid("new_division_id").notNull().references(() => divisions.id, { onDelete: "restrict" }),
  effectiveDate: date("effective_date", { mode: "date" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const employeePositionHistories = pgTable("employee_position_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  previousPositionId: uuid("previous_position_id").references(() => positions.id, { onDelete: "set null" }),
  newPositionId: uuid("new_position_id").notNull().references(() => positions.id, { onDelete: "restrict" }),
  effectiveDate: date("effective_date", { mode: "date" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const employeeGradeHistories = pgTable("employee_grade_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  previousGradeId: uuid("previous_grade_id").references(() => grades.id, { onDelete: "set null" }),
  newGradeId: uuid("new_grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
  effectiveDate: date("effective_date", { mode: "date" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const employeeSupervisorHistories = pgTable("employee_supervisor_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  previousSupervisorEmployeeId: uuid("previous_supervisor_employee_id").references((): AnyPgColumn => employees.id, { onDelete: "set null" }),
  newSupervisorEmployeeId: uuid("new_supervisor_employee_id").references((): AnyPgColumn => employees.id, { onDelete: "set null" }),
  effectiveDate: date("effective_date", { mode: "date" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const employeeStatusHistories = pgTable("employee_status_histories", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  previousEmploymentStatus: employmentStatusEnum("previous_employment_status"),
  newEmploymentStatus: employmentStatusEnum("new_employment_status").notNull(),
  previousPayrollStatus: payrollStatusEnum("previous_payroll_status"),
  newPayrollStatus: payrollStatusEnum("new_payroll_status").notNull(),
  effectiveDate: date("effective_date", { mode: "date" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workSchedules = pgTable("work_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const workScheduleDays = pgTable("work_schedule_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id").notNull().references(() => workSchedules.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  dayStatus: workDayStatusEnum("day_status").notNull().default("KERJA"),
  isWorkingDay: boolean("is_working_day").notNull().default(true),
  startTime: varchar("start_time", { length: 5 }),
  endTime: varchar("end_time", { length: 5 }),
  targetPoints: integer("target_points").notNull().default(12000),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const employeeScheduleAssignments = pgTable("employee_schedule_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  scheduleId: uuid("schedule_id").notNull().references(() => workSchedules.id, { onDelete: "restrict" }),
  effectiveStartDate: date("effective_start_date", { mode: "date" }).notNull(),
  effectiveEndDate: date("effective_end_date", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type EmployeeDivisionHistory = typeof employeeDivisionHistories.$inferSelect;
export type NewEmployeeDivisionHistory = typeof employeeDivisionHistories.$inferInsert;
export type EmployeePositionHistory = typeof employeePositionHistories.$inferSelect;
export type NewEmployeePositionHistory = typeof employeePositionHistories.$inferInsert;
export type EmployeeGradeHistory = typeof employeeGradeHistories.$inferSelect;
export type NewEmployeeGradeHistory = typeof employeeGradeHistories.$inferInsert;
export type EmployeeSupervisorHistory = typeof employeeSupervisorHistories.$inferSelect;
export type NewEmployeeSupervisorHistory = typeof employeeSupervisorHistories.$inferInsert;
export type EmployeeStatusHistory = typeof employeeStatusHistories.$inferSelect;
export type NewEmployeeStatusHistory = typeof employeeStatusHistories.$inferInsert;
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type NewWorkSchedule = typeof workSchedules.$inferInsert;
export type WorkScheduleDay = typeof workScheduleDays.$inferSelect;
export type NewWorkScheduleDay = typeof workScheduleDays.$inferInsert;
export type EmployeeScheduleAssignment = typeof employeeScheduleAssignments.$inferSelect;
export type NewEmployeeScheduleAssignment = typeof employeeScheduleAssignments.$inferInsert;
