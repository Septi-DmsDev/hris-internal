import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userRoles, userRoleDivisions } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

export type RoleRow = {
  id: string;
  userId: string;
  role: string;
  employeeId: string | null;
  divisionIds: string[];
};

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function checkRole(allowed: UserRole[]): Promise<{ error: string } | null> {
  const roleRow = await getCurrentUserRoleRow();
  if (!allowed.includes(roleRow.role as UserRole)) {
    return { error: "Akses ditolak. Hanya HRD dan Super Admin yang dapat melakukan tindakan ini." };
  }
  return null;
}

export async function getCurrentUserRoleRow(): Promise<RoleRow> {
  const user = await getUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      role: userRoles.role,
      employeeId: userRoles.employeeId,
      divisionId: userRoleDivisions.divisionId,
    })
    .from(userRoles)
    .leftJoin(userRoleDivisions, eq(userRoleDivisions.userRoleId, userRoles.id))
    .where(eq(userRoles.userId, user.id));

  if (rows.length === 0) redirect("/login");

  const baseRow = {
    id: rows[0].id,
    userId: rows[0].userId,
    role: rows[0].role,
    employeeId: rows[0].employeeId,
  };
  return {
    ...baseRow,
    divisionIds: rows.map((r) => r.divisionId).filter((id): id is string => id !== null),
  };
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const roleRow = await getCurrentUserRoleRow();
  return roleRow.role as UserRole;
}
