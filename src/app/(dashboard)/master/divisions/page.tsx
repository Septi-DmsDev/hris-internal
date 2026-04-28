import { getDivisions } from "@/server/actions/divisions";
import DivisionsTable, { type DivisionRow } from "./DivisionsTable";

export default async function DivisionsPage() {
  const data = await getDivisions();

  const rows: DivisionRow[] = data.map((division) => ({
    id: division.id,
    name: division.name,
    code: division.code,
    trainingPassPercent: division.trainingPassPercent,
    isActive: division.isActive,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Divisi</h1>
      </div>
      <DivisionsTable data={rows} />
    </div>
  );
}
