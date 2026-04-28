"use server";

import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import {
  divisionPointTargetRules,
  pointCatalogEntries,
  pointCatalogVersions,
} from "@/lib/db/schema/point";
import {
  checkRole,
  getCurrentUserRole,
  requireAuth,
} from "@/lib/auth/session";
import {
  pointCatalogSyncSchema,
  type PointCatalogSyncInput,
} from "@/lib/validations/point";
import { parseMasterPointWorkbook } from "@/server/point-engine/parse-master-point-workbook";
import {
  getActivePointCatalogVersion,
  getDivisionTargetRulesByVersion,
  getPointCatalogEntriesByVersion,
} from "@/server/services/point-catalog-service";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type CatalogEntryRow = {
  id: string;
  divisionName: string;
  externalCode: string | null;
  workName: string;
  pointValue: string;
  unitDescription: string | null;
};

export async function getPointCatalogOverview() {
  await requireAuth();
  const role = await getCurrentUserRole();
  const canManageCatalog = role === "HRD" || role === "SUPER_ADMIN";

  const versions = await db
    .select()
    .from(pointCatalogVersions)
    .orderBy(desc(pointCatalogVersions.importedAt));

  const activeVersion = (await getActivePointCatalogVersion()) ?? versions[0] ?? null;

  if (!activeVersion) {
    return {
      canManageCatalog,
      versions: [],
      activeVersion: null,
      entrySummary: { totalEntries: 0, totalDivisions: 0 },
      resolvedTargets: [] as Array<{
        divisionName: string;
        targetPoints: number;
        source: "DEFAULT" | "OVERRIDE";
      }>,
      latestEntries: [] as CatalogEntryRow[],
    };
  }

  const [entries, rules] = await Promise.all([
    getPointCatalogEntriesByVersion(activeVersion.id),
    getDivisionTargetRulesByVersion(activeVersion.id),
  ]);

  const defaultRule = rules.find((rule) => rule.isDefault);
  const overrideMap = new Map(
    rules
      .filter((rule) => !rule.isDefault)
      .map((rule) => [rule.divisionName.toUpperCase(), rule.targetPoints])
  );

  const divisions = [...new Set(entries.map((entry) => entry.divisionName.toUpperCase()))].sort();
  const resolvedTargets = divisions.map((divisionName) => {
    const targetPoints = overrideMap.get(divisionName) ?? defaultRule?.targetPoints ?? 0;
    return {
      divisionName,
      targetPoints,
      source: overrideMap.has(divisionName) ? ("OVERRIDE" as const) : ("DEFAULT" as const),
    };
  });

  return {
    canManageCatalog,
    versions,
    activeVersion,
    entrySummary: {
      totalEntries: entries.length,
      totalDivisions: divisions.length,
    },
    resolvedTargets,
    latestEntries: entries.slice(0, 250),
  };
}

export async function syncPointCatalogFromWorkbook(input: unknown) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const parsed = pointCatalogSyncSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input sinkronisasi tidak valid." };
  }

  const syncInput = parsed.data as PointCatalogSyncInput;
  let workbookBuffer: Buffer;
  try {
    workbookBuffer = await readFile(syncInput.workbookPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { error: "Workbook tidak ditemukan pada path yang diberikan." };
    }
    throw error;
  }
  const parsedWorkbook = parseMasterPointWorkbook({
    buffer: workbookBuffer,
    versionCode: syncInput.versionCode,
    effectiveStartDate: syncInput.effectiveStartDate.toISOString().slice(0, 10),
    sourceFileName: syncInput.workbookPath.split(/[/\\]/).pop(),
  });

  try {
    await db.transaction(async (tx) => {
      if (syncInput.activateVersion) {
        await tx
          .update(pointCatalogVersions)
          .set({
            status: "ARCHIVED",
            updatedAt: new Date(),
            effectiveEndDate: syncInput.effectiveStartDate,
          })
          .where(eq(pointCatalogVersions.status, "ACTIVE"));
      }

      const [version] = await tx
        .insert(pointCatalogVersions)
        .values({
          code: parsedWorkbook.version.code,
          sourceFileName: parsedWorkbook.version.sourceFileName,
          notes: syncInput.notes,
          status: syncInput.activateVersion ? "ACTIVE" : "DRAFT",
          effectiveStartDate: syncInput.effectiveStartDate,
        })
        .returning({ id: pointCatalogVersions.id });

      await tx.insert(divisionPointTargetRules).values(
        parsedWorkbook.targetRules.map((rule) => ({
          versionId: version.id,
          divisionCode: rule.divisionCode,
          divisionName: rule.divisionName,
          targetPoints: rule.targetPoints,
          isDefault: rule.isDefault,
        }))
      );

      await tx.insert(pointCatalogEntries).values(
        parsedWorkbook.entries.map((entry) => ({
          versionId: version.id,
          divisionCode: entry.divisionCode,
          divisionName: entry.divisionName,
          externalRowNumber: entry.externalRowNumber,
          externalCode: entry.externalCode,
          workName: entry.workName,
          pointValue: entry.pointValue,
          unitDescription: entry.unitDescription,
        }))
      );
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { error: "Kode versi katalog sudah ada. Gunakan kode versi lain." };
    }
    throw error;
  }

  revalidatePath("/performance");
  return {
    success: true,
    importedVersionCode: parsedWorkbook.version.code,
    importedEntries: parsedWorkbook.entries.length,
    importedDivisions: parsedWorkbook.discoveredDivisions.length,
  };
}
