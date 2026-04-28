import { format } from "date-fns";
import FinanceDashboardClient from "./FinanceDashboardClient";
import {
  type PayrollDivisionSummaryRow,
  type PayrollFinanceSummary,
  type PayrollPeriodRow,
  type PayrollResultRow,
} from "../payroll/PayrollClient";
import { getPayrollWorkspace } from "@/server/actions/payroll";
import { summarizePayrollResults } from "@/server/payroll-engine/summarize-payroll-results";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinancePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedPeriodId = typeof params.periodId === "string" ? params.periodId : undefined;
  const workspace = await getPayrollWorkspace(selectedPeriodId);

  if ("error" in workspace) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Finance Dashboard</h2>
          <p className="text-sm text-slate-500">Akses finance dashboard ditolak.</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {workspace.error}
        </div>
      </div>
    );
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

  const financeSummary: PayrollFinanceSummary = {
    employeeCount: summary.employeeCount,
    totalTakeHomePay: summary.totalTakeHomePay,
    totalAdditions: summary.totalAdditions,
    totalDeductions: summary.totalDeductions,
    averagePerformancePercent: summary.averagePerformancePercent,
  };

  const divisionSummaries: PayrollDivisionSummaryRow[] = summary.divisionSummaries;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Finance Dashboard</h2>
        <p className="text-sm text-slate-500">
          Monitoring total payroll, ringkasan per divisi, dan export periode untuk Finance/HRD.
        </p>
      </div>

      <FinanceDashboardClient
        activePeriodId={workspace.activePeriodId}
        periods={periods}
        financeSummary={financeSummary}
        divisionSummaries={divisionSummaries}
        results={results}
      />
    </div>
  );
}
