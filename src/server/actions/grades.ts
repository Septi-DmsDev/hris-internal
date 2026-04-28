"use server";

import { db } from "@/lib/db";
import { grades } from "@/lib/db/schema/master";
import { gradeSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getGrades() {
  return db.select().from(grades).orderBy(grades.name);
}

export async function createGrade(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    description: formData.get("description")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(grades).values(parsed.data);
  revalidatePath("/master/grades");
  return { success: true };
}

export async function updateGrade(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    description: formData.get("description")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(grades).set({ ...parsed.data, updatedAt: new Date() }).where(eq(grades.id, id));
  revalidatePath("/master/grades");
  return { success: true };
}

export async function deleteGrade(id: string) {
  await requireAuth();
  await db.delete(grades).where(eq(grades.id, id));
  revalidatePath("/master/grades");
  return { success: true };
}
