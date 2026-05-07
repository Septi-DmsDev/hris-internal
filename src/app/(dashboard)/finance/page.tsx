import { format } from "date-fns";
import FinanceDashboardClient from "./FinanceDashboardClient";
import { getPayrollWorkspace } from "@/server/actions/payroll";
import type {
  PayrollSalaryConfigRow,
  PayrollGradeCompensationRow,
  PayrollPeriodRow,
  PayrollAdjustmentRow,
} from "../payroll/PayrollClient";

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
        <p className="text-sm text-slate-500">Akses finance ditolak.</p>
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

  const salaryConfigs: PayrollSalaryConfigRow[] = workspace.salaryConfigs.map((row) => ({
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    positionName: row.positionName ?? "-",
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

  const gradeCompensations: PayrollGradeCompensationRow[] = workspace.gradeCompensations.map((row) => ({
    gradeId: row.gradeId,
    gradeName: row.gradeName,
    allowanceAmount: row.allowanceAmount != null ? Number(row.allowanceAmount) : null,
    bonusKinerja80: row.bonusKinerja80 != null ? Number(row.bonusKinerja80) : null,
    bonusKinerja90: row.bonusKinerja90 != null ? Number(row.bonusKinerja90) : null,
    bonusKinerja100: row.bonusKinerja100 != null ? Number(row.bonusKinerja100) : null,
    bonusKinerjaTeam80: row.bonusKinerjaTeam80 != null ? Number(row.bonusKinerjaTeam80) : null,
    bonusKinerjaTeam90: row.bonusKinerjaTeam90 != null ? Number(row.bonusKinerjaTeam90) : null,
    bonusKinerjaTeam100: row.bonusKinerjaTeam100 != null ? Number(row.bonusKinerjaTeam100) : null,
    bonusDisiplin80: row.bonusDisiplin80 != null ? Number(row.bonusDisiplin80) : null,
    bonusDisiplin90: row.bonusDisiplin90 != null ? Number(row.bonusDisiplin90) : null,
    bonusDisiplin100: row.bonusDisiplin100 != null ? Number(row.bonusDisiplin100) : null,
    bonusPrestasi140: row.bonusPrestasi140 != null ? Number(row.bonusPrestasi140) : null,
    bonusPrestasi165: row.bonusPrestasi165 != null ? Number(row.bonusPrestasi165) : null,
    isActive: row.isActive ?? true,
  }));

  const adjustments: PayrollAdjustmentRow[] = workspace.adjustments.map((row) => {
    const parts = row.reason.split("::");
    const category = parts[0] ?? row.adjustmentType;
    let description: string;
    if (category === "CICILAN") {
      const tenor = parts[1];
      const desc = parts.slice(2).join("::");
      description = desc ? `Tenor ${tenor}bl — ${desc}` : `Tenor ${tenor}bl`;
    } else {
      description = parts.slice(1).join("::") || "-";
    }
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName ?? "-",
      adjustmentType: row.adjustmentType,
      category,
      amount: Number(row.amount),
      description,
      reason: row.reason,
      source: row.source ?? "PERIOD",
      createdAt: format(row.createdAt, "yyyy-MM-dd HH:mm"),
    };
  });

  return (
    <FinanceDashboardClient
      canManage={workspace.canManage}
      activePeriodId={workspace.activePeriodId}
      periods={periods}
      salaryConfigs={salaryConfigs}
      gradeCompensations={gradeCompensations}
      adjustments={adjustments}
    />
  );
}
