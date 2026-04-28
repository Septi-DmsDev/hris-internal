"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { syncPointCatalogFromWorkbook } from "@/server/actions/point-catalog";
import {
  approveDailyActivityEntry,
  deleteActivityEntry,
  generateMonthlyPerformance,
  rejectDailyActivityEntry,
  saveDailyActivityEntry,
  submitDailyActivityEntry,
} from "@/server/actions/performance";
import type { UserRole } from "@/types";

export type PerformanceVersionRow = {
  id: string;
  code: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  sourceFileName: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  importedAt: string;
};

export type PerformanceDivisionTargetRow = {
  divisionName: string;
  targetPoints: number;
  source: "DEFAULT" | "OVERRIDE";
};

export type PerformanceCatalogEntryRow = {
  id: string;
  divisionName: string;
  externalCode: string;
  workName: string;
  pointValue: string;
  unitDescription: string;
};

export type PerformanceEmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  divisionId: string;
  divisionName: string;
  employmentStatus: string;
};

export type PerformanceDivisionOption = {
  id: string;
  name: string;
};

export type PerformanceActivityRow = {
  id: string;
  employeeId: string;
  pointCatalogEntryId: string;
  employeeName: string;
  employeeCode: string;
  employeeDivisionId: string | null;
  employeeDivisionName: string;
  workDate: string;
  actualDivisionId: string | null;
  actualDivisionName: string;
  workNameSnapshot: string;
  pointCatalogDivisionName: string;
  pointValueSnapshot: string;
  quantity: string;
  totalPoints: string;
  status:
    | "DRAFT"
    | "DIAJUKAN"
    | "DITOLAK_SPV"
    | "REVISI_TW"
    | "DIAJUKAN_ULANG"
    | "DISETUJUI_SPV"
    | "OVERRIDE_HRD"
    | "DIKUNCI_PAYROLL";
  notes: string;
  submittedAt: string;
  approvedAt: string;
  rejectedAt: string;
  createdAt: string;
};

export type PerformanceMonthlyRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeDivisionId: string | null;
  employeeDivisionName: string;
  periodStartDate: string;
  periodEndDate: string;
  divisionSnapshotName: string;
  targetDailyPoints: number;
  targetDays: number;
  totalTargetPoints: number;
  totalApprovedPoints: string;
  performancePercent: string;
  status: "DRAFT" | "FINALIZED" | "LOCKED";
  calculatedAt: string;
};

type ImportDraft = {
  workbookPath: string;
  versionCode: string;
  effectiveStartDate: string;
  notes: string;
  activateVersion: boolean;
};

type ActivityDraft = {
  id?: string;
  employeeId: string;
  workDate: string;
  actualDivisionId: string;
  pointCatalogEntryId: string;
  quantity: string;
  notes: string;
};

type MonthlyDraft = {
  periodStartDate: string;
  periodEndDate: string;
};

type DecisionAction = "submit" | "approve" | "reject";

type DecisionState = {
  action: DecisionAction;
  activityId: string;
  title: string;
  rowLabel: string;
};

const ACTIVITY_STATUS_VARIANT: Record<
  PerformanceActivityRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  DIAJUKAN: "secondary",
  DIAJUKAN_ULANG: "secondary",
  DITOLAK_SPV: "destructive",
  REVISI_TW: "outline",
  DISETUJUI_SPV: "default",
  OVERRIDE_HRD: "default",
  DIKUNCI_PAYROLL: "default",
};

const ACTIVITY_STATUS_LABEL: Record<PerformanceActivityRow["status"], string> = {
  DRAFT: "Draft",
  DIAJUKAN: "Diajukan",
  DIAJUKAN_ULANG: "Diajukan Ulang",
  DITOLAK_SPV: "Ditolak SPV",
  REVISI_TW: "Revisi TW",
  DISETUJUI_SPV: "Disetujui SPV",
  OVERRIDE_HRD: "Override HRD",
  DIKUNCI_PAYROLL: "Dikunci Payroll",
};

function createImportDraft(): ImportDraft {
  return {
    workbookPath: "",
    versionCode: `points-${new Date().toISOString().slice(0, 10)}`,
    effectiveStartDate: new Date().toISOString().slice(0, 10),
    notes: "",
    activateVersion: true,
  };
}

function createActivityDraft(): ActivityDraft {
  return {
    employeeId: "",
    workDate: new Date().toISOString().slice(0, 10),
    actualDivisionId: "",
    pointCatalogEntryId: "",
    quantity: "1",
    notes: "",
  };
}

function createMonthlyDraft(): MonthlyDraft {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  return {
    periodStartDate: `${year}-${month}-01`,
    periodEndDate: `${year}-${month}-28`,
  };
}

type PerformanceCatalogClientProps = {
  role: UserRole;
  canManageCatalog: boolean;
  canManageActivities: boolean;
  canGenerateMonthly: boolean;
  activeVersionCode: string | null;
  totalEntries: number;
  totalDivisions: number;
  versions: PerformanceVersionRow[];
  divisionTargets: PerformanceDivisionTargetRow[];
  entries: PerformanceCatalogEntryRow[];
  allCatalogEntries: PerformanceCatalogEntryRow[];
  employeeOptions: PerformanceEmployeeOption[];
  divisionOptions: PerformanceDivisionOption[];
  activityEntries: PerformanceActivityRow[];
  monthlyPerformances: PerformanceMonthlyRow[];
};

export default function PerformanceCatalogClient({
  role,
  canManageCatalog,
  canManageActivities,
  canGenerateMonthly,
  activeVersionCode,
  totalEntries,
  totalDivisions,
  versions,
  divisionTargets,
  entries,
  allCatalogEntries,
  employeeOptions,
  divisionOptions,
  activityEntries,
  monthlyPerformances,
}: PerformanceCatalogClientProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [decisionState, setDecisionState] = useState<DecisionState | null>(null);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [importDraft, setImportDraft] = useState<ImportDraft>(createImportDraft());
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(createActivityDraft());
  const [monthlyDraft, setMonthlyDraft] = useState<MonthlyDraft>(createMonthlyDraft());
  const [decisionNotes, setDecisionNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const selectedCatalogEntry = useMemo(
    () => allCatalogEntries.find((e) => e.id === activityDraft.pointCatalogEntryId) ?? null,
    [activityDraft.pointCatalogEntryId, allCatalogEntries]
  );

  const liveTotal = useMemo(() => {
    if (!selectedCatalogEntry) return null;
    const pv = Number(selectedCatalogEntry.pointValue);
    const qty = Number(activityDraft.quantity);
    if (Number.isNaN(pv) || Number.isNaN(qty) || qty <= 0) return null;
    return (pv * qty).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }, [selectedCatalogEntry, activityDraft.quantity]);

  const filteredCatalogEntries = useMemo(() => {
    if (!activityDraft.actualDivisionId) return allCatalogEntries;
    const selectedDivision = divisionOptions.find(
      (division) => division.id === activityDraft.actualDivisionId
    );
    if (!selectedDivision) return allCatalogEntries;
    return allCatalogEntries.filter(
      (entry) => entry.divisionName.toUpperCase() === selectedDivision.name.toUpperCase()
    );
  }, [activityDraft.actualDivisionId, allCatalogEntries, divisionOptions]);

  function resetMessages() {
    setFormError(null);
    setLastResult(null);
  }

  function updateImportDraft(field: keyof ImportDraft, value: string | boolean) {
    setImportDraft((current) => ({ ...current, [field]: value }));
  }

  function updateActivityDraft(field: keyof ActivityDraft, value: string) {
    setActivityDraft((current) => ({ ...current, [field]: value }));
  }

  function updateMonthlyDraft(field: keyof MonthlyDraft, value: string) {
    setMonthlyDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSync() {
    setPending(true);
    resetMessages();
    try {
      const result = await syncPointCatalogFromWorkbook(importDraft);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setLastResult(
        `Versi ${result.importedVersionCode} berhasil diimpor: ${result.importedEntries} entry, ${result.importedDivisions} divisi.`
      );
      setImportOpen(false);
      setImportDraft(createImportDraft());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleSaveActivity() {
    setPending(true);
    resetMessages();
    try {
      const result = await saveDailyActivityEntry({
        id: activityDraft.id,
        employeeId: activityDraft.employeeId,
        workDate: activityDraft.workDate,
        actualDivisionId: activityDraft.actualDivisionId,
        pointCatalogEntryId: activityDraft.pointCatalogEntryId,
        quantity: activityDraft.quantity,
        notes: activityDraft.notes,
      });
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setActivityOpen(false);
      setActivityDraft(createActivityDraft());
      setLastResult("Aktivitas berhasil disimpan.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDecision() {
    if (!decisionState) return;
    setPending(true);
    resetMessages();
    try {
      const payload = {
        activityEntryId: decisionState.activityId,
        notes: decisionNotes,
      };
      const result =
        decisionState.action === "submit"
          ? await submitDailyActivityEntry(payload)
          : decisionState.action === "approve"
            ? await approveDailyActivityEntry(payload)
            : await rejectDailyActivityEntry(payload);

      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setDecisionState(null);
      setDecisionNotes("");
      setLastResult(
        decisionState.action === "submit"
          ? "Aktivitas berhasil diajukan."
          : decisionState.action === "approve"
            ? "Aktivitas berhasil diproses."
            : "Aktivitas berhasil ditolak."
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    setPending(true);
    resetMessages();
    try {
      const result = await deleteActivityEntry(deleteTargetId);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setDeleteTargetId(null);
      setLastResult("Aktivitas berhasil dihapus.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleGenerateMonthly() {
    setPending(true);
    resetMessages();
    try {
      const result = await generateMonthlyPerformance(monthlyDraft);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setMonthlyOpen(false);
      setLastResult(`Monthly performance berhasil digenerate untuk ${result.generatedEmployees} karyawan.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const versionColumns: ColumnDef<PerformanceVersionRow>[] = useMemo(
    () => [
      { header: "Versi", accessorKey: "code" },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "ACTIVE"
                ? "default"
                : row.original.status === "DRAFT"
                  ? "outline"
                  : "secondary"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      { header: "Sumber", accessorKey: "sourceFileName" },
      { header: "Efektif Mulai", accessorKey: "effectiveStartDate" },
      { header: "Efektif Sampai", accessorKey: "effectiveEndDate" },
      { header: "Diimpor", accessorKey: "importedAt" },
    ],
    []
  );

  const targetColumns: ColumnDef<PerformanceDivisionTargetRow>[] = useMemo(
    () => [
      { header: "Divisi", accessorKey: "divisionName" },
      {
        header: "Target Harian",
        accessorKey: "targetPoints",
        cell: ({ row }) => row.original.targetPoints.toLocaleString("id-ID"),
      },
      {
        header: "Sumber Rule",
        accessorKey: "source",
        cell: ({ row }) => (
          <Badge variant={row.original.source === "OVERRIDE" ? "default" : "secondary"}>
            {row.original.source === "OVERRIDE" ? "Override" : "Default"}
          </Badge>
        ),
      },
    ],
    []
  );

  const entryColumns: ColumnDef<PerformanceCatalogEntryRow>[] = useMemo(
    () => [
      { header: "Divisi", accessorKey: "divisionName" },
      { header: "Kode", accessorKey: "externalCode" },
      { header: "Pekerjaan", accessorKey: "workName" },
      { header: "Poin", accessorKey: "pointValue" },
      { header: "Satuan", accessorKey: "unitDescription" },
    ],
    []
  );

  const activityColumns: ColumnDef<PerformanceActivityRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-500">
              {row.original.employeeCode} · {row.original.employeeDivisionName}
            </p>
          </div>
        ),
      },
      { header: "Tanggal", accessorKey: "workDate" },
      {
        header: "Aktivitas",
        accessorKey: "workNameSnapshot",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-slate-900">{row.original.workNameSnapshot}</p>
            <p className="text-xs text-slate-500">
              {row.original.actualDivisionName} · {row.original.pointValueSnapshot} × {row.original.quantity}
            </p>
          </div>
        ),
      },
      {
        header: "Total Poin",
        accessorKey: "totalPoints",
        cell: ({ row }) => (
          <span className="font-medium">
            {Number(row.original.totalPoints).toLocaleString("id-ID")}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge variant={ACTIVITY_STATUS_VARIANT[row.original.status]}>
            {ACTIVITY_STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) => {
          const entry = row.original;
          const isMutable = ["DRAFT", "DITOLAK_SPV", "REVISI_TW"].includes(entry.status);
          const isApprovable = ["DIAJUKAN", "DIAJUKAN_ULANG"].includes(entry.status);
          const canApprove =
            role === "SPV" || role === "HRD" || role === "SUPER_ADMIN";

          return (
            <div className="flex flex-wrap gap-1.5">
              {canManageActivities && isMutable ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setActivityDraft({
                        id: entry.id,
                        employeeId: entry.employeeId,
                        workDate: entry.workDate,
                        actualDivisionId: entry.actualDivisionId ?? "",
                        pointCatalogEntryId: entry.pointCatalogEntryId,
                        quantity: entry.quantity,
                        notes: entry.notes,
                      });
                      setActivityOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDecisionState({
                        action: "submit",
                        activityId: entry.id,
                        title: "Ajukan Aktivitas",
                        rowLabel: `${entry.employeeName} · ${entry.workNameSnapshot}`,
                      })
                    }
                  >
                    Ajukan
                  </Button>
                  {entry.status === "DRAFT" ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTargetId(entry.id)}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </>
              ) : null}
              {canApprove && isApprovable ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setDecisionState({
                        action: "approve",
                        activityId: entry.id,
                        title: role === "SPV" ? "Setujui Aktivitas" : "Override HRD",
                        rowLabel: `${entry.employeeName} · ${entry.workNameSnapshot}`,
                      })
                    }
                  >
                    {role === "SPV" ? "Setujui" : "Override"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setDecisionState({
                        action: "reject",
                        activityId: entry.id,
                        title: "Tolak Aktivitas",
                        rowLabel: `${entry.employeeName} · ${entry.workNameSnapshot}`,
                      })
                    }
                  >
                    Tolak
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canManageActivities, role]
  );

  const monthlyColumns: ColumnDef<PerformanceMonthlyRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-500">
              {row.original.employeeCode} · {row.original.divisionSnapshotName}
            </p>
          </div>
        ),
      },
      {
        header: "Periode",
        id: "period",
        cell: ({ row }) =>
          `${row.original.periodStartDate} s/d ${row.original.periodEndDate}`,
      },
      {
        header: "Target",
        id: "target",
        cell: ({ row }) =>
          `${row.original.targetDailyPoints.toLocaleString("id-ID")} × ${row.original.targetDays} hr = ${row.original.totalTargetPoints.toLocaleString("id-ID")}`,
      },
      {
        header: "Approved",
        accessorKey: "totalApprovedPoints",
        cell: ({ row }) => Number(row.original.totalApprovedPoints).toLocaleString("id-ID"),
      },
      {
        header: "Performa",
        accessorKey: "performancePercent",
        cell: ({ row }) => {
          const pct = Number(row.original.performancePercent);
          const color =
            pct >= 100 ? "text-emerald-600" : pct >= 80 ? "text-amber-600" : "text-red-600";
          return <span className={`font-semibold ${color}`}>{pct.toFixed(1)}%</span>;
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "LOCKED"
                ? "default"
                : row.original.status === "FINALIZED"
                  ? "secondary"
                  : "outline"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Versi Aktif</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">
            {activeVersionCode ?? "-"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Entry Aktif</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">
            {totalEntries.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Divisi Aktif</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900">{totalDivisions}</p>
        </div>
      </div>

      {lastResult ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {lastResult}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Aktivitas Harian</TabsTrigger>
          <TabsTrigger value="monthly">Performa Bulanan</TabsTrigger>
          <TabsTrigger value="catalog">Katalog Poin</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Aktivitas Harian</h2>
              <p className="text-sm text-slate-500">
                Input pekerjaan harian berbasis katalog poin aktif, subject to approval SPV/HRD.
              </p>
            </div>
            <div className="flex gap-2">
              {canGenerateMonthly ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetMessages();
                    setMonthlyOpen(true);
                  }}
                >
                  Generate Monthly
                </Button>
              ) : null}
              {canManageActivities ? (
                <Button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setActivityDraft(createActivityDraft());
                    setActivityOpen(true);
                  }}
                >
                  Tambah Aktivitas
                </Button>
              ) : null}
            </div>
          </div>
          <DataTable
            data={activityEntries}
            columns={activityColumns}
            searchKey="employeeName"
            searchPlaceholder="Cari karyawan..."
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Performa Bulanan</h2>
            <p className="text-sm text-slate-500">
              Rekap poin approved vs target divisi snapshot per periode yang digenerate.
            </p>
          </div>
          <DataTable
            data={monthlyPerformances}
            columns={monthlyColumns}
            searchKey="employeeName"
            searchPlaceholder="Cari karyawan..."
          />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Manajemen Katalog</h2>
              <p className="text-sm text-slate-500">
                {canManageCatalog
                  ? "HRD dan Super Admin dapat sinkronkan workbook poin ke versi katalog baru."
                  : "Role ini hanya memiliki akses baca untuk katalog poin."}
              </p>
            </div>
            {canManageCatalog ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetMessages();
                  setImportDraft(createImportDraft());
                  setImportOpen(true);
                }}
              >
                Sinkronkan Workbook
              </Button>
            ) : null}
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Rule Target Divisi</h3>
            <p className="text-xs text-slate-500">
              Target poin harian mengikuti divisi payroll snapshot, bukan divisi kerja aktual harian.
            </p>
            <DataTable
              data={divisionTargets}
              columns={targetColumns}
              searchKey="divisionName"
              searchPlaceholder="Cari divisi..."
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Versi Katalog</h3>
            <p className="text-xs text-slate-500">
              Riwayat impor workbook master poin yang menjadi sumber transaksi aktivitas harian.
            </p>
            <DataTable
              data={versions}
              columns={versionColumns}
              searchKey="code"
              searchPlaceholder="Cari kode versi..."
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Sample Katalog Aktif</h3>
            <p className="text-xs text-slate-500">
              Menampilkan hingga 250 baris pertama dari versi katalog aktif.
            </p>
            <DataTable
              data={entries}
              columns={entryColumns}
              searchKey="workName"
              searchPlaceholder="Cari nama pekerjaan..."
            />
          </section>
        </TabsContent>
      </Tabs>

      {/* Import Workbook Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sinkronkan Workbook Poin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Path Workbook</label>
              <Input
                value={importDraft.workbookPath}
                onChange={(event) => updateImportDraft("workbookPath", event.target.value)}
                placeholder="C:\Users\P C\Downloads\DATABASE POIN.xlsx"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Kode Versi</label>
                <Input
                  value={importDraft.versionCode}
                  onChange={(event) => updateImportDraft("versionCode", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tanggal Efektif</label>
                <Input
                  type="date"
                  value={importDraft.effectiveStartDate}
                  onChange={(event) => updateImportDraft("effectiveStartDate", event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                value={importDraft.notes}
                onChange={(event) => updateImportDraft("notes", event.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status Versi Baru</label>
              <select
                value={importDraft.activateVersion ? "true" : "false"}
                onChange={(event) =>
                  updateImportDraft("activateVersion", event.target.value === "true")
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="true">Aktifkan sebagai versi aktif</option>
                <option value="false">Simpan sebagai draft</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="button" onClick={() => void handleSync()} disabled={pending}>
              {pending ? "Menyinkronkan..." : "Sinkronkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Activity Dialog */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {activityDraft.id ? "Edit Aktivitas" : "Tambah Aktivitas"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Karyawan</label>
              <select
                value={activityDraft.employeeId}
                onChange={(event) => updateActivityDraft("employeeId", event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih karyawan</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.employeeCode}) · {employee.divisionName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tanggal Kerja</label>
              <Input
                type="date"
                value={activityDraft.workDate}
                onChange={(event) => updateActivityDraft("workDate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Divisi Aktual Harian</label>
              <select
                value={activityDraft.actualDivisionId}
                onChange={(event) => {
                  updateActivityDraft("actualDivisionId", event.target.value);
                  updateActivityDraft("pointCatalogEntryId", "");
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih divisi aktual</option>
                {divisionOptions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Qty</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={activityDraft.quantity}
                onChange={(event) => updateActivityDraft("quantity", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Pekerjaan Poin</label>
              <select
                value={activityDraft.pointCatalogEntryId}
                onChange={(event) =>
                  updateActivityDraft("pointCatalogEntryId", event.target.value)
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih pekerjaan</option>
                {filteredCatalogEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.workName} · {entry.pointValue} poin/{entry.unitDescription}
                  </option>
                ))}
              </select>
            </div>
            {liveTotal !== null ? (
              <div className="md:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                Total poin: <span className="font-semibold">{liveTotal}</span>
                {selectedCatalogEntry ? (
                  <span className="ml-2 text-emerald-600">
                    ({selectedCatalogEntry.pointValue} × {activityDraft.quantity})
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                value={activityDraft.notes}
                onChange={(event) => updateActivityDraft("notes", event.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActivityOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="button" onClick={() => void handleSaveActivity()} disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit / Approve / Reject Dialog */}
      <Dialog
        open={decisionState !== null}
        onOpenChange={(open) => !open && setDecisionState(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{decisionState?.title ?? "Proses Aktivitas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{decisionState?.rowLabel ?? ""}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                value={decisionNotes}
                onChange={(event) => setDecisionNotes(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDecisionState(null)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant={decisionState?.action === "reject" ? "destructive" : "default"}
              onClick={() => void handleDecision()}
              disabled={pending}
            >
              {pending ? "Memproses..." : "Lanjutkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Aktivitas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Aktivitas DRAFT ini akan dihapus permanen. Lanjutkan?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetId(null)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={pending}
            >
              {pending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Monthly Dialog */}
      <Dialog open={monthlyOpen} onOpenChange={setMonthlyOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate Monthly Performance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Menghitung ulang performa bulanan untuk semua karyawan TEAMWORK aktif pada periode yang
            dipilih. Data sebelumnya untuk periode yang sama akan ditimpa.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tanggal Awal Periode</label>
              <Input
                type="date"
                value={monthlyDraft.periodStartDate}
                onChange={(event) => updateMonthlyDraft("periodStartDate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tanggal Akhir Periode</label>
              <Input
                type="date"
                value={monthlyDraft.periodEndDate}
                onChange={(event) => updateMonthlyDraft("periodEndDate", event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMonthlyOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleGenerateMonthly()}
              disabled={pending}
            >
              {pending ? "Menghitung..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
