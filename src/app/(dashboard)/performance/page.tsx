import { format } from "date-fns";
import { getPointCatalogOverview } from "@/server/actions/point-catalog";
import {
  getPerformanceWorkspace,
  getSpvPendingActivities,
  getTwPerformanceData,
} from "@/server/actions/performance";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import TwPerformanceClient from "./TwPerformanceClient";
import PerformanceCatalogClient, {
  type PerformanceActivityRow,
  type PerformanceCatalogEntryRow,
  type PerformanceDivisionTargetRow,
  type PerformanceEmployeeOption,
  type PerformanceMonthlyRow,
  type PerformanceVersionRow,
  type PerformanceDivisionOption,
} from "./PerformanceCatalogClient";
import SPVReviewClient from "./SPVReviewClient";
import type { SpvActivityRow } from "./SPVReviewClient";

export default async function PerformancePage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role;

  if (["TEAMWORK", "MANAGERIAL"].includes(role)) {
    const data = await getTwPerformanceData();
    if (data.error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.error}
        </div>
      );
    }
    const activityItems = data.activities.map((a) => ({
      ...a,
      workDate: a.workDate instanceof Date ? a.workDate : new Date(String(a.workDate)),
    }));
    return (
      <div className="space-y-4">
        <TwPerformanceClient
          catalogEntries={data.catalogEntries}
          activities={activityItems}
          divisionName={data.divisionName}
        />
      </div>
    );
  }

  if (["SPV", "KABAG"].includes(role)) {
    const { activities } = await getSpvPendingActivities();
    const activityRows: SpvActivityRow[] = activities.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      employeeName: a.employeeName ?? "-",
      employeeCode: a.employeeCode ?? "-",
      employeeDivisionName: a.employeeDivisionName ?? "-",
      workDate: format(a.workDate, "yyyy-MM-dd"),
      externalCode: a.externalCode ?? null,
      workNameSnapshot: a.workNameSnapshot,
      pointValueSnapshot: String(a.pointValueSnapshot),
      quantity: String(a.quantity),
      totalPoints: String(a.totalPoints),
      status: a.status,
      submittedAt: a.submittedAt ? format(a.submittedAt, "yyyy-MM-dd HH:mm") : "-",
    }));
    return (
      <div className="space-y-4">
        <SPVReviewClient activities={activityRows} />
      </div>
    );
  }
  const [overview, workspace] = await Promise.all([
    getPointCatalogOverview(),
    getPerformanceWorkspace(),
  ]);
  const catalogEntryRecords = workspace.catalogEntries as Array<{
    id: string;
    divisionName: string;
    externalCode: string | null;
    workName: string;
    pointValue: string | number;
    unitDescription: string | null;
  }>;
  const employeeOptionRecords = workspace.employeeOptions as Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    divisionId: string;
    divisionName: string | null;
    employmentStatus: string;
  }>;
  const divisionOptionRecords = workspace.divisionOptions as Array<{
    id: string;
    name: string;
  }>;
  const activityRecords = workspace.activityEntries as Array<{
    id: string;
    employeeId: string;
    pointCatalogEntryId: string | null;
    employeeName: string | null;
    employeeCode: string | null;
    employeeDivisionId: string | null;
    employeeDivisionName: string | null;
    workDate: Date;
    actualDivisionId: string | null;
    actualDivisionName: string | null;
    workNameSnapshot: string;
    pointCatalogDivisionName: string;
    pointValueSnapshot: string | number;
    quantity: string | number;
    totalPoints: string | number;
    status: PerformanceActivityRow["status"];
    notes: string | null;
    submittedAt: Date | null;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    createdAt: Date;
  }>;
  const monthlyRecords = workspace.monthlyPerformances as Array<{
    id: string;
    employeeId: string;
    employeeName: string | null;
    employeeCode: string | null;
    employeeDivisionId: string | null;
    employeeDivisionName: string | null;
    periodStartDate: Date;
    periodEndDate: Date;
    divisionSnapshotName: string;
    targetDailyPoints: number;
    targetDays: number;
    totalTargetPoints: number;
    totalApprovedPoints: string | number;
    performancePercent: string | number;
    status: PerformanceMonthlyRow["status"];
    calculatedAt: Date;
  }>;

  const versionRows: PerformanceVersionRow[] = overview.versions.map((version) => ({
    id: version.id,
    code: version.code,
    status: version.status,
    sourceFileName: version.sourceFileName ?? "-",
    effectiveStartDate: format(version.effectiveStartDate, "yyyy-MM-dd"),
    effectiveEndDate: version.effectiveEndDate
      ? format(version.effectiveEndDate, "yyyy-MM-dd")
      : "-",
    importedAt: format(version.importedAt, "yyyy-MM-dd HH:mm"),
  }));

  const targetRows: PerformanceDivisionTargetRow[] = overview.resolvedTargets.map((rule) => ({
    divisionName: rule.divisionName,
    targetPoints: rule.targetPoints,
    source: rule.source,
  }));

  const entryRows: PerformanceCatalogEntryRow[] = overview.latestEntries.map((entry) => ({
    id: entry.id,
    divisionName: entry.divisionName,
    externalCode: entry.externalCode ?? "-",
    workName: entry.workName,
    pointValue: entry.pointValue,
    unitDescription: entry.unitDescription ?? "-",
  }));

  const allCatalogEntries: PerformanceCatalogEntryRow[] = catalogEntryRecords.map((entry) => ({
    id: entry.id,
    divisionName: entry.divisionName,
    externalCode: entry.externalCode ?? "-",
    workName: entry.workName,
    pointValue: String(entry.pointValue),
    unitDescription: entry.unitDescription ?? "-",
  }));

  const employeeOptions: PerformanceEmployeeOption[] = employeeOptionRecords.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    divisionId: employee.divisionId,
    divisionName: employee.divisionName ?? "-",
    employmentStatus: employee.employmentStatus,
  }));

  const divisionOptions: PerformanceDivisionOption[] = divisionOptionRecords.map((division) => ({
    id: division.id,
    name: division.name,
  }));

  const activityRows: PerformanceActivityRow[] = activityRecords.map((entry) => ({
    id: entry.id,
    employeeId: entry.employeeId,
    pointCatalogEntryId: entry.pointCatalogEntryId ?? "",
    employeeName: entry.employeeName ?? "-",
    employeeCode: entry.employeeCode ?? "-",
    employeeDivisionId: entry.employeeDivisionId,
    employeeDivisionName: entry.employeeDivisionName ?? "-",
    workDate: format(entry.workDate, "yyyy-MM-dd"),
    actualDivisionId: entry.actualDivisionId,
    actualDivisionName: entry.actualDivisionName ?? "-",
    workNameSnapshot: entry.workNameSnapshot,
    pointCatalogDivisionName: entry.pointCatalogDivisionName,
    pointValueSnapshot: String(entry.pointValueSnapshot),
    quantity: String(entry.quantity),
    totalPoints: String(entry.totalPoints),
    status: entry.status,
    notes: entry.notes ?? "",
    submittedAt: entry.submittedAt ? format(entry.submittedAt, "yyyy-MM-dd HH:mm") : "-",
    approvedAt: entry.approvedAt ? format(entry.approvedAt, "yyyy-MM-dd HH:mm") : "-",
    rejectedAt: entry.rejectedAt ? format(entry.rejectedAt, "yyyy-MM-dd HH:mm") : "-",
    createdAt: format(entry.createdAt, "yyyy-MM-dd HH:mm"),
  }));

  const monthlyRows: PerformanceMonthlyRow[] = monthlyRecords.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName ?? "-",
    employeeCode: row.employeeCode ?? "-",
    employeeDivisionId: row.employeeDivisionId,
    employeeDivisionName: row.employeeDivisionName ?? "-",
    periodStartDate: format(row.periodStartDate, "yyyy-MM-dd"),
    periodEndDate: format(row.periodEndDate, "yyyy-MM-dd"),
    divisionSnapshotName: row.divisionSnapshotName,
    targetDailyPoints: row.targetDailyPoints,
    targetDays: row.targetDays,
    totalTargetPoints: row.totalTargetPoints,
    totalApprovedPoints: String(row.totalApprovedPoints),
    performancePercent: String(row.performancePercent),
    status: row.status,
    calculatedAt: format(row.calculatedAt, "yyyy-MM-dd HH:mm"),
  }));

  return (
    <div className="space-y-4">
      <PerformanceCatalogClient
        role={workspace.role}
        canManageCatalog={overview.canManageCatalog}
        canManageActivities={workspace.canManageActivities}
        canGenerateMonthly={workspace.canGenerateMonthly}
        activeVersionCode={overview.activeVersion?.code ?? null}
        totalEntries={overview.entrySummary.totalEntries}
        totalDivisions={overview.entrySummary.totalDivisions}
        versions={versionRows}
        divisionTargets={targetRows}
        entries={entryRows}
        allCatalogEntries={allCatalogEntries}
        employeeOptions={employeeOptions}
        divisionOptions={divisionOptions}
        activityEntries={activityRows}
        monthlyPerformances={monthlyRows}
      />
    </div>
  );
}
