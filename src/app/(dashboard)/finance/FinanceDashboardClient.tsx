"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import type {
  PayrollDivisionSummaryRow,
  PayrollFinanceSummary,
  PayrollPeriodRow,
  PayrollResultRow,
} from "../payroll/PayrollClient";

type Props = {
  activePeriodId: string | null;
  periods: PayrollPeriodRow[];
  financeSummary: PayrollFinanceSummary;
  divisionSummaries: PayrollDivisionSummaryRow[];
  results: PayrollResultRow[];
};

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

export default function FinanceDashboardClient({
  activePeriodId,
  periods,
  financeSummary,
  divisionSummaries,
  results,
}: Props) {
  const divisionColumns: ColumnDef<PayrollDivisionSummaryRow>[] = useMemo(
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
    ],
    []
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
        header: "THP",
        accessorKey: "takeHomePay",
        cell: ({ row }) => <span>{formatCurrency(row.original.takeHomePay)}</span>,
      },
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) =>
          activePeriodId ? (
            <Link className="text-sm font-medium text-slate-900 underline" href={`/payroll/${activePeriodId}/${row.original.employeeId}`}>
              Detail
            </Link>
          ) : null,
      },
    ],
    [activePeriodId]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Karyawan</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{financeSummary.employeeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total THP</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(financeSummary.totalTakeHomePay)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Addition</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(financeSummary.totalAdditions)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Deduction</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(financeSummary.totalDeductions)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Periode Finance</p>
            <p className="mt-1 text-xs text-slate-500">Pilih periode untuk summary dan export.</p>
          </div>
          {periods.map((period) => {
            const isActive = period.id === activePeriodId;
            return (
              <Link
                key={period.id}
                href={`/finance?periodId=${period.id}`}
                className={`block rounded-xl border p-4 transition-colors ${
                  isActive ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{period.periodCode}</p>
                  <Badge variant="outline">{period.status}</Badge>
                </div>
                <p className={`mt-2 text-sm ${isActive ? "text-slate-200" : "text-slate-500"}`}>{period.periodLabel}</p>
              </Link>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {activePeriodId ? (
              <a
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-xs"
                href={`/payroll/${activePeriodId}/export.xlsx`}
              >
                Export Excel
              </a>
            ) : null}
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-xs"
              href={activePeriodId ? `/payroll?periodId=${activePeriodId}` : "/payroll"}
            >
              Buka Modul Payroll
            </Link>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Summary per Divisi</h3>
              <p className="text-sm text-slate-500">Ringkasan biaya payroll per divisi pada periode aktif.</p>
            </div>
            <DataTable
              data={divisionSummaries}
              columns={divisionColumns}
              searchKey="divisionName"
              searchPlaceholder="Cari divisi..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Ringkasan Karyawan</h3>
              <p className="text-sm text-slate-500">Daftar hasil payroll final/draft yang siap diaudit.</p>
            </div>
            <DataTable
              data={results}
              columns={resultColumns}
              searchKey="employeeName"
              searchPlaceholder="Cari karyawan..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
