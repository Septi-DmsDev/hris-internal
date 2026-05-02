"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { createClient } from "@/lib/supabase/server";

export type AccountSettingsData = {
  userEmail: string;
  username: string;
  phoneNumber: string;
  employeeCode: string | null;
  fullName: string | null;
};

export async function getMyAccountSettings(): Promise<AccountSettingsData> {
  await requireAuth();
  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();

  let username = "";
  let phoneNumber = "";
  let employeeCode: string | null = null;
  let fullName: string | null = null;

  if (roleRow.employeeId) {
    const [employee] = await db
      .select({
        employeeCode: employees.employeeCode,
        fullName: employees.fullName,
        nickname: employees.nickname,
        phoneNumber: employees.phoneNumber,
      })
      .from(employees)
      .where(eq(employees.id, roleRow.employeeId))
      .limit(1);

    if (employee) {
      username = employee.nickname ?? "";
      phoneNumber = employee.phoneNumber ?? "";
      employeeCode = employee.employeeCode;
      fullName = employee.fullName;
    }
  }

  if (!username) {
    username = typeof user?.user_metadata?.username === "string" ? user.user_metadata.username : "";
  }

  return {
    userEmail: user?.email ?? "",
    username,
    phoneNumber,
    employeeCode,
    fullName,
  };
}

const updateAccountSchema = z.object({
  username: z.string().trim().min(2, "Username minimal 2 karakter").max(100, "Username maksimal 100 karakter"),
  phoneNumber: z.string().trim().max(30, "Nomor HP maksimal 30 karakter").optional(),
  email: z.string().trim().email("Email tidak valid"),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.newPassword && value.newPassword.length < 8) {
    ctx.addIssue({
      code: "custom",
      path: ["newPassword"],
      message: "Password baru minimal 8 karakter",
    });
  }

  if ((value.newPassword ?? "") !== (value.confirmPassword ?? "")) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Konfirmasi password tidak sama",
    });
  }
});

export async function updateMyAccountSettings(formData: FormData) {
  await requireAuth();
  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();

  const parsed = updateAccountSchema.safeParse({
    username: formData.get("username"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    email: formData.get("email"),
    newPassword: formData.get("newPassword") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { username, phoneNumber, email, newPassword } = parsed.data;

  if (roleRow.employeeId) {
    await db
      .update(employees)
      .set({
        nickname: username,
        phoneNumber: phoneNumber || null,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, roleRow.employeeId));
  }

  const currentEmail = user?.email ?? "";
  const authPayload: {
    email?: string;
    password?: string;
    data?: Record<string, string>;
  } = {
    data: { username },
  };

  if (email !== currentEmail) {
    authPayload.email = email;
  }

  if (newPassword) {
    authPayload.password = newPassword;
  }

  const shouldUpdateAuth = Boolean(authPayload.email || authPayload.password || authPayload.data);
  if (shouldUpdateAuth) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser(authPayload);
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/settings");
  revalidatePath("/me");
  revalidatePath("/me/profile");

  if (email !== currentEmail) {
    return { success: "Profil tersimpan. Cek email untuk konfirmasi perubahan alamat email." };
  }

  return { success: "Profil akun berhasil diperbarui." };
}
