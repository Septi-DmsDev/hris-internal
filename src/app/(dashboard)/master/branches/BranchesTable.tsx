"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
};

const columns: ColumnDef<BranchRow>[] = [
  { header: "Nama Cabang", accessorKey: "name" },
  {
    header: "Alamat",
    accessorKey: "address",
    cell: ({ row }) => row.original.address?.trim() || "-",
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

type BranchesTableProps = {
  data: BranchRow[];
};

export default function BranchesTable({ data }: BranchesTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="name"
      searchPlaceholder="Cari cabang..."
    />
  );
}
