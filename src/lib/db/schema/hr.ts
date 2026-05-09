import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
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

export const attendanceTicketAuditActionEnum = pgEnum("attendance_ticket_audit_action", [
  "APPROVE_SPV",
  "APPROVE_HRD",
  "REJECT_SPV",
  "REJECT_HRD",
]);

export const overtimeTypeEnum = pgEnum("overtime_type", [
  "OVERTIME_1H",
  "OVERTIME_2H",
  "OVERTIME_3H",
  "LEMBUR_FULLDAY",
  "PATCH_ABSENCE_3H",
]);

export const overtimeRequestStatusEnum = pgEnum("overtime_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
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

export const attendanceTicketAuditLogs = pgTable("attendance_ticket_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => attendanceTickets.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  action: attendanceTicketAuditActionEnum("action").notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  actorRole: userRoleEnum("actor_role").notNull(),
  notes: text("notes"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const overtimeRequests = pgTable("overtime_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  requestDate: date("request_date", { mode: "date" }).notNull(),
  overtimeType: overtimeTypeEnum("overtime_type").notNull(),
  overtimeHours: integer("overtime_hours").notNull(),
  breakHours: integer("break_hours").notNull().default(0),
  baseAmount: numeric("base_amount", { precision: 12, scale: 2 }).notNull(),
  mealAmount: numeric("meal_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  periodCode: varchar("period_code", { length: 7 }).notNull(),
  periodStartDate: date("period_start_date", { mode: "date" }).notNull(),
  periodEndDate: date("period_end_date", { mode: "date" }).notNull(),
  reason: text("reason").notNull(),
  status: overtimeRequestStatusEnum("status").notNull().default("PENDING"),
  reviewNotes: text("review_notes"),
  requestedByUserId: uuid("requested_by_user_id").notNull(),
  approvedByUserId: uuid("approved_by_user_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedByUserId: uuid("rejected_by_user_id"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
}, (table) => [
  index("idx_overtime_requests_employee_date").on(table.employeeId, table.requestDate),
  index("idx_overtime_requests_status").on(table.status),
  index("idx_overtime_requests_period_code").on(table.periodCode),
]);

export const overtimeDraftEntries = pgTable("overtime_draft_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  overtimeRequestId: uuid("overtime_request_id").notNull().references(() => overtimeRequests.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  workDate: date("work_date", { mode: "date" }).notNull(),
  jobId: varchar("job_id", { length: 100 }).notNull(),
  workName: varchar("work_name", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  pointValue: numeric("point_value", { precision: 12, scale: 2 }).notNull(),
  totalPoints: numeric("total_points", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
}, (table) => [
  index("idx_overtime_draft_request").on(table.overtimeRequestId),
  index("idx_overtime_draft_employee_date").on(table.employeeId, table.workDate),
]);

// Attendance Records

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "HADIR",
  "ALPA",
  "IZIN",
  "SAKIT",
  "CUTI",
  "OFF",
]);

export const attendancePunctualityStatusEnum = pgEnum("attendance_punctuality_status", [
  "TEPAT_WAKTU",
  "TELAT",
]);

export const attendanceSourceEnum = pgEnum("attendance_source", [
  "MANUAL",
  "FINGERPRINT_ADMS",
]);

export const employeeAttendanceRecords = pgTable("employee_attendance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  attendanceDate: date("attendance_date", { mode: "date" }).notNull(),
  attendanceStatus: attendanceStatusEnum("attendance_status").notNull(),
  checkInTime: time("check_in_time"),
  checkOutTime: time("check_out_time"),
  punctualityStatus: attendancePunctualityStatusEnum("punctuality_status"),
  source: attendanceSourceEnum("source").notNull().default("MANUAL"),
  externalDeviceId: varchar("external_device_id", { length: 120 }),
  externalUserCode: varchar("external_user_code", { length: 120 }),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  recordedByUserId: uuid("recorded_by_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
}, (table) => [
  index("idx_employee_attendance_records_date").on(table.attendanceDate),
  index("idx_employee_attendance_records_source").on(table.source),
  uniqueIndex("employee_attendance_employee_date_uidx").on(table.employeeId, table.attendanceDate),
]);

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
export type AttendanceTicketAuditLog = typeof attendanceTicketAuditLogs.$inferSelect;
export type NewAttendanceTicketAuditLog = typeof attendanceTicketAuditLogs.$inferInsert;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type NewOvertimeRequest = typeof overtimeRequests.$inferInsert;
export type OvertimeDraftEntry = typeof overtimeDraftEntries.$inferSelect;
export type NewOvertimeDraftEntry = typeof overtimeDraftEntries.$inferInsert;
export type EmployeeAttendanceRecord = typeof employeeAttendanceRecords.$inferSelect;
export type NewEmployeeAttendanceRecord = typeof employeeAttendanceRecords.$inferInsert;
export type LeaveQuota = typeof leaveQuotas.$inferSelect;
export type NewLeaveQuota = typeof leaveQuotas.$inferInsert;
export type EmployeeReview = typeof employeeReviews.$inferSelect;
export type NewEmployeeReview = typeof employeeReviews.$inferInsert;
export type IncidentLog = typeof incidentLogs.$inferSelect;
export type NewIncidentLog = typeof incidentLogs.$inferInsert;
