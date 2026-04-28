"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export type GradeRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

const columns: ColumnDef<GradeRow>[] = [
  { header: "Nama Grade", accessorKey: "name" },
  { header: "Kode", accessorKey: "code" },
  {
    header: "Deskripsi",
    accessorKey: "description",
    cell: ({ row }) => row.original.description?.trim() || "-",
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

type GradesTableProps = {
  data: GradeRow[];
};

export default function GradesTable({ data }: GradesTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Cari grade..."
    />
  );
}
