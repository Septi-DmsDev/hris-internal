"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEmployeeGroupConfig } from "@/server/actions/employee-group-configs";
import { resolveEmployeeGroupLabel, type EmployeeGroup } from "@/lib/employee-groups";

export type EmployeeGroupConfigRow = {
  id: string;
  employeeGroup: EmployeeGroup;
  displayName: string;
  baseSalaryAmount: number | null;
  legacyAlias: string | null;
  payrollMode: "KPI" | "POINT";
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function EmployeeGroupConfigsTable({ data }: { data: EmployeeGroupConfigRow[] }) {
  const router = useRouter();
  const [editingRow, setEditingRow] = useState<EmployeeGroupConfigRow | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleEditSubmit(formData: FormData) {
    if (!editingRow) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await updateEmployeeGroupConfig(editingRow.id, formData);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setEditingRow(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const columns: ColumnDef<EmployeeGroupConfigRow>[] = useMemo(
    () => [
      {
        header: "Kode Kelompok",
        accessorKey: "employeeGroup",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-900">{row.original.employeeGroup}</p>
            <p className="text-xs text-slate-500">{resolveEmployeeGroupLabel(row.original.employeeGroup)}</p>
          </div>
        ),
      },
      { header: "Nama Tampil", accessorKey: "displayName" },
      {
        header: "Gaji Pokok",
        accessorKey: "baseSalaryAmount",
        cell: ({ row }) =>
          row.original.baseSalaryAmount == null
            ? "-"
            : `Rp ${row.original.baseSalaryAmount.toLocaleString("id-ID")}`,
      },
      {
        header: "Mode Payroll",
        accessorKey: "payrollMode",
        cell: ({ row }) => (
          <Badge variant={row.original.payrollMode === "KPI" ? "outline" : "secondary"}>
            {row.original.payrollMode}
          </Badge>
        ),
      },
      {
        header: "Alias Legacy",
        accessorKey: "legacyAlias",
        cell: ({ row }) => row.original.legacyAlias || "-",
      },
      {
        header: "Urutan",
        accessorKey: "sortOrder",
        cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span>,
      },
      {
        header: "Status",
        accessorKey: "isActive",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        ),
      },
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setEditingRow(row.original);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <DataTable
        data={data}
        columns={columns}
        searchKey="displayName"
        searchPlaceholder="Cari kelompok karyawan..."
      />

      <Dialog
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kelompok Karyawan</DialogTitle>
          </DialogHeader>
          {editingRow ? (
            <form key={editingRow.id} action={handleEditSubmit} className="space-y-4">
              <input type="hidden" name="employeeGroup" value={editingRow.employeeGroup} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Kode Kelompok</label>
                <Input value={editingRow.employeeGroup} disabled />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-display-name" className="text-sm font-medium">
                  Nama Tampil
                </label>
                <Input id="group-display-name" name="displayName" defaultValue={editingRow.displayName} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-payroll-mode" className="text-sm font-medium">
                  Mode Payroll
                </label>
                <select
                  id="group-payroll-mode"
                  name="payrollMode"
                  defaultValue={editingRow.payrollMode}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="KPI">KPI</option>
                  <option value="POINT">POINT</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="group-base-salary" className="text-sm font-medium">
                  Gaji Pokok Kelompok (Rp)
                </label>
                <Input
                  id="group-base-salary"
                  name="baseSalaryAmount"
                  type="number"
                  defaultValue={editingRow.baseSalaryAmount ?? ""}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-legacy-alias" className="text-sm font-medium">
                  Alias Legacy
                </label>
                <Input id="group-legacy-alias" name="legacyAlias" defaultValue={editingRow.legacyAlias ?? ""} maxLength={50} />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-description" className="text-sm font-medium">
                  Deskripsi
                </label>
                <Input id="group-description" name="description" defaultValue={editingRow.description ?? ""} maxLength={255} />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-sort-order" className="text-sm font-medium">
                  Urutan
                </label>
                <Input id="group-sort-order" name="sortOrder" type="number" defaultValue={editingRow.sortOrder} min={0} max={999} />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-active" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="group-active"
                  name="isActive"
                  defaultValue={editingRow.isActive ? "true" : "false"}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingRow(null)} disabled={pending}>
                  Batal
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
