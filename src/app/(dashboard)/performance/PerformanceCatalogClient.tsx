"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { syncPointCatalogFromWorkbook } from "@/server/actions/point-catalog";

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

type ImportDraft = {
  workbookPath: string;
  versionCode: string;
  effectiveStartDate: string;
  notes: string;
  activateVersion: boolean;
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

type PerformanceCatalogClientProps = {
  canManageCatalog: boolean;
  activeVersionCode: string | null;
  totalEntries: number;
  totalDivisions: number;
  versions: PerformanceVersionRow[];
  divisionTargets: PerformanceDivisionTargetRow[];
  entries: PerformanceCatalogEntryRow[];
};

export default function PerformanceCatalogClient({
  canManageCatalog,
  activeVersionCode,
  totalEntries,
  totalDivisions,
  versions,
  divisionTargets,
  entries,
}: PerformanceCatalogClientProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState<ImportDraft>(createImportDraft());
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

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

  function updateDraft(field: keyof ImportDraft, value: string | boolean) {
    setImportDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSync() {
    setPending(true);
    setFormError(null);
    setLastResult(null);
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Versi Aktif</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {activeVersionCode ?? "-"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Entry Aktif</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalEntries}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Divisi Aktif</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalDivisions}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-500">
          {canManageCatalog
            ? "HRD dan Super Admin dapat sinkronkan workbook poin ke versi katalog baru."
            : "Role ini hanya memiliki akses baca untuk fondasi Performance Management."}
        </div>
        {canManageCatalog ? (
          <Button
            type="button"
            onClick={() => {
              setFormError(null);
              setLastResult(null);
              setImportDraft(createImportDraft());
              setImportOpen(true);
            }}
          >
            Sinkronkan Workbook Poin
          </Button>
        ) : null}
      </div>

      {lastResult ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {lastResult}
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Rule Target Divisi</h2>
          <p className="text-sm text-slate-500">
            Target poin harian mengikuti divisi payroll snapshot, bukan divisi kerja aktual harian.
          </p>
        </div>
        <DataTable
          data={divisionTargets}
          columns={targetColumns}
          searchKey="divisionName"
          searchPlaceholder="Cari divisi..."
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Versi Katalog</h2>
          <p className="text-sm text-slate-500">
            Riwayat impor workbook master poin yang menjadi sumber transaksi aktivitas harian.
          </p>
        </div>
        <DataTable
          data={versions}
          columns={versionColumns}
          searchKey="code"
          searchPlaceholder="Cari kode versi..."
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Sample Katalog Aktif</h2>
          <p className="text-sm text-slate-500">
            Menampilkan hingga 250 baris pertama dari versi katalog aktif.
          </p>
        </div>
        <DataTable
          data={entries}
          columns={entryColumns}
          searchKey="workName"
          searchPlaceholder="Cari nama pekerjaan..."
        />
      </section>

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
                onChange={(event) => updateDraft("workbookPath", event.target.value)}
                placeholder="C:\\Users\\P C\\Downloads\\DATABASE POIN.xlsx"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Kode Versi</label>
                <Input
                  value={importDraft.versionCode}
                  onChange={(event) => updateDraft("versionCode", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tanggal Efektif</label>
                <Input
                  type="date"
                  value={importDraft.effectiveStartDate}
                  onChange={(event) => updateDraft("effectiveStartDate", event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                value={importDraft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status Versi Baru</label>
              <select
                value={importDraft.activateVersion ? "true" : "false"}
                onChange={(event) =>
                  updateDraft("activateVersion", event.target.value === "true")
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="true">Aktifkan sebagai versi aktif</option>
                <option value="false">Simpan sebagai draft</option>
              </select>
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
