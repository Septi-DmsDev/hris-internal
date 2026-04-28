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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createBranch,
  deleteBranch,
  updateBranch,
} from "@/server/actions/branches";

export type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
};

type BranchesTableProps = {
  data: BranchRow[];
};

export default function BranchesTable({ data }: BranchesTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BranchRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<BranchRow | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreateSubmit(formData: FormData) {
    setPending(true);
    setFormError(null);
    try {
      const result = await createBranch(formData);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setCreateOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleEditSubmit(formData: FormData) {
    if (!editingRow) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await updateBranch(editingRow.id, formData);
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

  async function handleDelete() {
    if (!deletingRow) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await deleteBranch(deletingRow.id);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setDeletingRow(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const columns: ColumnDef<BranchRow>[] = useMemo(
    () => [
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
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
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
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setFormError(null);
                setDeletingRow(row.original);
              }}
            >
              Hapus
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          Tambah Cabang
        </Button>
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Cari cabang..."
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Cabang</DialogTitle>
          </DialogHeader>
          <form action={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="branch-create-name" className="text-sm font-medium">
                Nama Cabang
              </label>
              <Input id="branch-create-name" name="name" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <label htmlFor="branch-create-address" className="text-sm font-medium">
                Alamat
              </label>
              <Input id="branch-create-address" name="address" maxLength={255} />
            </div>
            <div className="space-y-2">
              <label htmlFor="branch-create-active" className="text-sm font-medium">
                Status
              </label>
              <select
                id="branch-create-active"
                name="isActive"
                defaultValue="true"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cabang</DialogTitle>
          </DialogHeader>
          {editingRow ? (
            <form key={editingRow.id} action={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="branch-edit-name" className="text-sm font-medium">
                  Nama Cabang
                </label>
                <Input
                  id="branch-edit-name"
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={editingRow.name}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="branch-edit-address" className="text-sm font-medium">
                  Alamat
                </label>
                <Input
                  id="branch-edit-address"
                  name="address"
                  maxLength={255}
                  defaultValue={editingRow.address ?? ""}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="branch-edit-active" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="branch-edit-active"
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
                  {pending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingRow !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingRow(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang</AlertDialogTitle>
            <AlertDialogDescription>
              {`Data cabang "${deletingRow?.name ?? ""}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={pending}
            >
              {pending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
