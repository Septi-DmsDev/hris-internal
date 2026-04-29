import { USER_ROLES } from "@/types";
import type { UserRole } from "@/types";

export type Permission =
  | "master:read" | "master:write" | "master:delete"
  | "employees:read" | "employees:write" | "employees:delete"
  | "performance:input" | "performance:approve" | "performance:override"
  | "reviews:read" | "reviews:write"
  | "tickets:read" | "tickets:write" | "tickets:approve"
  | "payroll:read" | "payroll:write" | "payroll:finalize"
  | "settings:read" | "settings:write";

export function isUserRole(r: unknown): r is UserRole {
  return typeof r === "string" && (USER_ROLES as readonly string[]).includes(r);
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "master:read", "master:write", "master:delete",
    "employees:read", "employees:write", "employees:delete",
    "performance:input", "performance:approve", "performance:override",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:write", "tickets:approve",
    "payroll:read", "payroll:write", "payroll:finalize",
    "settings:read", "settings:write",
  ],
  HRD: [
    "master:read", "master:write",
    "employees:read", "employees:write",
    "performance:override",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:write", "tickets:approve",
    "payroll:read",
    "settings:read",
  ],
  KABAG: [
    "master:read",
    "employees:read",
    "performance:approve",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:write",
    "payroll:read",
  ],
  FINANCE: [
    "employees:read",
    "payroll:read", "payroll:write", "payroll:finalize",
    "settings:read",
  ],
  SPV: [
    "master:read",
    "employees:read",
    "performance:approve",
    "reviews:read", "reviews:write",
    "tickets:read", "tickets:write",
    "payroll:read",
  ],
  TEAMWORK: [
    "performance:input",
    "tickets:read", "tickets:write",
  ],
  MANAGERIAL: [
    "employees:read",
    "reviews:read",
    "tickets:read", "tickets:write",
    "payroll:read",
  ],
  PAYROLL_VIEWER: [
    "payroll:read",
  ],
};

export function canAccess(role: UserRole, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requireRole(
  userRole: UserRole,
  requiredRole: UserRole | UserRole[]
): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole);
}
