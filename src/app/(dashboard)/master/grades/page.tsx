import { getGrades } from "@/server/actions/grades";
import GradesTable, { type GradeRow } from "./GradesTable";

export default async function GradesPage() {
  const data = await getGrades();

  const rows: GradeRow[] = data.map((grade) => ({
    id: grade.id,
    name: grade.name,
    code: grade.code,
    description: grade.description,
    isActive: grade.isActive,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Master Grade</h1>
      <GradesTable data={rows} />
    </div>
  );
}
