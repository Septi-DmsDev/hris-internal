import { format } from "date-fns";
import PayrollClient, {
  type PayrollDivisionSummaryRow,
  type PayrollPeriodRow,
  type PayrollResultRow,
} from "./PayrollClient";
import { generatePayrollPreview, getPayrollWorkspace } from "@/server/actions/payroll";
import { shouldAutoGeneratePayrollPreview } from "@/server/actions/payroll.helpers";
import { summarizePayrollResults } from "@/server/payroll-engine/summarize-payroll-results";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedPeriodId = typeof params.periodId === "string" ? params.periodId : undefined;
  let workspace = await getPayrollWorkspace(selectedPeriodId);
  let autoPreviewError: string | null = null;
  let autoPreviewWarning: string | null = null;

  if ("error" in workspace) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Akses payroll ditolak.</p>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {workspace.error}
        </div>
      </div>
    );
  }

  if (
    workspace.activePeriodId &&
    shouldAutoGeneratePayrollPreview(workspace.canManage, workspace.selectedPeriod?.status ?? null)
  ) {
    const previewResult = await generatePayrollPreview(
      { periodId: workspace.activePeriodId },
      { revalidate: false }
    );

    if ("error" in previewResult) {
      autoPreviewError = previewResult.error ?? "Preview payroll otomatis gagal dibuat.";
    } else {
      if ("warning" in previewResult && previewResult.warning) {
        autoPreviewWarning = previewResult.warning;
      }
      workspace = await getPayrollWorkspace(selectedPeriodId);
      if ("error" in workspace) {
        return (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Akses payroll ditolak.</p>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {workspace.error}
            </div>
          </div>
        );
      }
    }
  }

  const periods: PayrollPeriodRow[] = workspace.periods.map((period) => ({
    id: period.id,
    periodCode: period.periodCode,
    periodLabel: `${format(period.periodStartDate, "yyyy-MM-dd")} s.d. ${format(period.periodEndDate, "yyyy-MM-dd")}`,
    status: period.status,
    notes: period.notes ?? "",
    previewGeneratedAt: period.previewGeneratedAt ? format(period.previewGeneratedAt, "yyyy-MM-dd HH:mm") : "-",
    finalizedAt: period.finalizedAt ? format(period.finalizedAt, "yyyy-MM-dd HH:mm") : "-",
  }));

  const results: PayrollResultRow[] = workspace.results.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName ?? "-",
    employeeCode: row.employeeCode ?? "-",
    divisionName: row.divisionName ?? "-",
    positionName: row.positionName ?? "-",
    gradeName: row.gradeName ?? "-",
    employeeGroup: row.employeeGroup ?? "TEAMWORK",
    payrollStatus: row.payrollStatus ?? "-",
    performancePercent: Number(row.performancePercent),
    approvedUnpaidLeaveDays: row.approvedUnpaidLeaveDays,
    baseSalaryPaid: Number(row.baseSalaryPaid),
    gradeAllowancePaid: Number(row.gradeAllowancePaid),
    tenureAllowancePaid: Number(row.tenureAllowancePaid),
    bonusKinerjaAmount: Number(row.bonusKinerjaAmount),
    bonusPrestasiAmount: Number(row.bonusPrestasiAmount),
    bonusFulltimeAmount: Number(row.bonusFulltimeAmount),
    bonusDisciplineAmount: Number(row.bonusDisciplineAmount),
    bonusTeamAmount: Number(row.bonusTeamAmount),
    incidentDeductionAmount: Number(row.incidentDeductionAmount),
    manualAdjustmentAmount: Number(row.manualAdjustmentAmount),
    totalAdditionAmount: Number(row.totalAdditionAmount),
    totalDeductionAmount: Number(row.totalDeductionAmount),
    takeHomePay: Number(row.takeHomePay),
    status: row.status,
  }));

  const summary = summarizePayrollResults(
    results.map((row) => ({
      employeeId: row.employeeId,
      divisionName: row.divisionName,
      takeHomePay: row.takeHomePay,
      totalAdditionAmount: row.totalAdditionAmount,
      totalDeductionAmount: row.totalDeductionAmount,
      performancePercent: row.performancePercent,
    }))
  );

  const divisionSummaries: PayrollDivisionSummaryRow[] = summary.divisionSummaries;

  return (
    <div className="space-y-6">
      <PayrollClient
        canManage={workspace.canManage}
        canDelete={workspace.canManage}
        activePeriodId={workspace.activePeriodId}
        periods={periods}
        results={results}
        divisionSummaries={divisionSummaries}
        initialError={autoPreviewError}
        initialWarning={autoPreviewWarning}
      />
    </div>
  );
}
