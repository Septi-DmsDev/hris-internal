import { getBranches } from "@/server/actions/branches";
import BranchesTable, { type BranchRow } from "./BranchesTable";

export default async function BranchesPage() {
  const data = await getBranches();

  const rows: BranchRow[] = data.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    latitude: branch.latitude != null ? String(branch.latitude) : null,
    longitude: branch.longitude != null ? String(branch.longitude) : null,
    maxAttendanceRadiusMeters: branch.maxAttendanceRadiusMeters,
    isActive: branch.isActive,
  }));

  return (
    <div className="space-y-4">
      <BranchesTable data={rows} />
    </div>
  );
}
