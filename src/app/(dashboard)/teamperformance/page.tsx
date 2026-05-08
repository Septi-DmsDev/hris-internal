import { format } from "date-fns";
import TeamPerformanceClient, { type TeamPerformanceActivityRow, type TeamPerformanceDivisionRow, type TeamPerformanceEmployeeRow } from "./TeamPerformanceClient";
import { getTeamPerformanceWorkspace } from "@/server/actions/performance";

export default async function TeamPerformancePage() {
  const workspace = await getTeamPerformanceWorkspace();

  if ("error" in workspace && workspace.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {workspace.error}
      </div>
    );
  }

  const divisions: TeamPerformanceDivisionRow[] = workspace.divisions.map((division) => ({
    id: division.id,
    name: division.name,
  }));

  const employees: TeamPerformanceEmployeeRow[] = workspace.employees.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    divisionId: employee.divisionId,
  }));

  const approvedActivities: TeamPerformanceActivityRow[] = workspace.approvedActivities.map((entry) => ({
    id: entry.id,
    employeeId: entry.employeeId,
    workDate: format(entry.workDate, "yyyy-MM-dd"),
    submittedAt: entry.submittedAt ? format(entry.submittedAt, "yyyy-MM-dd HH:mm") : "-",
    approvedAt: entry.approvedAt ? format(entry.approvedAt, "yyyy-MM-dd HH:mm") : "-",
    externalCode: entry.externalCode ?? null,
    notes: entry.notes ?? null,
    jobIdSnapshot: entry.jobIdSnapshot ?? null,
    workNameSnapshot: entry.workNameSnapshot,
    quantity: String(entry.quantity),
    pointValueSnapshot: String(entry.pointValueSnapshot),
    totalPoints: String(entry.totalPoints),
    status: entry.status,
  }));

  return (
    <TeamPerformanceClient
      periodStartDate={workspace.periodStartDate ? format(workspace.periodStartDate, "yyyy-MM-dd") : "-"}
      periodEndDate={workspace.periodEndDate ? format(workspace.periodEndDate, "yyyy-MM-dd") : "-"}
      divisions={divisions}
      employees={employees}
      approvedActivities={approvedActivities}
    />
  );
}
