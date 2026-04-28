"use server";

import { db } from "@/lib/db";
import { positions } from "@/lib/db/schema/master";
import { positionSchema } from "@/lib/validations/master";
import { requireAuth, checkRole } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPositions() {
  await requireAuth();
  return db.select().from(positions).orderBy(positions.name);
}

export async function createPosition(formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    employeeGroup: formData.get("employeeGroup")?.toString() ?? "",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.insert(positions).values(parsed.data);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Data dengan kode ini sudah ada, gunakan kode yang berbeda." };
    if (code === "23503") return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    throw e;
  }

  revalidatePath("/master/positions");
  return { success: true };
}

export async function updatePosition(id: string, formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    code: formData.get("code")?.toString() ?? "",
    employeeGroup: formData.get("employeeGroup")?.toString() ?? "",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const result = await db
      .update(positions)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning({ id: positions.id });

    if (!result.length) return { error: "Data tidak ditemukan." };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Data dengan kode ini sudah ada, gunakan kode yang berbeda." };
    if (code === "23503") return { error: "Data referensi tidak ditemukan atau masih digunakan." };
    throw e;
  }

  revalidatePath("/master/positions");
  return { success: true };
}

export async function deletePosition(id: string) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  try {
    await db.delete(positions).where(eq(positions.id, id));
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Data tidak dapat dihapus karena masih digunakan oleh data lain." };
    throw e;
  }

  revalidatePath("/master/positions");
  return { success: true };
}
