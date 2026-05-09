"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoleDivisions, userRoles } from "@/lib/db/schema/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type RevokeEmployeeAccessResult = {
  hadAccess: boolean;
  roleRevoked: boolean;
  authBanned: boolean;
};

export async function revokeEmployeeSystemAccess(employeeId: string): Promise<RevokeEmployeeAccessResult> {
  const [roleRow] = await db
    .select({ id: userRoles.id, userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.employeeId, employeeId))
    .limit(1);

  if (!roleRow) {
    return {
      hadAccess: false,
      roleRevoked: false,
      authBanned: false,
    };
  }

  await db.transaction(async (tx) => {
    await tx.delete(userRoleDivisions).where(eq(userRoleDivisions.userRoleId, roleRow.id));
    await tx.delete(userRoles).where(eq(userRoles.id, roleRow.id));
  });

  let authBanned = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(roleRow.userId, {
      ban_duration: "876000h",
    });
    authBanned = !error;
  } catch {
    authBanned = false;
  }

  return {
    hadAccess: true,
    roleRevoked: true,
    authBanned,
  };
}
