"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addPayrollAdjustment,
  createPayrollPeriod,
  finalizePayroll,
  generatePayrollPreview,
  lockPayrollPeriod,
  markPayrollPaid,
  upsertManagerialKpiSummary,
  upsertEmployeeSalaryConfig,
} from "@/server/actions/payroll";
import type { UserRole } from "@/types";

export type PayrollPeriodRow = {
  id: string;
  periodCode: string;
  periodLabel: string;
  status: string;
  notes: string;
  previewGeneratedAt: string;
  finalizedAt: string;
};

export type PayrollResultRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  positionName: string;
  gradeName: string;
  employeeGroup: "TEAMWORK" | "MANAGERIAL";
  payrollStatus: string;
  performancePercent: number;
  approvedUnpaidLeaveDays: number;
  baseSalaryPaid: number;
  gradeAllowancePaid: number;
  tenureAllowancePaid: number;
  bonusKinerjaAmount: number;
  bonusPrestasiAmount: number;
  bonusFulltimeAmount: number;
  bonusDisciplineAmount: number;
  bonusTeamAmount: number;
  incidentDeductionAmount: number;
  manualAdjustmentAmount: number;
  totalAdditionAmount: number;
  totalDeductionAmount: number;
  takeHomePay: number;
  status: string;
};

export type PayrollAdjustmentRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  adjustmentType: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type PayrollSalaryConfigRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  divisionName: string;
  employeeGroup: "TEAMWORK" | "MANAGERIAL";
  payrollStatus: string;
  baseSalaryAmount: number | null;
  gradeAllowanceAmount: number | null;
  tenureAllowanceAmount: number | null;
  dailyAllowanceAmount: number | null;
  performanceBonusBaseAmount: number | null;
  achievementBonus140Amount: number | null;
  achievementBonus165Amount: number | null;
  fulltimeBonusAmount: number | null;
  disciplineBonusAmount: number | null;
  teamBonusAmount: number | null;
  overtimeRateAmount: number | null;
  notes: string;
  updatedAt: string;
};

export type PayrollManagerialKpiRow = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  divisionName: string;
  performancePercent: number;
  status: string;
  notes: string;
  updatedAt: string;
};

export type PayrollFinanceSummary = {
  employeeCount: number;
  totalTakeHomePay: number;
  totalAdditions: number;
  totalDeductions: number;
  averagePerformancePercent: number;
};

export type PayrollDivisionSummaryRow = {
  divisionName: string;
  employeeCount: number;
  totalTakeHomePay: number;
  totalAdditions: number;
  totalDeductions: number;
  averagePerformancePercent: number;
};

type Props = {
  role: UserRole;
  canManage: boolean;
  activePeriodId: string | null;
  periods: PayrollPeriodRow[];
  results: PayrollResultRow[];
  adjustments: PayrollAdjustmentRow[];
  salaryConfigs: PayrollSalaryConfigRow[];
  managerialKpiRows: PayrollManagerialKpiRow[];
  financeSummary: PayrollFinanceSummary;
  divisionSummaries: PayrollDivisionSummaryRow[];
};

type PeriodDraft = {
  periodCode: string;
  notes: string;
};

type AdjustmentDraft = {
  employeeId: string;
  adjustmentType: "ADDITION" | "DEDUCTION";
  amount: string;
  reason: string;
};

type SalaryConfigDraft = {
  employeeId: string;
  employeeLabel: string;
  baseSalaryAmount: string;
  gradeAllowanceAmount: string;
  tenureAllowanceAmount: string;
  dailyAllowanceAmount: string;
  performanceBonusBaseAmount: string;
  achievementBonus140Amount: string;
  achievementBonus165Amount: string;
  fulltimeBonusAmount: string;
  disciplineBonusAmount: string;
  teamBonusAmount: string;
  overtimeRateAmount: string;
  notes: string;
};

type ManagerialKpiDraft = {
  employeeId: string;
  employeeLabel: string;
  performancePercent: string;
  notes: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OPEN: "outline",
  DATA_REVIEW: "secondary",
  DRAFT: "secondary",
  FINALIZED: "default",
  PAID: "default",
  LOCKED: "default",
};

function currentPeriodCode() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

function createPeriodDraft(): PeriodDraft {
  return {
    periodCode: currentPeriodCode(),
    notes: "",
  };
}

function createAdjustmentDraft(employeeId = ""): AdjustmentDraft {
  return {
    employeeId,
    adjustmentType: "ADDITION",
    amount: "",
    reason: "",
  };
}

function asInputValue(value: number | null) {
  return value == null ? "" : String(value);
}

function createSalaryConfigDraft(row?: PayrollSalaryConfigRow): SalaryConfigDraft {
  return {
    employeeId: row?.employeeId ?? "",
    employeeLabel: row ? `${row.employeeName} · ${row.employeeCode}` : "",
    baseSalaryAmount: asInputValue(row?.baseSalaryAmount ?? null),
    gradeAllowanceAmount: asInputValue(row?.gradeAllowanceAmount ?? null),
    tenureAllowanceAmount: asInputValue(row?.tenureAllowanceAmount ?? null),
    dailyAllowanceAmount: asInputValue(row?.dailyAllowanceAmount ?? null),
    performanceBonusBaseAmount: asInputValue(row?.performanceBonusBaseAmount ?? null),
    achievementBonus140Amount: asInputValue(row?.achievementBonus140Amount ?? null),
    achievementBonus165Amount: asInputValue(row?.achievementBonus165Amount ?? null),
    fulltimeBonusAmount: asInputValue(row?.fulltimeBonusAmount ?? null),
    disciplineBonusAmount: asInputValue(row?.disciplineBonusAmount ?? null),
    teamBonusAmount: asInputValue(row?.teamBonusAmount ?? null),
    overtimeRateAmount: asInputValue(row?.overtimeRateAmount ?? null),
    notes: row?.notes ?? "",
  };
}

function createManagerialKpiDraft(row?: PayrollManagerialKpiRow): ManagerialKpiDraft {
  return {
    employeeId: row?.employeeId ?? "",
    employeeLabel: row ? `${row.employeeName} · ${row.employeeCode}` : "",
    performancePercent: row ? String(row.performancePercent) : "",
    notes: row?.notes ?? "",
  };
}

export default function PayrollClient({
  role,
  canManage,
  activePeriodId,
  periods,
  results,
  adjustments,
  salaryConfigs,
  managerialKpiRows,
  financeSummary,
  divisionSummaries,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [salaryConfigOpen, setSalaryConfigOpen] = useState(false);
  const [managerialKpiOpen, setManagerialKpiOpen] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft>(createPeriodDraft());
  const [adjustmentDraft, setAdjustmentDraft] = useState<AdjustmentDraft>(createAdjustmentDraft());
  const [salaryConfigDraft, setSalaryConfigDraft] = useState<SalaryConfigDraft>(createSalaryConfigDraft());
  const [managerialKpiDraft, setManagerialKpiDraft] = useState<ManagerialKpiDraft>(createManagerialKpiDraft());

  const selectedPeriod = periods.find((period) => period.id === activePeriodId) ?? null;
  const totalTakeHome = results.reduce((sum, row) => sum + row.takeHomePay, 0);
  const totalAdjustments = adjustments.reduce(
    (sum, row) => sum + (row.adjustmentType === "ADDITION" ? row.amount : -row.amount),
    0
  );

  const resultColumns: ColumnDef<PayrollResultRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-500">
              {row.original.employeeCode} · {row.original.divisionName} · {row.original.employeeGroup}
            </p>
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "payrollStatus",
        cell: ({ row }) => <Badge variant="outline">{row.original.payrollStatus}</Badge>,
      },
      {
        header: "Performa",
        accessorKey: "performancePercent",
        cell: ({ row }) => <span>{row.original.performancePercent.toFixed(2)}%</span>,
      },
      {
        header: "Addition",
        accessorKey: "totalAdditionAmount",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalAdditionAmount)}</span>,
      },
      {
        header: "Deduction",
        accessorKey: "totalDeductionAmount",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalDeductionAmount)}</span>,
      },
      {
        header: "THP",
        accessorKey: "takeHomePay",
        cell: ({ row }) => <span className="font-semibold text-slate-900">{formatCurrency(row.original.takeHomePay)}</span>,
      },
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {activePeriodId ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/payroll/${activePeriodId}/${row.original.employeeId}`}>Detail</Link>
              </Button>
            ) : null}
            {activePeriodId ? (
              <Button asChild size="sm" variant="outline">
                <a href={`/payroll/${activePeriodId}/${row.original.employeeId}/payslip.pdf`} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={!canManage || !activePeriodId || selectedPeriod?.status === "PAID" || selectedPeriod?.status === "LOCKED"}
              onClick={() => {
                setError(null);
                setSuccess(null);
                setAdjustmentDraft(createAdjustmentDraft(row.original.employeeId));
                setAdjustmentOpen(true);
              }}
            >
              Adjustment
            </Button>
          </div>
        ),
      },
    ],
    [activePeriodId, canManage, selectedPeriod?.status]
  );

  const adjustmentColumns: ColumnDef<PayrollAdjustmentRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
      },
      {
        header: "Tipe",
        accessorKey: "adjustmentType",
        cell: ({ row }) => (
          <Badge variant={row.original.adjustmentType === "ADDITION" ? "default" : "secondary"}>
            {row.original.adjustmentType}
          </Badge>
        ),
      },
      {
        header: "Nominal",
        accessorKey: "amount",
        cell: ({ row }) => <span>{formatCurrency(row.original.amount)}</span>,
      },
      {
        header: "Alasan",
        accessorKey: "reason",
      },
      {
        header: "Waktu",
        accessorKey: "createdAt",
      },
    ],
    []
  );

  const salaryConfigColumns: ColumnDef<PayrollSalaryConfigRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-500">
              {row.original.employeeCode} · {row.original.divisionName} · {row.original.employeeGroup}
            </p>
          </div>
        ),
      },
      {
        header: "Gaji Pokok",
        accessorKey: "baseSalaryAmount",
        cell: ({ row }) => <span>{row.original.baseSalaryAmount != null ? formatCurrency(row.original.baseSalaryAmount) : "-"}</span>,
      },
      {
        header: "Bonus Kinerja Base",
        accessorKey: "performanceBonusBaseAmount",
        cell: ({ row }) => (
          <span>{row.original.performanceBonusBaseAmount != null ? formatCurrency(row.original.performanceBonusBaseAmount) : "-"}</span>
        ),
      },
      {
        header: "Fulltime",
        accessorKey: "fulltimeBonusAmount",
        cell: ({ row }) => <span>{row.original.fulltimeBonusAmount != null ? formatCurrency(row.original.fulltimeBonusAmount) : "-"}</span>,
      },
      {
        header: "Team",
        accessorKey: "teamBonusAmount",
        cell: ({ row }) => <span>{row.original.teamBonusAmount != null ? formatCurrency(row.original.teamBonusAmount) : "-"}</span>,
      },
      {
        header: "Update",
        accessorKey: "updatedAt",
      },
      {
        header: "Aksi",
        id: "salary-config-actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            disabled={!canManage}
            onClick={() => {
              setError(null);
              setSuccess(null);
              setSalaryConfigDraft(createSalaryConfigDraft(row.original));
              setSalaryConfigOpen(true);
            }}
          >
            Edit Nominal
          </Button>
        ),
      },
    ],
    [canManage]
  );

  const managerialKpiColumns: ColumnDef<PayrollManagerialKpiRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-500">
              {row.original.employeeCode} · {row.original.divisionName}
            </p>
          </div>
        ),
      },
      {
        header: "KPI %",
        accessorKey: "performancePercent",
        cell: ({ row }) => <span>{row.original.performancePercent.toFixed(2)}%</span>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        header: "Update",
        accessorKey: "updatedAt",
      },
      {
        header: "Aksi",
        id: "managerial-kpi-actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            disabled={!canManage || !activePeriodId || selectedPeriod?.status === "PAID" || selectedPeriod?.status === "LOCKED"}
            onClick={() => {
              setError(null);
              setSuccess(null);
              setManagerialKpiDraft(createManagerialKpiDraft(row.original));
              setManagerialKpiOpen(true);
            }}
          >
            Edit KPI
          </Button>
        ),
      },
    ],
    [activePeriodId, canManage, selectedPeriod?.status]
  );

  const divisionSummaryColumns: ColumnDef<PayrollDivisionSummaryRow>[] = useMemo(
    () => [
      { header: "Divisi", accessorKey: "divisionName" },
      { header: "Karyawan", accessorKey: "employeeCount" },
      {
        header: "Total THP",
        accessorKey: "totalTakeHomePay",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalTakeHomePay)}</span>,
      },
      {
        header: "Addition",
        accessorKey: "totalAdditions",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalAdditions)}</span>,
      },
      {
        header: "Deduction",
        accessorKey: "totalDeductions",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalDeductions)}</span>,
      },
      {
        header: "Avg Performa",
        accessorKey: "averagePerformancePercent",
        cell: ({ row }) => <span>{row.original.averagePerformancePercent.toFixed(2)}%</span>,
      },
    ],
    []
  );

  async function handleCreatePeriod() {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createPayrollPeriod(periodDraft);
      if (result && "error" in result) {
        setError(result.error ?? "Gagal membuat periode payroll.");
        return;
      }
      setSuccess("Periode payroll berhasil dibuat.");
      setPeriodOpen(false);
      setPeriodDraft(createPeriodDraft());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleGeneratePreview() {
    if (!activePeriodId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await generatePayrollPreview({ periodId: activePeriodId });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal generate preview payroll.");
        return;
      }
      setSuccess(`Preview payroll berhasil digenerate untuk ${result.generatedEmployees} karyawan.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleFinalize() {
    if (!activePeriodId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await finalizePayroll({ periodId: activePeriodId });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal finalisasi payroll.");
        return;
      }
      setSuccess("Payroll berhasil difinalisasi dan aktivitas terkait dikunci.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleAddAdjustment() {
    if (!activePeriodId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await addPayrollAdjustment({
        periodId: activePeriodId,
        employeeId: adjustmentDraft.employeeId,
        adjustmentType: adjustmentDraft.adjustmentType,
        amount: Number(adjustmentDraft.amount),
        reason: adjustmentDraft.reason,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal menambahkan adjustment.");
        return;
      }
      setSuccess("Adjustment payroll berhasil ditambahkan.");
      setAdjustmentOpen(false);
      setAdjustmentDraft(createAdjustmentDraft());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleSaveSalaryConfig() {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await upsertEmployeeSalaryConfig({
        employeeId: salaryConfigDraft.employeeId,
        baseSalaryAmount: salaryConfigDraft.baseSalaryAmount,
        gradeAllowanceAmount: salaryConfigDraft.gradeAllowanceAmount,
        tenureAllowanceAmount: salaryConfigDraft.tenureAllowanceAmount,
        dailyAllowanceAmount: salaryConfigDraft.dailyAllowanceAmount,
        performanceBonusBaseAmount: salaryConfigDraft.performanceBonusBaseAmount,
        achievementBonus140Amount: salaryConfigDraft.achievementBonus140Amount,
        achievementBonus165Amount: salaryConfigDraft.achievementBonus165Amount,
        fulltimeBonusAmount: salaryConfigDraft.fulltimeBonusAmount,
        disciplineBonusAmount: salaryConfigDraft.disciplineBonusAmount,
        teamBonusAmount: salaryConfigDraft.teamBonusAmount,
        overtimeRateAmount: salaryConfigDraft.overtimeRateAmount,
        notes: salaryConfigDraft.notes,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal menyimpan salary config.");
        return;
      }
      setSuccess("Salary config payroll berhasil disimpan.");
      setSalaryConfigOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleSaveManagerialKpi() {
    if (!activePeriodId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await upsertManagerialKpiSummary({
        periodId: activePeriodId,
        employeeId: managerialKpiDraft.employeeId,
        performancePercent: managerialKpiDraft.performancePercent,
        notes: managerialKpiDraft.notes,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal menyimpan KPI managerial.");
        return;
      }
      setSuccess("KPI managerial berhasil disimpan.");
      setManagerialKpiOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleMarkPaid() {
    if (!activePeriodId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await markPayrollPaid({ periodId: activePeriodId });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal menandai payroll sebagai PAID.");
        return;
      }
      setSuccess("Payroll berhasil ditandai PAID.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleLockPeriod() {
    if (!activePeriodId) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await lockPayrollPeriod({ periodId: activePeriodId });
      if (result && "error" in result) {
        setError(result.error ?? "Gagal mengunci payroll.");
        return;
      }
      setSuccess("Payroll berhasil dikunci.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Role</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{role}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total THP Preview</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(financeSummary.totalTakeHomePay || totalTakeHome)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Addition</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(financeSummary.totalAdditions)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Deduction</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(financeSummary.totalDeductions)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Net Adjustment</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(totalAdjustments)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Button
            onClick={() => {
              setError(null);
              setSuccess(null);
              setPeriodDraft(createPeriodDraft());
              setPeriodOpen(true);
            }}
          >
            Buat Periode
          </Button>
        )}
        {canManage && activePeriodId && (
          <Button variant="outline" onClick={() => void handleGeneratePreview()} disabled={pending}>
            Generate Preview
          </Button>
        )}
        {canManage && activePeriodId && selectedPeriod?.status !== "FINALIZED" && selectedPeriod?.status !== "PAID" && selectedPeriod?.status !== "LOCKED" && (
          <Button onClick={() => void handleFinalize()} disabled={pending || results.length === 0}>
            Finalisasi Payroll
          </Button>
        )}
        {canManage && activePeriodId && selectedPeriod?.status === "FINALIZED" && (
          <Button onClick={() => void handleMarkPaid()} disabled={pending}>
            Tandai PAID
          </Button>
        )}
        {canManage && activePeriodId && selectedPeriod?.status === "PAID" && (
          <Button variant="secondary" onClick={() => void handleLockPeriod()} disabled={pending}>
            Kunci Periode
          </Button>
        )}
        {activePeriodId && (
          <Button asChild variant="outline">
            <a href={`/payroll/${activePeriodId}/export.xlsx`}>Export Excel</a>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href={activePeriodId ? `/finance?periodId=${activePeriodId}` : "/finance"}>Buka Finance Dashboard</Link>
        </Button>
      </div>

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Periode Payroll</p>
            <p className="mt-1 text-xs text-slate-500">Pilih periode untuk melihat preview dan adjustment.</p>
          </div>
          {periods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Belum ada periode payroll.
            </div>
          ) : (
            periods.map((period) => {
              const isActive = period.id === activePeriodId;
              return (
                <Link
                  key={period.id}
                  href={`/payroll?periodId=${period.id}`}
                  className={`block rounded-xl border p-4 transition-colors ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{period.periodCode}</p>
                    <Badge variant={STATUS_VARIANT[period.status] ?? "outline"}>{period.status}</Badge>
                  </div>
                  <p className={`mt-2 text-sm ${isActive ? "text-slate-200" : "text-slate-500"}`}>{period.periodLabel}</p>
                  <p className={`mt-2 text-xs ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                    Preview: {period.previewGeneratedAt}
                  </p>
                  <p className={`text-xs ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                    Finalisasi: {period.finalizedAt}
                  </p>
                </Link>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedPeriod ? `Preview ${selectedPeriod.periodCode}` : "Belum ada periode dipilih"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPeriod ? selectedPeriod.periodLabel : "Buat atau pilih periode payroll terlebih dahulu."}
                </p>
              </div>
              {selectedPeriod && <Badge variant={STATUS_VARIANT[selectedPeriod.status] ?? "outline"}>{selectedPeriod.status}</Badge>}
            </div>
            {selectedPeriod?.notes && (
              <p className="mt-3 text-sm text-slate-600">{selectedPeriod.notes}</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Hasil Payroll</h4>
              <p className="text-sm text-slate-500">
                Preview payroll gabungan TEAMWORK dan MANAGERIAL berbasis snapshot periode, sumber performa final,
                ticket approved, incident, dan adjustment.
              </p>
            </div>
            <DataTable
              data={results}
              columns={resultColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari karyawan payroll..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Finance Summary per Divisi</h4>
              <p className="text-sm text-slate-500">
                Ringkasan total THP, addition, deduction, dan rata-rata performa untuk periode aktif.
              </p>
            </div>
            <DataTable
              data={divisionSummaries}
              columns={divisionSummaryColumns}
              searchKey="divisionName"
              searchPlaceholder="Cari divisi payroll..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Adjustment</h4>
              <p className="text-sm text-slate-500">Riwayat penyesuaian manual per periode payroll.</p>
            </div>
            <DataTable
              data={adjustments}
              columns={adjustmentColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari adjustment..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">KPI Managerial</h4>
                <p className="text-sm text-slate-500">
                  Sumber performa final untuk karyawan MANAGERIAL pada periode aktif.
                </p>
              </div>
              {canManage && activePeriodId ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setManagerialKpiDraft(createManagerialKpiDraft());
                    setManagerialKpiOpen(true);
                  }}
                >
                  Input KPI
                </Button>
              ) : null}
            </div>
            <DataTable
              data={managerialKpiRows}
              columns={managerialKpiColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari KPI managerial..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Salary Config</h4>
                <p className="text-sm text-slate-500">
                  Master nominal payroll aktif yang dipakai saat generate preview periode.
                </p>
              </div>
            </div>
            <DataTable
              data={salaryConfigs}
              columns={salaryConfigColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari salary config..."
            />
          </div>
        </div>
      </div>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Periode Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Periode Anchor (YYYY-MM)</label>
              <Input
                value={periodDraft.periodCode}
                onChange={(event) => setPeriodDraft((draft) => ({ ...draft, periodCode: event.target.value }))}
                placeholder="2026-04"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <Input
                value={periodDraft.notes}
                onChange={(event) => setPeriodDraft((draft) => ({ ...draft, notes: event.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={() => void handleCreatePeriod()} disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Adjustment Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Karyawan</label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-xs"
                value={adjustmentDraft.employeeId}
                onChange={(event) => setAdjustmentDraft((draft) => ({ ...draft, employeeId: event.target.value }))}
              >
                <option value="">Pilih karyawan</option>
                {results.map((row) => (
                  <option key={row.employeeId} value={row.employeeId}>
                    {row.employeeName} · {row.employeeCode}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipe</label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={adjustmentDraft.adjustmentType}
                  onChange={(event) =>
                    setAdjustmentDraft((draft) => ({
                      ...draft,
                      adjustmentType: event.target.value as AdjustmentDraft["adjustmentType"],
                    }))
                  }
                >
                  <option value="ADDITION">ADDITION</option>
                  <option value="DEDUCTION">DEDUCTION</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nominal</label>
                <Input
                  type="number"
                  value={adjustmentDraft.amount}
                  onChange={(event) => setAdjustmentDraft((draft) => ({ ...draft, amount: event.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Alasan</label>
              <Input
                value={adjustmentDraft.reason}
                onChange={(event) => setAdjustmentDraft((draft) => ({ ...draft, reason: event.target.value }))}
                placeholder="Alasan adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={() => void handleAddAdjustment()} disabled={pending || !activePeriodId}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={salaryConfigOpen} onOpenChange={setSalaryConfigOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Atur Salary Config Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {salaryConfigDraft.employeeLabel || "Pilih karyawan dari tabel salary config."}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Gaji Pokok</label>
                <Input value={salaryConfigDraft.baseSalaryAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, baseSalaryAmount: event.target.value }))} type="number" placeholder="1200000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tunjangan Grade</label>
                <Input value={salaryConfigDraft.gradeAllowanceAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, gradeAllowanceAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tunjangan Masa Kerja</label>
                <Input value={salaryConfigDraft.tenureAllowanceAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, tenureAllowanceAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Uang Harian</label>
                <Input value={salaryConfigDraft.dailyAllowanceAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, dailyAllowanceAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Base Bonus Kinerja</label>
                <Input value={salaryConfigDraft.performanceBonusBaseAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, performanceBonusBaseAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bonus Prestasi 140</label>
                <Input value={salaryConfigDraft.achievementBonus140Amount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, achievementBonus140Amount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bonus Prestasi 165</label>
                <Input value={salaryConfigDraft.achievementBonus165Amount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, achievementBonus165Amount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bonus Fulltime</label>
                <Input value={salaryConfigDraft.fulltimeBonusAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, fulltimeBonusAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bonus Disiplin</label>
                <Input value={salaryConfigDraft.disciplineBonusAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, disciplineBonusAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Bonus Team</label>
                <Input value={salaryConfigDraft.teamBonusAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, teamBonusAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tarif Overtime</label>
                <Input value={salaryConfigDraft.overtimeRateAmount} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, overtimeRateAmount: event.target.value }))} type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catatan</label>
                <Input value={salaryConfigDraft.notes} onChange={(event) => setSalaryConfigDraft((draft) => ({ ...draft, notes: event.target.value }))} placeholder="Opsional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryConfigOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={() => void handleSaveSalaryConfig()} disabled={pending || !salaryConfigDraft.employeeId}>
              Simpan Nominal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={managerialKpiOpen} onOpenChange={setManagerialKpiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Input KPI Managerial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {managerialKpiDraft.employeeLabel || "Pilih karyawan managerial dari tabel KPI."}
            </div>
            {!managerialKpiDraft.employeeId ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Karyawan Managerial</label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={managerialKpiDraft.employeeId}
                  onChange={(event) => {
                    const row = salaryConfigs.find(
                      (item) => item.employeeId === event.target.value && item.employeeGroup === "MANAGERIAL"
                    );
                    setManagerialKpiDraft({
                      employeeId: event.target.value,
                      employeeLabel: row ? `${row.employeeName} · ${row.employeeCode}` : "",
                      performancePercent: "",
                      notes: "",
                    });
                  }}
                >
                  <option value="">Pilih karyawan managerial</option>
                  {salaryConfigs
                    .filter((row) => row.employeeGroup === "MANAGERIAL")
                    .map((row) => (
                      <option key={row.employeeId} value={row.employeeId}>
                        {row.employeeName} · {row.employeeCode} · {row.divisionName}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">KPI Final (%)</label>
              <Input
                type="number"
                value={managerialKpiDraft.performancePercent}
                onChange={(event) =>
                  setManagerialKpiDraft((draft) => ({ ...draft, performancePercent: event.target.value }))
                }
                placeholder="92.5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <Input
                value={managerialKpiDraft.notes}
                onChange={(event) => setManagerialKpiDraft((draft) => ({ ...draft, notes: event.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagerialKpiOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button
              onClick={() => void handleSaveManagerialKpi()}
              disabled={pending || !activePeriodId || !managerialKpiDraft.employeeId || !managerialKpiDraft.performancePercent}
            >
              Simpan KPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

