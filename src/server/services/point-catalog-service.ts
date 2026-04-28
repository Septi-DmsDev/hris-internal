import { db } from "@/lib/db";
import {
  divisionPointTargetRules,
  pointCatalogEntries,
  pointCatalogVersions,
} from "@/lib/db/schema/point";
import { asc, eq } from "drizzle-orm";

export async function getActivePointCatalogVersion() {
  const [activeVersion] = await db
    .select()
    .from(pointCatalogVersions)
    .where(eq(pointCatalogVersions.status, "ACTIVE"))
    .orderBy(asc(pointCatalogVersions.effectiveStartDate))
    .limit(1);

  return activeVersion ?? null;
}

export async function getPointCatalogEntriesByVersion(versionId: string) {
  return db
    .select({
      id: pointCatalogEntries.id,
      versionId: pointCatalogEntries.versionId,
      divisionCode: pointCatalogEntries.divisionCode,
      divisionName: pointCatalogEntries.divisionName,
      externalCode: pointCatalogEntries.externalCode,
      externalRowNumber: pointCatalogEntries.externalRowNumber,
      workName: pointCatalogEntries.workName,
      pointValue: pointCatalogEntries.pointValue,
      unitDescription: pointCatalogEntries.unitDescription,
    })
    .from(pointCatalogEntries)
    .where(eq(pointCatalogEntries.versionId, versionId))
    .orderBy(asc(pointCatalogEntries.divisionName), asc(pointCatalogEntries.externalRowNumber));
}

export async function getDivisionTargetRulesByVersion(versionId: string) {
  return db
    .select()
    .from(divisionPointTargetRules)
    .where(eq(divisionPointTargetRules.versionId, versionId))
    .orderBy(asc(divisionPointTargetRules.divisionName));
}
