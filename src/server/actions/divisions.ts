"use server";

import { db } from "@/lib/db";
import { divisions } from "@/lib/db/schema/master";
import { divisionSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getDivisions() {
  return db.select().from(divisions).orderBy(divisions.name);
}

export async function createDivision(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    branchId: formData.get("branchId")?.toString() || undefined,
    trainingPassPercent: formData.get("trainingPassPercent")?.toString() ?? "80",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = divisionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(divisions).values(parsed.data);
  revalidatePath("/master/divisions");
  return { success: true };
}

export async function updateDivision(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    branchId: formData.get("branchId")?.toString() || undefined,
    trainingPassPercent: formData.get("trainingPassPercent")?.toString() ?? "80",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = divisionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(divisions).set({ ...parsed.data, updatedAt: new Date() }).where(eq(divisions.id, id));
  revalidatePath("/master/divisions");
  return { success: true };
}

export async function deleteDivision(id: string) {
  await requireAuth();
  await db.delete(divisions).where(eq(divisions.id, id));
  revalidatePath("/master/divisions");
  return { success: true };
}
