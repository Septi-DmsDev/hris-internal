"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { userRoles } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";

export type LoginActionState = {
  error?: string;
};

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+62")) return cleaned.slice(1); // +628xx → 628xx
  if (cleaned.startsWith("08")) return "62" + cleaned.slice(1); // 08xx → 628xx
  return cleaned;
}

function looksLikePhone(value: string): boolean {
  return /^[0-9+][\d\s\-().]{7,17}$/.test(value.trim());
}

async function resolveIdentifierToEmail(identifier: string): Promise<string | null> {
  // Sudah berbentuk email
  if (identifier.includes("@")) return identifier;

  // Nomor telepon — cari lewat employees.phone_number
  if (looksLikePhone(identifier)) {
    const normalized = normalizePhone(identifier);
    const candidates = Array.from(new Set([normalized, identifier.trim()]));

    for (const candidate of candidates) {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.phoneNumber, candidate))
        .limit(1);

      if (!emp) continue;

      const [roleRow] = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.employeeId, emp.id))
        .limit(1);

      if (!roleRow) return null;

      const admin = createAdminClient();
      const { data } = await admin.auth.admin.getUserById(roleRow.userId);
      return data?.user?.email ?? null;
    }

    return null;
  }

  // Username — bentuk email internal (konsisten dengan logika import)
  const base = identifier.trim().toLowerCase().replace(/\s+/g, ".");
  return `${base}@hris.internal`;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const raw = {
    identifier: formData.get("identifier")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = await resolveIdentifierToEmail(parsed.data.identifier);
  if (!email) {
    return { error: "Akun tidak ditemukan. Periksa no. telepon yang digunakan." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Username, email, atau no. telepon yang dimasukkan salah, atau password tidak cocok." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[logoutAction] signOut failed:", error.message);
  }
  redirect("/login");
}
