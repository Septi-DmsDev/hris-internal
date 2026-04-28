"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export type PositionRow = {
  id: string;
  name: string;
  code: string;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  isActive: boolean;
};

const GROUP_LABEL: Record<PositionRow["employeeGroup"], string> = {
  MANAGERIAL: "Managerial",
  TEAMWORK: "Teamwork",
};

const columns: ColumnDef<PositionRow>[] = [
  { header: "Nama Jabatan", accessorKey: "name" },
  { header: "Kode", accessorKey: "code" },
  {
    header: "Kelompok",
    accessorKey: "employeeGroup",
    cell: ({ row }) => (
      <Badge variant={row.original.employeeGroup === "MANAGERIAL" ? "outline" : "secondary"}>
        {GROUP_LABEL[row.original.employeeGroup]}
      </Badge>
    ),
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
];

type PositionsTableProps = {
  data: PositionRow[];
};

export default function PositionsTable({ data }: PositionsTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Cari jabatan..."
    />
  );
}
