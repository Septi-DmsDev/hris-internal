import type { PayrollPeriodStatus, UserRole } from "@/types";
import type { AdjustmentCategory } from "@/lib/validations/payroll";
import type { PayrollAdjustmentType } from "@/types";

const PAYROLL_DETAIL_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "FINANCE", "PAYROLL_VIEWER"];

export function canReadPayrollEmployeeDetail(
  role: UserRole,
  viewerEmployeeId: string | null,
  targetEmployeeId: string
) {
  if (PAYROLL_DETAIL_READ_ROLES.includes(role)) {
    return true;
  }

  return viewerEmployeeId === targetEmployeeId;
}

export function isRecurringAdjustmentCategory(category: AdjustmentCategory) {
  return category === "BPJS" || category === "TRANSPORT";
}

export function resolveAdjustmentTypeForCategory(category: AdjustmentCategory): PayrollAdjustmentType {
  return category === "MANUAL_ADDITION" || category === "TRANSPORT" ? "ADDITION" : "DEDUCTION";
}

export function getAdjustmentCategoryFromReason(reason: string) {
  return reason.split("::")[0] ?? "";
}

export function isRecurringAdjustmentReason(reason: string) {
  const category = getAdjustmentCategoryFromReason(reason);
  return category === "BPJS" || category === "TRANSPORT";
}

export function shouldAutoGeneratePayrollPreview(canManage: boolean, status: PayrollPeriodStatus | string | null) {
  return canManage && !!status && !["FINALIZED", "PAID", "LOCKED"].includes(status);
}
