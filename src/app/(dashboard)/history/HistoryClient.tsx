"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/DataTable";

export type HistoryRow = {
  id: string;
  module: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actorRole: string | null;
  actorUserId: string | null;
  summary: string;
  payload: string;
  occurredAt: string;
};

type Props = {
  rows: HistoryRow[];
};

export default function HistoryClient({ rows }: Props) {
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");

  const moduleOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.module));
    return ["ALL", ...Array.from(set.values()).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (moduleFilter === "ALL") return rows;
    return rows.filter((row) => row.module === moduleFilter);
  }, [rows, moduleFilter]);

  const columns: ColumnDef<HistoryRow>[] = useMemo(
    () => [
      {
        header: "Waktu",
        accessorKey: "occurredAt",
      },
      {
        header: "Modul",
        accessorKey: "module",
        cell: ({ row }) => <Badge variant="outline">{row.original.module}</Badge>,
      },
      {
        header: "Event",
        accessorKey: "eventType",
      },
      {
        header: "Deskripsi",
        accessorKey: "summary",
        cell: ({ row }) => <p className="max-w-[360px] truncate">{row.original.summary}</p>,
      },
      {
        header: "Aktor",
        id: "actor",
        cell: ({ row }) => (
          <div className="text-xs text-slate-500">
            <p>{row.original.actorRole ?? "-"}</p>
            <p>{row.original.actorUserId ?? "-"}</p>
          </div>
        ),
      },
      {
        header: "Entity",
        id: "entity",
        cell: ({ row }) => (
          <div className="text-xs text-slate-500">
            <p>{row.original.entityType}</p>
            <p>{row.original.entityId ?? "-"}</p>
          </div>
        ),
      },
      {
        header: "Payload",
        accessorKey: "payload",
        cell: ({ row }) => (
          <code className="block max-w-[360px] truncate text-xs text-slate-500">
            {row.original.payload}
          </code>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">Filter Modul</label>
        <select
          className="mt-2 h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
        >
          {moduleOptions.map((moduleName) => (
            <option key={moduleName} value={moduleName}>
              {moduleName}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        globalSearch
        searchPlaceholder="Cari event, aktor, modul, deskripsi..."
      />
    </div>
  );
}
