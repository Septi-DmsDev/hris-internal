import type { UserRole } from "@/types";

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
