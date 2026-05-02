import { getBranches } from "@/server/actions/branches";
import BranchesTable, { type BranchRow } from "./BranchesTable";

export default async function BranchesPage() {
  const data = await getBranches();

  const rows: BranchRow[] = data.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    isActive: branch.isActive,
  }));

  return (
    <div className="space-y-4">
      <BranchesTable data={rows} />
    </div>
  );
}
