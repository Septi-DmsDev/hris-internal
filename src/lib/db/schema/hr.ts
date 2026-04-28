import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./auth";
import { employees } from "./employee";
import { divisions } from "./master";

// ─── Ticketing ────────────────────────────────────────────────────────────────

export const ticketTypeEnum = pgEnum("ticket_type", [
  "CUTI",
  "SAKIT",
  "IZIN",
  "EMERGENCY",
  "SETENGAH_HARI",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "DRAFT",
  "SUBMITTED",
  "AUTO_APPROVED",
  "AUTO_REJECTED",
  "NEED_REVIEW",
  "APPROVED_SPV",
  "APPROVED_HRD",
  "REJECTED",
  "CANCELLED",
  "LOCKED",
]);

export const ticketPayrollImpactEnum = pgEnum("ticket_payroll_impact", [
  "UNPAID",
  "PAID_QUOTA_MONTHLY",
  "PAID_QUOTA_ANNUAL",
]);

export const attendanceTickets = pgTable("attendance_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  ticketType: ticketTypeEnum("ticket_type").notNull(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  daysCount: integer("days_count").notNull().default(1),
  reason: text("reason").notNull(),
  attachmentUrl: text("attachment_url"),
  status: ticketStatusEnum("status").notNull().default("DRAFT"),
  payrollImpact: ticketPayrollImpactEnum("payroll_impact"),
  reviewNotes: text("review_notes"),
  approvedByUserId: uuid("approved_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedByUserId: uuid("rejected_by_user_id"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

// ─── Leave Quota ──────────────────────────────────────────────────────────────

export const leaveQuotas = pgTable("leave_quotas", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  monthlyQuotaTotal: integer("monthly_quota_total").notNull().default(12),
  monthlyQuotaUsed: integer("monthly_quota_used").notNull().default(0),
  annualQuotaTotal: integer("annual_quota_total").notNull().default(3),
  annualQuotaUsed: integer("annual_quota_used").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

// ─── Review Karyawan ──────────────────────────────────────────────────────────

export const reviewStatusEnum = pgEnum("review_status", [
  "DRAFT",
  "SUBMITTED",
  "VALIDATED",
  "LOCKED",
]);

export const employeeReviews = pgTable("employee_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  reviewerEmployeeId: uuid("reviewer_employee_id").references(() => employees.id, { onDelete: "set null" }),
  periodStartDate: date("period_start_date", { mode: "date" }).notNull(),
  periodEndDate: date("period_end_date", { mode: "date" }).notNull(),
  // 5 aspek review — skor 1-5 masing-masing
  sopQualityScore: integer("sop_quality_score"),       // SOP & Kualitas Kerja (25%)
  instructionScore: integer("instruction_score"),       // Pemahaman Instruksi (15%)
  attendanceDisciplineScore: integer("attendance_discipline_score"), // Absensi & Disiplin (20%)
  initiativeTeamworkScore: integer("initiative_teamwork_score"),     // Inisiatif, Teamwork & 5R (20%)
  processMissScore: integer("process_miss_score"),     // Miss Proses & Tanggung Jawab (20%)
  totalScore: numeric("total_score", { precision: 5, scale: 2 }),
  category: varchar("category", { length: 30 }), // Sangat Baik / Baik / Cukup / Kurang / Buruk
  status: reviewStatusEnum("status").notNull().default("DRAFT"),
  reviewNotes: text("review_notes"),
  validatedByUserId: uuid("validated_by_user_id"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

// ─── Incident Log ─────────────────────────────────────────────────────────────

export const incidentTypeEnum = pgEnum("incident_type", [
  "KOMPLAIN",
  "MISS_PROSES",
  "TELAT",
  "AREA_KOTOR",
  "PELANGGARAN",
  "SP1",
  "SP2",
  "PENGHARGAAN",
]);

export const incidentImpactEnum = pgEnum("incident_impact", [
  "REVIEW_ONLY",
  "PAYROLL_POTENTIAL",
  "NONE",
]);

export const incidentLogs = pgTable("incident_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
  incidentType: incidentTypeEnum("incident_type").notNull(),
  incidentDate: date("incident_date", { mode: "date" }).notNull(),
  description: text("description").notNull(),
  impact: incidentImpactEnum("impact").notNull().default("REVIEW_ONLY"),
  payrollDeduction: numeric("payroll_deduction", { precision: 12, scale: 2 }),
  recordedByUserId: uuid("recorded_by_user_id").notNull(),
  recordedByRole: userRoleEnum("recorded_by_role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttendanceTicket = typeof attendanceTickets.$inferSelect;
export type NewAttendanceTicket = typeof attendanceTickets.$inferInsert;
export type LeaveQuota = typeof leaveQuotas.$inferSelect;
export type NewLeaveQuota = typeof leaveQuotas.$inferInsert;
export type EmployeeReview = typeof employeeReviews.$inferSelect;
export type NewEmployeeReview = typeof employeeReviews.$inferInsert;
export type IncidentLog = typeof incidentLogs.$inferSelect;
export type NewIncidentLog = typeof incidentLogs.$inferInsert;
