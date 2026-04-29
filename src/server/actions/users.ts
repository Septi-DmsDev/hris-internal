"use server";

import { db } from "@/lib/db";
import { userRoles, userRoleDivisions } from "@/lib/db/schema/auth";
import { employees } from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import { checkRole, requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@/types";

const MANAGE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];

export type UserRow = {
  userRoleId: string;
  userId: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  employeeName: string | null;
  divisionIds: string[];
  divisionNames: string[];
};

export type UserFormOptions = {
  employees: { id: string; fullName: string }[];
  divisions: { id: string; name: string }[];
};

export async function getUsers(): Promise<UserRow[]> {
  await requireAuth();
  const guard = await checkRole(MANAGE_ROLES);
  if (guard) throw new Error(guard.error);

  const roleRows = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      role: userRoles.role,
      employeeId: userRoles.employeeId,
      employeeName: employees.fullName,
      divisionId: userRoleDivisions.divisionId,
      divisionName: divisions.name,
    })
    .from(userRoles)
    .leftJoin(employees, eq(employees.id, userRoles.employeeId))
    .leftJoin(userRoleDivisions, eq(userRoleDivisions.userRoleId, userRoles.id))
    .leftJoin(divisions, eq(divisions.id, userRoleDivisions.divisionId));

  const grouped = new Map<string, UserRow>();
  for (const row of roleRows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        userRoleId: row.id,
        userId: row.userId,
        email: "",
        role: row.role as UserRole,
        employeeId: row.employeeId,
        employeeName: row.employeeName ?? null,
        divisionIds: [],
        divisionNames: [],
      });
    }
    const entry = grouped.get(row.id)!;
    if (row.divisionId && !entry.divisionIds.includes(row.divisionId)) {
      entry.divisionIds.push(row.divisionId);
      if (row.divisionName) entry.divisionNames.push(row.divisionName);
    }
  }

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((data?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  for (const row of grouped.values()) {
    row.email = emailMap.get(row.userId) ?? row.userId;
  }

  return Array.from(grouped.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function getUserFormOptions(): Promise<UserFormOptions> {
  await requireAuth();
  const guard = await checkRole(MANAGE_ROLES);
  if (guard) throw new Error(guard.error);

  const [empRows, divRows] = await Promise.all([
    db
      .select({ id: employees.id, fullName: employees.fullName })
      .from(employees)
      .where(eq(employees.isActive, true)),
    db
      .select({ id: divisions.id, name: divisions.name })
      .from(divisions)
      .where(eq(divisions.isActive, true)),
  ]);

  return { employees: empRows, divisions: divRows };
}

const inviteSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: z.enum([
    "SUPER_ADMIN", "HRD", "KABAG", "SPV",
    "MANAGERIAL", "FINANCE", "TEAMWORK", "PAYROLL_VIEWER",
  ]),
  employeeId: z.string().uuid().optional().nullable(),
  divisionIds: z.array(z.string().uuid()).optional(),
});

export async function inviteUser(formData: FormData) {
  await requireAuth();
  const guard = await checkRole(MANAGE_ROLES);
  if (guard) return { error: guard.error };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    employeeId: formData.get("employeeId") || null,
    divisionIds: formData.getAll("divisionIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, role, employeeId, divisionIds = [] } = parsed.data;

  const admin = createAdminClient();
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError) return { error: inviteError.message };

  const [newRole] = await db
    .insert(userRoles)
    .values({ userId: inviteData.user.id, role, employeeId: employeeId ?? null })
    .returning({ id: userRoles.id });

  if (divisionIds.length > 0 && DIV_SCOPED_ROLES.includes(role)) {
    await db.insert(userRoleDivisions).values(
      divisionIds.map((divId) => ({ userRoleId: newRole.id, divisionId: divId }))
    );
  }

  revalidatePath("/users");
  return { success: true };
}

const updateSchema = z.object({
  userRoleId: z.string().uuid(),
  role: z.enum([
    "SUPER_ADMIN", "HRD", "KABAG", "SPV",
    "MANAGERIAL", "FINANCE", "TEAMWORK", "PAYROLL_VIEWER",
  ]),
  employeeId: z.string().uuid().optional().nullable(),
  divisionIds: z.array(z.string().uuid()).optional(),
});

export async function updateUser(formData: FormData) {
  await requireAuth();
  const guard = await checkRole(MANAGE_ROLES);
  if (guard) return { error: guard.error };

  const parsed = updateSchema.safeParse({
    userRoleId: formData.get("userRoleId"),
    role: formData.get("role"),
    employeeId: formData.get("employeeId") || null,
    divisionIds: formData.getAll("divisionIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { userRoleId, role, employeeId, divisionIds = [] } = parsed.data;

  await db
    .update(userRoles)
    .set({ role, employeeId: employeeId ?? null })
    .where(eq(userRoles.id, userRoleId));

  await db.delete(userRoleDivisions).where(eq(userRoleDivisions.userRoleId, userRoleId));

  if (divisionIds.length > 0 && DIV_SCOPED_ROLES.includes(role)) {
    await db.insert(userRoleDivisions).values(
      divisionIds.map((divId) => ({ userRoleId, divisionId: divId }))
    );
  }

  revalidatePath("/users");
  return { success: true };
}

export async function removeUserAccess(userRoleId: string) {
  await requireAuth();
  const guard = await checkRole(MANAGE_ROLES);
  if (guard) return { error: guard.error };

  await db.delete(userRoles).where(eq(userRoles.id, userRoleId));
  revalidatePath("/users");
  return { success: true };
}
