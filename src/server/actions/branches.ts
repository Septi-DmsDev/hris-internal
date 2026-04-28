"use server";

import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema/master";
import { branchSchema } from "@/lib/validations/master";
import { requireAuth, checkRole } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getBranches() {
  await requireAuth();
  return db.select().from(branches).orderBy(branches.name);
}

export async function createBranch(formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    address: formData.get("address")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db.insert(branches).values(parsed.data);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Data dengan kode ini sudah ada, gunakan kode yang berbeda." };
    if (code === "23503") return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    throw e;
  }

  revalidatePath("/master/branches");
  return { success: true };
}

export async function updateBranch(id: string, formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    address: formData.get("address")?.toString() || undefined,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = branchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const result = await db
      .update(branches)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning({ id: branches.id });

    if (!result.length) return { error: "Data tidak ditemukan." };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Data dengan kode ini sudah ada, gunakan kode yang berbeda." };
    if (code === "23503") return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    throw e;
  }

  revalidatePath("/master/branches");
  return { success: true };
}

export async function deleteBranch(id: string) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  try {
    await db.delete(branches).where(eq(branches.id, id));
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Data tidak dapat dihapus karena masih digunakan oleh data lain." };
    throw e;
  }

  revalidatePath("/master/branches");
  return { success: true };
}
