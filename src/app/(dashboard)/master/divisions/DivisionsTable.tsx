"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export type DivisionRow = {
  id: string;
  name: string;
  code: string;
  trainingPassPercent: number;
  isActive: boolean;
};

const columns: ColumnDef<DivisionRow>[] = [
  { header: "Nama Divisi", accessorKey: "name" },
  { header: "Kode", accessorKey: "code" },
  {
    header: "Min. Lulus Training",
    accessorKey: "trainingPassPercent",
    cell: ({ row }) => `${row.original.trainingPassPercent}%`,
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

type DivisionsTableProps = {
  data: DivisionRow[];
};

export default function DivisionsTable({ data }: DivisionsTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Cari divisi..."
    />
  );
}
