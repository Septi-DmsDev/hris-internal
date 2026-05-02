"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  addPayrollAdjustment,
  upsertEmployeeSalaryConfig,
  upsertGradeCompensationConfig,
} from "@/server/actions/payroll";
import type {
  PayrollAdjustmentRow,
  PayrollGradeCompensationRow,
  PayrollPeriodRow,
  PayrollSalaryConfigRow,
} from "../payroll/PayrollClient";

type Props = {
  canManage: boolean;
  activePeriodId: string | null;
  periods: PayrollPeriodRow[];
  salaryConfigs: PayrollSalaryConfigRow[];
  gradeCompensations: PayrollGradeCompensationRow[];
  adjustments: PayrollAdjustmentRow[];
};

type SalaryDraft = {
  employeeId: string;
  employeeLabel: string;
  baseSalaryAmount: string;
  notes: string;
};

type GradeDraft = {
  gradeId: string;
  gradeLabel: string;
  allowanceAmount: string;
  bonusKinerja80: string;
  bonusKinerja90: string;
  bonusKinerja100: string;
  bonusKinerjaTeam80: string;
  bonusKinerjaTeam90: string;
  bonusKinerjaTeam100: string;
  bonusDisiplin80: string;
  bonusDisiplin90: string;
  bonusDisiplin100: string;
  bonusPrestasi140: string;
  bonusPrestasi165: string;
};

type AdjustmentDraft = {
  employeeId: string;
  adjustmentType: "ADDITION" | "DEDUCTION";
  amount: string;
  reason: string;
};

function fmt(amount: number | null) {
  if (amount == null || amount === 0) return "-";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function asInput(value: number | null) {
  return value == null ? "" : String(value);
}

function emptySalaryDraft(row?: PayrollSalaryConfigRow): SalaryDraft {
  return {
    employeeId: row?.employeeId ?? "",
    employeeLabel: row ? `${row.employeeName} · ${row.employeeCode}` : "",
    baseSalaryAmount: asInput(row?.baseSalaryAmount ?? null),
    notes: row?.notes ?? "",
  };
}

function emptyGradeDraft(row?: PayrollGradeCompensationRow): GradeDraft {
  return {
    gradeId: row?.gradeId ?? "",
    gradeLabel: row?.gradeName ?? "",
    allowanceAmount: asInput(row?.allowanceAmount ?? null),
    bonusKinerja80: asInput(row?.bonusKinerja80 ?? null),
    bonusKinerja90: asInput(row?.bonusKinerja90 ?? null),
    bonusKinerja100: asInput(row?.bonusKinerja100 ?? null),
    bonusKinerjaTeam80: asInput(row?.bonusKinerjaTeam80 ?? null),
    bonusKinerjaTeam90: asInput(row?.bonusKinerjaTeam90 ?? null),
    bonusKinerjaTeam100: asInput(row?.bonusKinerjaTeam100 ?? null),
    bonusDisiplin80: asInput(row?.bonusDisiplin80 ?? null),
    bonusDisiplin90: asInput(row?.bonusDisiplin90 ?? null),
    bonusDisiplin100: asInput(row?.bonusDisiplin100 ?? null),
    bonusPrestasi140: asInput(row?.bonusPrestasi140 ?? null),
    bonusPrestasi165: asInput(row?.bonusPrestasi165 ?? null),
  };
}

export default function FinanceDashboardClient({
  canManage,
  activePeriodId,
  periods,
  salaryConfigs,
  gradeCompensations,
  adjustments,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState<SalaryDraft>(emptySalaryDraft());

  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeDraft, setGradeDraft] = useState<GradeDraft>(emptyGradeDraft());

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentDraft, setAdjustmentDraft] = useState<AdjustmentDraft>({
    employeeId: salaryConfigs[0]?.employeeId ?? "",
    adjustmentType: "DEDUCTION",
    amount: "",
    reason: "",
  });

  async function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return false;
      }
      setSuccess("Perubahan berhasil disimpan.");
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  const salaryColumns: ColumnDef<PayrollSalaryConfigRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-500">{row.original.employeeCode} · {row.original.divisionName}</p>
          </div>
        ),
      },
      {
        header: "Grup",
        accessorKey: "employeeGroup",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.employeeGroup}</Badge>
        ),
      },
      {
        header: "Gaji Pokok",
        accessorKey: "baseSalaryAmount",
        cell: ({ row }) => <span>{fmt(row.original.baseSalaryAmount)}</span>,
      },
      {
        header: "Update",
        accessorKey: "updatedAt",
        cell: ({ row }) => <span className="text-slate-500 text-xs">{row.original.updatedAt}</span>,
      },
      {
        header: "",
        id: "action",
        cell: ({ row }) =>
          canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSalaryDraft(emptySalaryDraft(row.original));
                setError(null);
                setSuccess(null);
                setSalaryOpen(true);
              }}
            >
              Atur
            </Button>
          ) : null,
      },
    ],
    [canManage]
  );

  const gradeColumns: ColumnDef<PayrollGradeCompensationRow>[] = useMemo(
    () => [
      { header: "Grade", accessorKey: "gradeName" },
      {
        header: "Tunjangan",
        accessorKey: "allowanceAmount",
        cell: ({ row }) => <span>{fmt(row.original.allowanceAmount)}</span>,
      },
      {
        header: "Kinerja 80 / 90 / 100",
        id: "kinerja",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {fmt(row.original.bonusKinerja80)} / {fmt(row.original.bonusKinerja90)} / {fmt(row.original.bonusKinerja100)}
          </span>
        ),
      },
      {
        header: "Disiplin 80 / 90 / 100",
        id: "disiplin",
        cell: ({ row }) => (
          <span className="text-xs text-slate-600">
            {fmt(row.original.bonusDisiplin80)} / {fmt(row.original.bonusDisiplin90)} / {fmt(row.original.bonusDisiplin100)}
          </span>
        ),
      },
      {
        header: "",
        id: "action",
        cell: ({ row }) =>
          canManage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGradeDraft(emptyGradeDraft(row.original));
                setError(null);
                setSuccess(null);
                setGradeOpen(true);
              }}
            >
              Atur
            </Button>
          ) : null,
      },
    ],
    [canManage]
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
          <Badge variant={row.original.adjustmentType === "ADDITION" ? "default" : "destructive"}>
            {row.original.adjustmentType}
          </Badge>
        ),
      },
      {
        header: "Nominal",
        accessorKey: "amount",
        cell: ({ row }) => <span>{fmt(row.original.amount)}</span>,
      },
      { header: "Alasan", accessorKey: "reason" },
      {
        header: "Tanggal",
        accessorKey: "createdAt",
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.createdAt}</span>,
      },
    ],
    []
  );

  const activePeriod = periods.find((p) => p.id === activePeriodId);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      ) : null}

      <Tabs defaultValue="salary">
        <TabsList>
          <TabsTrigger value="salary">Pengaturan Gaji Pokok</TabsTrigger>
          <TabsTrigger value="grade">Master Bonus & Tunjangan Grade</TabsTrigger>
          <TabsTrigger value="adjustment">Adjustment</TabsTrigger>
        </TabsList>

        {/* Tab 1 - Gaji Pokok per Karyawan */}
        <TabsContent value="salary">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Atur gaji pokok per karyawan. Data ini digunakan sebagai dasar perhitungan payroll.
            </p>
            <DataTable
              data={salaryConfigs}
              columns={salaryColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari karyawan..."
            />
          </div>
        </TabsContent>

        {/* Tab 2 - Master Grade */}
        <TabsContent value="grade">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Atur tunjangan dan bonus per grade jabatan. Berlaku untuk semua karyawan dengan grade tersebut.
            </p>
            <DataTable
              data={gradeCompensations}
              columns={gradeColumns}
              searchKey="gradeName"
              searchPlaceholder="Cari grade..."
            />
          </div>
        </TabsContent>

        {/* Tab 3 - Adjustment */}
        <TabsContent value="adjustment">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  value={activePeriodId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) router.push(`/finance?periodId=${id}`);
                  }}
                >
                  <option value="" disabled>Pilih periode</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.periodCode} — {p.status}
                    </option>
                  ))}
                </select>
                {activePeriod ? (
                  <span className="text-sm text-slate-500">{activePeriod.periodLabel}</span>
                ) : null}
              </div>
              {canManage && activePeriodId ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setAdjustmentDraft({
                      employeeId: salaryConfigs[0]?.employeeId ?? "",
                      adjustmentType: "DEDUCTION",
                      amount: "",
                      reason: "",
                    });
                    setError(null);
                    setSuccess(null);
                    setAdjustmentOpen(true);
                  }}
                >
                  Tambah Adjustment
                </Button>
              ) : null}
            </div>
            {activePeriodId ? (
              <DataTable
                data={adjustments}
                columns={adjustmentColumns}
                searchKey="employeeName"
                searchPlaceholder="Cari karyawan..."
              />
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">Pilih periode untuk melihat adjustment.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Atur Gaji Pokok */}
      <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Gaji Pokok</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={salaryDraft.employeeLabel} disabled />
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Gaji Pokok (Rp)</label>
              <Input
                type="number"
                placeholder="Nominal gaji pokok"
                value={salaryDraft.baseSalaryAmount}
                onChange={(e) => setSalaryDraft((v) => ({ ...v, baseSalaryAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Catatan (opsional)</label>
              <Input
                placeholder="Catatan"
                value={salaryDraft.notes}
                onChange={(e) => setSalaryDraft((v) => ({ ...v, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryOpen(false)} disabled={pending}>Batal</Button>
            <Button
              disabled={pending}
              onClick={async () => {
                const ok = await runAction(() =>
                  upsertEmployeeSalaryConfig({
                    employeeId: salaryDraft.employeeId,
                    baseSalaryAmount: salaryDraft.baseSalaryAmount,
                    notes: salaryDraft.notes,
                  })
                );
                if (ok) setSalaryOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Atur Grade Compensation */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Atur Bonus & Tunjangan — {gradeDraft.gradeLabel}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-slate-500">Tunjangan Grade (Rp)</label>
              <Input type="number" placeholder="Tunjangan" value={gradeDraft.allowanceAmount} onChange={(e) => setGradeDraft((v) => ({ ...v, allowanceAmount: e.target.value }))} />
            </div>
            <div className="col-span-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Bonus Kinerja Individu</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">80%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusKinerja80} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusKinerja80: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">90%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusKinerja90} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusKinerja90: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">100%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusKinerja100} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusKinerja100: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="col-span-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Bonus Kinerja Tim</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">80%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusKinerjaTeam80} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusKinerjaTeam80: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">90%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusKinerjaTeam90} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusKinerjaTeam90: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">100%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusKinerjaTeam100} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusKinerjaTeam100: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="col-span-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Bonus Disiplin</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">80%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusDisiplin80} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusDisiplin80: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">90%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusDisiplin90} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusDisiplin90: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">100%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusDisiplin100} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusDisiplin100: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="col-span-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Bonus Prestasi</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">140%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusPrestasi140} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusPrestasi140: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">165%</label>
                  <Input type="number" placeholder="0" value={gradeDraft.bonusPrestasi165} onChange={(e) => setGradeDraft((v) => ({ ...v, bonusPrestasi165: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeOpen(false)} disabled={pending}>Batal</Button>
            <Button
              disabled={pending}
              onClick={async () => {
                const ok = await runAction(() =>
                  upsertGradeCompensationConfig({
                    gradeId: gradeDraft.gradeId,
                    allowanceAmount: gradeDraft.allowanceAmount,
                    bonusKinerja80: gradeDraft.bonusKinerja80,
                    bonusKinerja90: gradeDraft.bonusKinerja90,
                    bonusKinerja100: gradeDraft.bonusKinerja100,
                    bonusKinerjaTeam80: gradeDraft.bonusKinerjaTeam80,
                    bonusKinerjaTeam90: gradeDraft.bonusKinerjaTeam90,
                    bonusKinerjaTeam100: gradeDraft.bonusKinerjaTeam100,
                    bonusDisiplin80: gradeDraft.bonusDisiplin80,
                    bonusDisiplin90: gradeDraft.bonusDisiplin90,
                    bonusDisiplin100: gradeDraft.bonusDisiplin100,
                    bonusPrestasi140: gradeDraft.bonusPrestasi140,
                    bonusPrestasi165: gradeDraft.bonusPrestasi165,
                    isActive: true,
                  })
                );
                if (ok) setGradeOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Adjustment */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Karyawan</label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={adjustmentDraft.employeeId}
                onChange={(e) => setAdjustmentDraft((v) => ({ ...v, employeeId: e.target.value }))}
              >
                <option value="">Pilih karyawan</option>
                {salaryConfigs.map((row) => (
                  <option key={row.employeeId} value={row.employeeId}>
                    {row.employeeName} · {row.employeeCode}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Tipe</label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={adjustmentDraft.adjustmentType}
                onChange={(e) =>
                  setAdjustmentDraft((v) => ({ ...v, adjustmentType: e.target.value as "ADDITION" | "DEDUCTION" }))
                }
              >
                <option value="ADDITION">ADDITION — Tambah</option>
                <option value="DEDUCTION">DEDUCTION — Kurang</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Nominal (Rp)</label>
              <Input
                type="number"
                placeholder="Nominal"
                value={adjustmentDraft.amount}
                onChange={(e) => setAdjustmentDraft((v) => ({ ...v, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Alasan</label>
              <Input
                placeholder="Alasan adjustment"
                value={adjustmentDraft.reason}
                onChange={(e) => setAdjustmentDraft((v) => ({ ...v, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)} disabled={pending}>Batal</Button>
            <Button
              disabled={pending || !activePeriodId}
              onClick={async () => {
                if (!activePeriodId) return;
                const ok = await runAction(() =>
                  addPayrollAdjustment({
                    periodId: activePeriodId,
                    employeeId: adjustmentDraft.employeeId,
                    adjustmentType: adjustmentDraft.adjustmentType,
                    amount: adjustmentDraft.amount,
                    reason: adjustmentDraft.reason,
                  })
                );
                if (ok) setAdjustmentOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
