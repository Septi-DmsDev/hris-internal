"use server";

import { checkRole, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employeeGroupConfigs } from "@/lib/db/schema/master";
import { type EmployeeGroup } from "@/lib/employee-groups";
import { employeeGroupConfigSchema } from "@/lib/validations/master";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const DEFAULT_GROUP_CONFIGS: Array<{
  employeeGroup: EmployeeGroup;
  displayName: string;
  baseSalaryAmount: number;
  legacyAlias: string | null;
  payrollMode: "KPI" | "POINT";
  description: string;
  sortOrder: number;
}> = [
  {
    employeeGroup: "KARYAWAN_TETAP",
    displayName: "Karyawan Tetap",
    baseSalaryAmount: 1200000,
    legacyAlias: "MANAGERIAL",
    payrollMode: "KPI",
    description: "Kelompok KPI/bulanan untuk karyawan tetap.",
    sortOrder: 10,
  },
  {
    employeeGroup: "MITRA_KERJA",
    displayName: "Mitra Kerja",
    baseSalaryAmount: 1200000,
    legacyAlias: "TEAMWORK",
    payrollMode: "POINT",
    description: "Kelompok poin harian reguler.",
    sortOrder: 20,
  },
  {
    employeeGroup: "BORONGAN",
    displayName: "Borongan",
    baseSalaryAmount: 1200000,
    legacyAlias: null,
    payrollMode: "POINT",
    description: "Kelompok poin harian borongan.",
    sortOrder: 30,
  },
  {
    employeeGroup: "TRAINING",
    displayName: "Training",
    baseSalaryAmount: 1000000,
    legacyAlias: null,
    payrollMode: "POINT",
    description: "Kelompok training sebelum lulus reguler.",
    sortOrder: 40,
  },
  {
    employeeGroup: "MANAGERIAL",
    displayName: "Managerial (Legacy)",
    baseSalaryAmount: 1200000,
    legacyAlias: null,
    payrollMode: "KPI",
    description: "Legacy group, dipertahankan untuk kompatibilitas data lama.",
    sortOrder: 90,
  },
  {
    employeeGroup: "TEAMWORK",
    displayName: "Teamwork (Legacy)",
    baseSalaryAmount: 1200000,
    legacyAlias: null,
    payrollMode: "POINT",
    description: "Legacy group, dipertahankan untuk kompatibilitas data lama.",
    sortOrder: 91,
  },
];

async function ensureDefaultEmployeeGroupConfigs() {
  const hasBaseSalaryColumn = await hasEmployeeGroupBaseSalaryColumn();
  const existing = await db
    .select({ employeeGroup: employeeGroupConfigs.employeeGroup })
    .from(employeeGroupConfigs);
  const existingSet = new Set(existing.map((row) => row.employeeGroup));
  const missing = DEFAULT_GROUP_CONFIGS.filter((row) => !existingSet.has(row.employeeGroup));
  if (missing.length === 0) return;
  if (hasBaseSalaryColumn) {
    await db.insert(employeeGroupConfigs).values(
      missing.map((row) => ({
        employeeGroup: row.employeeGroup,
        displayName: row.displayName,
        baseSalaryAmount: row.baseSalaryAmount.toFixed(2),
        legacyAlias: row.legacyAlias,
        payrollMode: row.payrollMode,
        description: row.description,
        sortOrder: row.sortOrder,
        isActive: true,
      }))
    );
    return;
  }

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

async function hasEmployeeGroupBaseSalaryColumn() {
  const rows = await db.execute(sql<{ exists: boolean }>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'employee_group_configs'
        and column_name = 'base_salary_amount'
    ) as "exists"
  `);
  return Boolean(rows[0]?.exists);
}

export async function getEmployeeGroupConfigs() {
  await requireAuth();
  await ensureDefaultEmployeeGroupConfigs();
  const hasBaseSalaryColumn = await hasEmployeeGroupBaseSalaryColumn();
  if (hasBaseSalaryColumn) {
    return db
      .select()
      .from(employeeGroupConfigs)
      .orderBy(asc(employeeGroupConfigs.sortOrder), asc(employeeGroupConfigs.displayName));
  }

  return db
    .select({
      id: employeeGroupConfigs.id,
      employeeGroup: employeeGroupConfigs.employeeGroup,
      displayName: employeeGroupConfigs.displayName,
      baseSalaryAmount: sql<string | null>`null`,
      legacyAlias: employeeGroupConfigs.legacyAlias,
      payrollMode: employeeGroupConfigs.payrollMode,
      description: employeeGroupConfigs.description,
      sortOrder: employeeGroupConfigs.sortOrder,
      isActive: employeeGroupConfigs.isActive,
      createdAt: employeeGroupConfigs.createdAt,
      updatedAt: employeeGroupConfigs.updatedAt,
    })
    .from(employeeGroupConfigs)
    .orderBy(asc(employeeGroupConfigs.sortOrder), asc(employeeGroupConfigs.displayName));
}

export async function updateEmployeeGroupConfig(id: string, formData: FormData) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const raw = {
    employeeGroup: formData.get("employeeGroup")?.toString() ?? "",
    displayName: formData.get("displayName")?.toString() ?? "",
    baseSalaryAmount: formData.get("baseSalaryAmount")?.toString() ?? "",
    legacyAlias: formData.get("legacyAlias")?.toString() || undefined,
    payrollMode: formData.get("payrollMode")?.toString() ?? "",
    description: formData.get("description")?.toString() || undefined,
    sortOrder: formData.get("sortOrder")?.toString() ?? "0",
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = employeeGroupConfigSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data kelompok karyawan tidak valid." };

  const payload = parsed.data;
  const hasBaseSalaryColumn = await hasEmployeeGroupBaseSalaryColumn();

  try {
    const updatePayload = hasBaseSalaryColumn
      ? {
          employeeGroup: payload.employeeGroup,
          displayName: payload.displayName,
          baseSalaryAmount: payload.baseSalaryAmount?.toFixed(2) ?? null,
          legacyAlias: payload.legacyAlias ?? null,
          payrollMode: payload.payrollMode,
          description: payload.description ?? null,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          updatedAt: new Date(),
        }
      : {
          employeeGroup: payload.employeeGroup,
          displayName: payload.displayName,
          legacyAlias: payload.legacyAlias ?? null,
          payrollMode: payload.payrollMode,
          description: payload.description ?? null,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          updatedAt: new Date(),
        };

    const result = await db
      .update(employeeGroupConfigs)
      .set(updatePayload)
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
  revalidatePath("/finance");
  revalidatePath("/payroll");
  return { success: true };
}
