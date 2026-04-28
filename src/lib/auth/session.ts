import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

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

export async function getCurrentUserRoleRow() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [roleRow] = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      role: userRoles.role,
      divisionId: userRoles.divisionId,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  if (!roleRow) {
    redirect("/login");
  }

  return roleRow;
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const roleRow = await getCurrentUserRoleRow();
  return roleRow.role as UserRole;
}
