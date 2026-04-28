"use server";

import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema/master";
import { branchSchema } from "@/lib/validations/master";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBranches() {
  return db.select().from(branches).orderBy(branches.name);
}

export async function createBranch(formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    address: formData.get("address")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db.insert(branches).values(parsed.data);
  revalidatePath("/master/branches");
  return { success: true };
}

export async function updateBranch(id: string, formData: FormData) {
  await requireAuth();

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    address: formData.get("address")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db
    .update(branches)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(branches.id, id));

  revalidatePath("/master/branches");
  return { success: true };
}

export async function deleteBranch(id: string) {
  await requireAuth();
  await db.delete(branches).where(eq(branches.id, id));
  revalidatePath("/master/branches");
  return { success: true };
}
