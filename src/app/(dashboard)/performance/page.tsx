import { format } from "date-fns";
import { getPointCatalogOverview } from "@/server/actions/point-catalog";
import PerformanceCatalogClient, {
  type PerformanceCatalogEntryRow,
  type PerformanceDivisionTargetRow,
  type PerformanceVersionRow,
} from "./PerformanceCatalogClient";

export default async function PerformancePage() {
  const overview = await getPointCatalogOverview();

  const versionRows: PerformanceVersionRow[] = overview.versions.map((version) => ({
    id: version.id,
    code: version.code,
    status: version.status,
    sourceFileName: version.sourceFileName ?? "-",
    effectiveStartDate: format(version.effectiveStartDate, "yyyy-MM-dd"),
    effectiveEndDate: version.effectiveEndDate
      ? format(version.effectiveEndDate, "yyyy-MM-dd")
      : "-",
    importedAt: format(version.importedAt, "yyyy-MM-dd HH:mm"),
  }));

  const targetRows: PerformanceDivisionTargetRow[] = overview.resolvedTargets.map((rule) => ({
    divisionName: rule.divisionName,
    targetPoints: rule.targetPoints,
    source: rule.source,
  }));

  const entryRows: PerformanceCatalogEntryRow[] = overview.latestEntries.map((entry) => ({
    id: entry.id,
    divisionName: entry.divisionName,
    externalCode: entry.externalCode ?? "-",
    workName: entry.workName,
    pointValue: entry.pointValue,
    unitDescription: entry.unitDescription ?? "-",
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Performance Management
          </h1>
          <p className="text-sm text-slate-500">
            Fondasi Phase 2 untuk katalog poin, target divisi, dan sinkronisasi workbook.
          </p>
        </div>
      </div>

      <PerformanceCatalogClient
        canManageCatalog={overview.canManageCatalog}
        activeVersionCode={overview.activeVersion?.code ?? null}
        totalEntries={overview.entrySummary.totalEntries}
        totalDivisions={overview.entrySummary.totalDivisions}
        versions={versionRows}
        divisionTargets={targetRows}
        entries={entryRows}
      />
    </div>
  );
}
