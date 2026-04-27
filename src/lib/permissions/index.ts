// src/lib/permissions/index.ts
import type { UserRole } from "@/types";

type Permission =
  | "master:read" | "master:write" | "master:delete"
  | "employees:read" | "employees:write" | "employees:delete"
  | "performance:input" | "performance:approve" | "performance:override"
  | "reviews:read" | "reviews:write"
  | "tickets:read" | "tickets:write" | "tickets:approve"
  | "payroll:read" | "payroll:write" | "payroll:finalize"
  | "settings:read" | "settings:write";

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
    "tickets:read", "tickets:approve",
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
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requireRole(
  userRole: UserRole,
  requiredRole: UserRole | UserRole[]
): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole);
}
