import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import { getBranches } from "@/server/actions/branches";
import { getPointCatalogOverview } from "@/server/actions/point-catalog";
import BranchesTable, { type BranchRow } from "./branches/BranchesTable";
import CatalogPoinClient, {
  type PerformanceCatalogEntryRow,
} from "./catalogpoin/CatalogPoinClient";

export default async function MasterPage() {
  const [roleRow, branches, overview] = await Promise.all([
    getCurrentUserRoleRow(),
    getBranches(),
    getPointCatalogOverview(),
  ]);

  const branchRows: BranchRow[] = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    latitude: branch.latitude != null ? String(branch.latitude) : null,
    longitude: branch.longitude != null ? String(branch.longitude) : null,
    maxAttendanceRadiusMeters: branch.maxAttendanceRadiusMeters,
    isActive: branch.isActive,
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
      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Cabang</TabsTrigger>
          <TabsTrigger value="catalog">Katalog Poin</TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="space-y-4">
          <BranchesTable data={branchRows} />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <CatalogPoinClient
            role={roleRow.role}
            canManageCatalog={overview.canManageCatalog}
            entries={entryRows}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
