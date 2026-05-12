import { getPointCatalogOverview } from "@/server/actions/point-catalog";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import type { UserRole } from "@/types";
import CatalogPoinClient, {
  type PerformanceCatalogEntryRow,
} from "./CatalogPoinClient";

export default async function CatalogPoinPage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const overview = await getPointCatalogOverview();

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
      <CatalogPoinClient
        role={role}
        canManageCatalog={overview.canManageCatalog}
        entries={entryRows}
      />
    </div>
  );
}
