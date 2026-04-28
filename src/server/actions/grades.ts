"use server";

import { db } from "@/lib/db";
import { grades } from "@/lib/db/schema/master";
import { gradeSchema } from "@/lib/validations/master";
import { requireAuth, checkRole } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getGrades() {
  await requireAuth();
  return db.select().from(grades).orderBy(grades.name);
}

export async function createGrade(formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    description: formData.get("description")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.insert(grades).values(parsed.data);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Data dengan kode ini sudah ada, gunakan kode yang berbeda." };
    if (code === "23503") return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    throw e;
  }

  revalidatePath("/master/grades");
  return { success: true };
}

export async function updateGrade(id: string, formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    description: formData.get("description")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await db
      .update(grades)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(grades.id, id))
      .returning({ id: grades.id });

    if (!result.length) return { error: "Data tidak ditemukan." };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Data dengan kode ini sudah ada, gunakan kode yang berbeda." };
    if (code === "23503") return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    throw e;
  }

  revalidatePath("/master/grades");
  return { success: true };
}

export async function deleteGrade(id: string) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  try {
    await db.delete(grades).where(eq(grades.id, id));
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Data tidak dapat dihapus karena masih digunakan oleh data lain." };
    throw e;
  }

  revalidatePath("/master/grades");
  return { success: true };
}
