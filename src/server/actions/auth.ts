"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { redirect } from "next/navigation";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const raw = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email atau password salah" };
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
