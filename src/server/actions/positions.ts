"use server";

import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema/master";
import { positionSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPositions() {
  return db.select().from(positions).orderBy(positions.name);
}

export async function createPosition(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    employeeGroup: formData.get("employeeGroup")?.toString() ?? "",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(positions).values(parsed.data);
  revalidatePath("/master/positions");
  return { success: true };
}

export async function updatePosition(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    employeeGroup: formData.get("employeeGroup")?.toString() ?? "",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.update(positions).set({ ...parsed.data, updatedAt: new Date() }).where(eq(positions.id, id));
  revalidatePath("/master/positions");
  return { success: true };
}

export async function deletePosition(id: string) {
  await requireAuth();
  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/master/positions");
  return { success: true };
}
