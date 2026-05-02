import { getPositions } from "@/server/actions/positions";
import PositionsTable, { type PositionRow } from "./PositionsTable";

export default async function PositionsPage() {
  const data = await getPositions();

  const rows: PositionRow[] = data.map((position) => ({
    id: position.id,
    name: position.name,
    code: position.code,
    employeeGroup: position.employeeGroup,
    isActive: position.isActive,
  }));

  return (
    <div className="space-y-4">
      <PositionsTable data={rows} />
    </div>
  );
}
