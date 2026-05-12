"use server";

import { checkRole, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employeeGroupConfigs } from "@/lib/db/schema/master";
import { type EmployeeGroup, resolveEmployeeGroupLabel } from "@/lib/employee-groups";
import { employeeGroupConfigSchema } from "@/lib/validations/master";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const DEFAULT_GROUP_CONFIGS: Array<{
  employeeGroup: EmployeeGroup;
  displayName: string;
  legacyAlias: string | null;
  payrollMode: "KPI" | "POINT";
  description: string;
  sortOrder: number;
}> = [
  {
    employeeGroup: "KARYAWAN_TETAP",
    displayName: "Karyawan Tetap",
    legacyAlias: "MANAGERIAL",
    payrollMode: "KPI",
    description: "Kelompok KPI/bulanan untuk karyawan tetap.",
    sortOrder: 10,
  },
  {
    employeeGroup: "MITRA_KERJA",
    displayName: "Mitra Kerja",
    legacyAlias: "TEAMWORK",
    payrollMode: "POINT",
    description: "Kelompok poin harian reguler.",
    sortOrder: 20,
  },
  {
    employeeGroup: "BORONGAN",
    displayName: "Borongan",
    legacyAlias: null,
    payrollMode: "POINT",
    description: "Kelompok poin harian borongan.",
    sortOrder: 30,
  },
  {
    employeeGroup: "TRAINING",
    displayName: "Training",
    legacyAlias: null,
    payrollMode: "POINT",
    description: "Kelompok training sebelum lulus reguler.",
    sortOrder: 40,
  },
  {
    employeeGroup: "MANAGERIAL",
    displayName: "Managerial (Legacy)",
    legacyAlias: null,
    payrollMode: "KPI",
    description: "Legacy group, dipertahankan untuk kompatibilitas data lama.",
    sortOrder: 90,
  },
  {
    employeeGroup: "TEAMWORK",
    displayName: "Teamwork (Legacy)",
    legacyAlias: null,
    payrollMode: "POINT",
    description: "Legacy group, dipertahankan untuk kompatibilitas data lama.",
    sortOrder: 91,
  },
];

async function ensureDefaultEmployeeGroupConfigs() {
  const existing = await db
    .select({ employeeGroup: employeeGroupConfigs.employeeGroup })
    .from(employeeGroupConfigs);
  const existingSet = new Set(existing.map((row) => row.employeeGroup));
  const missing = DEFAULT_GROUP_CONFIGS.filter((row) => !existingSet.has(row.employeeGroup));
  if (missing.length === 0) return;
  await db.insert(employeeGroupConfigs).values(
    missing.map((row) => ({
      employeeGroup: row.employeeGroup,
      displayName: row.displayName,
      legacyAlias: row.legacyAlias,
      payrollMode: row.payrollMode,
      description: row.description,
      sortOrder: row.sortOrder,
      isActive: true,
    }))
  );
}

export async function getEmployeeGroupConfigs() {
  await requireAuth();
  await ensureDefaultEmployeeGroupConfigs();
  return db
    .select()
    .from(employeeGroupConfigs)
    .orderBy(asc(employeeGroupConfigs.sortOrder), asc(employeeGroupConfigs.displayName));
}

export async function updateEmployeeGroupConfig(id: string, formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    employeeGroup: formData.get("employeeGroup")?.toString() ?? "",
    displayName: formData.get("displayName")?.toString() ?? "",
    legacyAlias: formData.get("legacyAlias")?.toString() || undefined,
    payrollMode: formData.get("payrollMode")?.toString() ?? "",
    description: formData.get("description")?.toString() || undefined,
    sortOrder: formData.get("sortOrder")?.toString() ?? "0",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = employeeGroupConfigSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data kelompok karyawan tidak valid." };

  const payload = parsed.data;

  try {
    const result = await db
      .update(employeeGroupConfigs)
      .set({
        employeeGroup: payload.employeeGroup,
        displayName: payload.displayName,
        legacyAlias: payload.legacyAlias ?? null,
        payrollMode: payload.payrollMode,
        description: payload.description ?? null,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
        updatedAt: new Date(),
      })
      .where(eq(employeeGroupConfigs.id, id))
      .returning({ id: employeeGroupConfigs.id });

    if (!result.length) return { error: "Konfigurasi kelompok karyawan tidak ditemukan." };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Kelompok karyawan duplikat pada konfigurasi master." };
    throw e;
  }

  revalidatePath("/master");
  revalidatePath("/master/positions");
  revalidatePath("/employees");
  return { success: true };
}

export function resolveEmployeeGroupMasterLabel(group: EmployeeGroup) {
  const defaultLabel = resolveEmployeeGroupLabel(group);
  if (group === "MANAGERIAL") return `${defaultLabel} (Legacy)`;
  if (group === "TEAMWORK") return `${defaultLabel} (Legacy)`;
  return defaultLabel;
}
