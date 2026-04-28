export type EmployeeGroup = "MANAGERIAL" | "TEAMWORK";

export type EmploymentStatus =
  | "TRAINING"
  | "REGULER"
  | "DIALIHKAN_TRAINING"
  | "TIDAK_LOLOS"
  | "NONAKTIF"
  | "RESIGN";

export type PayrollStatus =
  | "TRAINING"
  | "REGULER"
  | "FINAL_PAYROLL"
  | "NONAKTIF";

export type PayrollPeriodStatus =
  | "OPEN"
  | "DATA_REVIEW"
  | "DRAFT"
  | "FINALIZED"
  | "PAID"
  | "LOCKED";

export type ActivityStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "DITOLAK_SPV"
  | "REVISI_TW"
  | "DIAJUKAN_ULANG"
  | "DISETUJUI_SPV"
  | "OVERRIDE_HRD"
  | "DIKUNCI_PAYROLL";

export type TicketStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "AUTO_APPROVED"
  | "AUTO_REJECTED"
  | "NEED_REVIEW"
  | "APPROVED_SPV"
  | "APPROVED_HRD"
  | "REJECTED"
  | "CANCELLED"
  | "LOCKED";

export type TicketType = "CUTI" | "SAKIT" | "IZIN" | "EMERGENCY" | "SETENGAH_HARI";

export const USER_ROLES = [
  "SUPER_ADMIN",
  "HRD",
  "FINANCE",
  "SPV",
  "TEAMWORK",
  "MANAGERIAL",
  "PAYROLL_VIEWER",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
