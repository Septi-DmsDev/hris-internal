import { format } from "date-fns";
import { getOvertimeWorkspace } from "@/server/actions/overtime";
import OvertimeClient, { type OvertimeRow } from "./OvertimeClient";

export default async function OvertimePage() {
  const workspace = await getOvertimeWorkspace();
  if ("error" in workspace) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {workspace.error}
      </div>
    );
  }

  const mapRow = (row: (typeof workspace.myRequests)[number]): OvertimeRow => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeCode: row.employeeCode ?? "-",
    employeeName: row.employeeName ?? "-",
    divisionName: row.divisionName ?? "-",
    requestDate: format(row.requestDate, "yyyy-MM-dd"),
    overtimeType: row.overtimeType,
    overtimePlacement: row.overtimePlacement,
    overtimeHours: row.overtimeHours,
    breakHours: row.breakHours,
    baseAmount: Number(row.baseAmount),
    mealAmount: Number(row.mealAmount),
    totalAmount: Number(row.totalAmount),
    periodCode: row.periodCode,
    reason: row.reason,
    status: row.status,
    reviewNotes: row.reviewNotes ?? null,
    approvedAt: row.approvedAt ? format(row.approvedAt, "yyyy-MM-dd HH:mm") : null,
    rejectedAt: row.rejectedAt ? format(row.rejectedAt, "yyyy-MM-dd HH:mm") : null,
    createdAt: format(row.createdAt, "yyyy-MM-dd HH:mm"),
    draftTotalPoints: row.draftTotalPoints,
    draftItems: row.draftItems,
  });

  return (
    <OvertimeClient
      role={workspace.role}
      canSubmit={workspace.canSubmit}
      canApprove={workspace.canApprove}
      canMonitor={workspace.canMonitor}
      canSpvManage={workspace.canSpvManage}
      scopedEmployees={workspace.scopedEmployees}
      overtimeCatalogEntries={workspace.overtimeCatalogEntries.map((entry) => ({
        id: entry.id,
        externalCode: entry.externalCode ?? null,
        workName: entry.workName,
        pointValue: Number(entry.pointValue),
        unitDescription: entry.unitDescription ?? null,
      }))}
      myRequests={workspace.myRequests.map(mapRow)}
      pendingRequests={workspace.pendingRequests.map(mapRow)}
      processedRequests={workspace.processedRequests.map(mapRow)}
    />
  );
}
