import { getBranches } from "@/server/actions/branches";
import { getDivisions } from "@/server/actions/divisions";
import DivisionsTable, { type BranchOption, type DivisionRow } from "./DivisionsTable";

export default async function DivisionsPage() {
  const [divisions, branches] = await Promise.all([getDivisions(), getBranches()]);

  const rows: DivisionRow[] = divisions.map((division) => ({
    id: division.id,
    name: division.name,
    code: division.code,
    trainingPassPercent: division.trainingPassPercent,
    isActive: division.isActive,
    branchId: division.branchId,
  }));
  const branchOptions: BranchOption[] = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Divisi</h1>
      </div>
      <DivisionsTable data={rows} branches={branchOptions} />
    </div>
  );
}
