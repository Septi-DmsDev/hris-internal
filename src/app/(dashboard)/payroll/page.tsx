import { format } from "date-fns";
import PayrollClient, {
  type PayrollDivisionSummaryRow,
  type PayrollAdjustmentRow,
  type PayrollFinanceSummary,
  type PayrollManagerialKpiRow,
  type PayrollPeriodRow,
  type PayrollResultRow,
  type PayrollSalaryConfigRow,
} from "./PayrollClient";
import { getPayrollWorkspace } from "@/server/actions/payroll";
import { summarizePayrollResults } from "@/server/payroll-engine/summarize-payroll-results";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedPeriodId = typeof params.periodId === "string" ? params.periodId : undefined;
  const workspace = await getPayrollWorkspace(selectedPeriodId);

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

  const adjustments: PayrollAdjustmentRow[] = workspace.adjustments.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName ?? "-",
    adjustmentType: row.adjustmentType,
    amount: Number(row.amount),
    reason: row.reason,
    createdAt: format(row.createdAt, "yyyy-MM-dd HH:mm"),
  }));

  const salaryConfigs: PayrollSalaryConfigRow[] = workspace.salaryConfigs.map((row) => ({
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    divisionName: row.divisionName ?? "-",
    employeeGroup: row.employeeGroup ?? "TEAMWORK",
    payrollStatus: row.payrollStatus,
    baseSalaryAmount: row.baseSalaryAmount != null ? Number(row.baseSalaryAmount) : null,
    gradeAllowanceAmount: row.gradeAllowanceAmount != null ? Number(row.gradeAllowanceAmount) : null,
    tenureAllowanceAmount: row.tenureAllowanceAmount != null ? Number(row.tenureAllowanceAmount) : null,
    dailyAllowanceAmount: row.dailyAllowanceAmount != null ? Number(row.dailyAllowanceAmount) : null,
    performanceBonusBaseAmount: row.performanceBonusBaseAmount != null ? Number(row.performanceBonusBaseAmount) : null,
    achievementBonus140Amount: row.achievementBonus140Amount != null ? Number(row.achievementBonus140Amount) : null,
    achievementBonus165Amount: row.achievementBonus165Amount != null ? Number(row.achievementBonus165Amount) : null,
    fulltimeBonusAmount: row.fulltimeBonusAmount != null ? Number(row.fulltimeBonusAmount) : null,
    disciplineBonusAmount: row.disciplineBonusAmount != null ? Number(row.disciplineBonusAmount) : null,
    teamBonusAmount: row.teamBonusAmount != null ? Number(row.teamBonusAmount) : null,
    overtimeRateAmount: row.overtimeRateAmount != null ? Number(row.overtimeRateAmount) : null,
    notes: row.notes ?? "",
    updatedAt: row.updatedAt ? format(row.updatedAt, "yyyy-MM-dd HH:mm") : "-",
  }));

  const managerialKpiRows: PayrollManagerialKpiRow[] = workspace.managerialKpiRows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeCode: row.employeeCode ?? "-",
    employeeName: row.employeeName ?? "-",
    divisionName: row.divisionName ?? "-",
    performancePercent: Number(row.performancePercent),
    status: row.status,
    notes: row.notes ?? "",
    updatedAt: row.updatedAt ? format(row.updatedAt, "yyyy-MM-dd HH:mm") : "-",
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
      <PayrollClient
        role={workspace.role}
        canManage={workspace.canManage}
        activePeriodId={workspace.activePeriodId}
        periods={periods}
        results={results}
        adjustments={adjustments}
        salaryConfigs={salaryConfigs}
        managerialKpiRows={managerialKpiRows}
        financeSummary={financeSummary}
        divisionSummaries={divisionSummaries}
      />
    </div>
  );
}
