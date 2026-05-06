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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createPayrollPeriod,
  finalizePayroll,
  generatePayrollPreview,
  lockPayrollPeriod,
  markPayrollPaid,
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
  positionName: string;
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

export type PayrollGradeCompensationRow = {
  gradeId: string;
  gradeName: string;
  allowanceAmount: number | null;
  bonusKinerja80: number | null;
  bonusKinerja90: number | null;
  bonusKinerja100: number | null;
  bonusKinerjaTeam80: number | null;
  bonusKinerjaTeam90: number | null;
  bonusKinerjaTeam100: number | null;
  bonusDisiplin80: number | null;
  bonusDisiplin90: number | null;
  bonusDisiplin100: number | null;
  bonusPrestasi140: number | null;
  bonusPrestasi165: number | null;
  isActive: boolean;
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
  financeSummary: PayrollFinanceSummary;
  divisionSummaries: PayrollDivisionSummaryRow[];
};

type PeriodDraft = {
  periodCode: string;
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
  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function createPeriodDraft(): PeriodDraft {
  return { periodCode: currentPeriodCode(), notes: "" };
}

export default function PayrollClient({
  role,
  canManage,
  activePeriodId,
  periods,
  results,
  financeSummary,
  divisionSummaries,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft>(createPeriodDraft());
  const [activeTab, setActiveTab] = useState<"payroll" | "history">("payroll");

  const selectedPeriod = periods.find((p) => p.id === activePeriodId) ?? null;

  const canFinalize =
    canManage &&
    !!activePeriodId &&
    !["FINALIZED", "PAID", "LOCKED"].includes(selectedPeriod?.status ?? "");
  const canMarkPaid = canManage && !!activePeriodId && selectedPeriod?.status === "FINALIZED";
  const canLock = canManage && !!activePeriodId && selectedPeriod?.status === "PAID";

  const resultColumns: ColumnDef<PayrollResultRow>[] = useMemo(
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
        header: "Salary",
        id: "salary",
        cell: ({ row }) => {
          const v =
            row.original.baseSalaryPaid +
            row.original.gradeAllowancePaid +
            row.original.tenureAllowancePaid;
          return <span className="tabular-nums text-sm">{formatCurrency(v)}</span>;
        },
      },
      {
        header: "+ Bonus / Tunjangan",
        id: "bonus",
        cell: ({ row }) => {
          const v =
            row.original.bonusKinerjaAmount +
            row.original.bonusPrestasiAmount +
            row.original.bonusFulltimeAmount +
            row.original.bonusDisciplineAmount +
            row.original.bonusTeamAmount;
          return <span className="tabular-nums text-sm text-emerald-700">{formatCurrency(v)}</span>;
        },
      },
      {
        header: "- Tagihan / Ganti Rugi",
        id: "deduction",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-red-600">
            {formatCurrency(row.original.totalDeductionAmount)}
          </span>
        ),
      },
      {
        header: "Total THP",
        accessorKey: "takeHomePay",
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(row.original.takeHomePay)}
          </span>
        ),
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) =>
          activePeriodId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/payroll/${activePeriodId}/${row.original.employeeId}`}>Detail</Link>
            </Button>
          ) : null,
      },
    ],
    [activePeriodId]
  );

  const divisionSummaryColumns: ColumnDef<PayrollDivisionSummaryRow>[] = useMemo(
    () => [
      { header: "Divisi", accessorKey: "divisionName" },
      { header: "Karyawan", accessorKey: "employeeCount" },
      {
        header: "Total THP",
        accessorKey: "totalTakeHomePay",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCurrency(row.original.totalTakeHomePay)}</span>
        ),
      },
      {
        header: "Bonus / Tunjangan",
        accessorKey: "totalAdditions",
        cell: ({ row }) => (
          <span className="tabular-nums text-emerald-700">{formatCurrency(row.original.totalAdditions)}</span>
        ),
      },
      {
        header: "Tagihan / Ganti Rugi",
        accessorKey: "totalDeductions",
        cell: ({ row }) => (
          <span className="tabular-nums text-red-600">{formatCurrency(row.original.totalDeductions)}</span>
        ),
      },
      {
        header: "Avg Performa",
        accessorKey: "averagePerformancePercent",
        cell: ({ row }) => <span>{row.original.averagePerformancePercent.toFixed(1)}%</span>,
      },
    ],
    []
  );

  const historyColumns: ColumnDef<PayrollPeriodRow>[] = useMemo(
    () => [
      {
        header: "Periode",
        accessorKey: "periodCode",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.periodCode}</p>
            <p className="text-xs text-slate-500">{row.original.periodLabel}</p>
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] ?? "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        header: "Finalisasi",
        accessorKey: "finalizedAt",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">{row.original.finalizedAt}</span>
        ),
      },
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                router.push(`/payroll?periodId=${row.original.id}`);
                setActiveTab("payroll");
              }}
            >
              Edit
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/payroll/${row.original.id}/export.xlsx`}>Rekap .xlsx</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`/payroll/${row.original.id}/slips.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                Slip .pdf
              </a>
            </Button>
          </div>
        ),
      },
    ],
    [router]
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
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "payroll" | "history")}
      className="space-y-4"
    >
      {/* Toolbar row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setPeriodDraft(createPeriodDraft());
                setPeriodOpen(true);
              }}
            >
              + Periode
            </Button>
          )}
        </div>
        <TabsList>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
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

      {/* PAYROLL TAB */}
      <TabsContent value="payroll" className="mt-0 space-y-5">
        {/* Period selector + action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {periods.length > 0 ? (
              <select
                value={activePeriodId ?? ""}
                onChange={(e) => router.push(`/payroll?periodId=${e.target.value}`)}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
              >
                {!activePeriodId && <option value="">Pilih periode...</option>}
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.periodCode}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-500">Belum ada periode payroll</span>
            )}
            {selectedPeriod && (
              <>
                <span className="text-sm text-slate-500">{selectedPeriod.periodLabel}</span>
                <Badge variant={STATUS_VARIANT[selectedPeriod.status] ?? "outline"}>
                  {selectedPeriod.status}
                </Badge>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && activePeriodId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGeneratePreview()}
                disabled={pending}
              >
                Generate Preview
              </Button>
            )}
            {canFinalize && (
              <Button
                size="sm"
                onClick={() => void handleFinalize()}
                disabled={pending || results.length === 0}
              >
                Finalisasi
              </Button>
            )}
            {canMarkPaid && (
              <Button size="sm" onClick={() => void handleMarkPaid()} disabled={pending}>
                Tandai PAID
              </Button>
            )}
            {canLock && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleLockPeriod()}
                disabled={pending}
              >
                Kunci Periode
              </Button>
            )}
            {activePeriodId && (
              <Button asChild variant="outline" size="sm">
                <a href={`/payroll/${activePeriodId}/export.xlsx`}>Export .xlsx</a>
              </Button>
            )}
          </div>
        </div>

        {!activePeriodId ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-sm text-slate-500">
            Pilih atau buat periode payroll untuk memulai.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Finance summary strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-500">Karyawan</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {financeSummary.employeeCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-500">Total THP</p>
                <p className="mt-1 text-base font-bold text-slate-900 tabular-nums">
                  {formatCurrency(financeSummary.totalTakeHomePay)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-500">Total Bonus</p>
                <p className="mt-1 text-base font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(financeSummary.totalAdditions)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-500">Total Potongan</p>
                <p className="mt-1 text-base font-bold text-red-600 tabular-nums">
                  {formatCurrency(financeSummary.totalDeductions)}
                </p>
              </div>
            </div>

            {/* Results table */}
            <DataTable
              data={results}
              columns={resultColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari karyawan..."
            />

            {/* Division summary */}
            {divisionSummaries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Ringkasan per Divisi</h4>
                <DataTable
                  data={divisionSummaries}
                  columns={divisionSummaryColumns}
                  searchKey="divisionName"
                  searchPlaceholder="Cari divisi..."
                />
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* HISTORY TAB */}
      <TabsContent value="history" className="mt-0">
        {periods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-sm text-slate-500">
            Belum ada periode payroll yang dibuat.
          </div>
        ) : (
          <DataTable
            data={periods}
            columns={historyColumns}
            searchKey="periodCode"
            searchPlaceholder="Cari periode..."
          />
        )}
      </TabsContent>

      {/* Create Period Dialog */}
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
                onChange={(e) => setPeriodDraft((d) => ({ ...d, periodCode: e.target.value }))}
                placeholder="2026-05"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <Input
                value={periodDraft.notes}
                onChange={(e) => setPeriodDraft((d) => ({ ...d, notes: e.target.value }))}
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
    </Tabs>
  );
}
