"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { approveTicket, rejectTicket } from "@/server/actions/tickets";

export type SpvTicketRow = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  ticketType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: string;
  createdAt: string;
};

type DecisionState = {
  action: "approve" | "reject";
  ticketId: string;
  label: string;
};

const TICKET_TYPE_LABEL: Record<string, string> = {
  CUTI: "Cuti",
  SAKIT: "Sakit",
  IZIN: "Izin",
  EMERGENCY: "Emergency",
  SETENGAH_HARI: "Setengah Hari",
};

export default function SPVTicketReviewClient({ tickets }: { tickets: SpvTicketRow[] }) {
  const router = useRouter();
  const [decision, setDecision] = useState<DecisionState | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleDecision() {
    if (!decision) return;
    setPending(true);
    setError(null);
    try {
      const payload = {
        ticketId: decision.ticketId,
        notes: notes.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
      };
      const result =
        decision.action === "approve"
          ? await approveTicket(payload)
          : await rejectTicket(payload);
      if (result && "error" in result) {
        setError(result.error ?? "Gagal memproses tiket.");
        return;
      }
      setSuccess(decision.action === "approve" ? "Tiket disetujui." : "Tiket ditolak.");
      setDecision(null);
      setNotes("");
      setRejectionReason("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const columns: ColumnDef<SpvTicketRow>[] = [
    {
      header: "Karyawan",
      accessorKey: "employeeName",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-900">{row.original.employeeName}</p>
          <p className="text-xs text-slate-500">
            {row.original.employeeCode} · {row.original.divisionName}
          </p>
        </div>
      ),
    },
    {
      header: "Jenis",
      accessorKey: "ticketType",
      cell: ({ row }) => (
        <Badge variant="outline">
          {TICKET_TYPE_LABEL[row.original.ticketType] ?? row.original.ticketType}
        </Badge>
      ),
    },
    {
      header: "Tanggal",
      id: "dates",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.startDate}</p>
          {row.original.startDate !== row.original.endDate && (
            <p className="text-slate-400">s/d {row.original.endDate}</p>
          )}
          <p className="text-xs text-slate-400">{row.original.daysCount} hari</p>
        </div>
      ),
    },
    {
      header: "Alasan",
      accessorKey: "reason",
      cell: ({ row }) => (
        <p className="max-w-[200px] truncate text-sm">{row.original.reason}</p>
      ),
    },
    {
      header: "Diajukan",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-sm text-slate-500">{row.original.createdAt}</span>
      ),
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={() =>
                setDecision({
                  action: "approve",
                  ticketId: t.id,
                  label: `${t.employeeName} · ${TICKET_TYPE_LABEL[t.ticketType] ?? t.ticketType}`,
                })
              }
            >
              Terima
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setDecision({
                  action: "reject",
                  ticketId: t.id,
                  label: `${t.employeeName} · ${TICKET_TYPE_LABEL[t.ticketType] ?? t.ticketType}`,
                })
              }
            >
              Tolak
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Antrian Review Izin</h2>
        <p className="text-sm text-slate-500">
          {tickets.length} pengajuan menunggu persetujuan
        </p>
      </div>

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-6 py-16 text-center">
          <p className="text-sm text-slate-500">
            Tidak ada pengajuan izin yang menunggu persetujuan.
          </p>
        </div>
      ) : (
        <DataTable
          data={tickets}
          columns={columns}
          searchKey="employeeName"
          searchPlaceholder="Cari karyawan..."
        />
      )}

      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "approve" ? "Terima Pengajuan" : "Tolak Pengajuan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{decision?.label}</p>
            {decision?.action === "reject" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Catatan (opsional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={pending}>
              Batal
            </Button>
            <Button
              variant={decision?.action === "reject" ? "destructive" : "default"}
              onClick={() => void handleDecision()}
              disabled={pending}
            >
              {pending
                ? "Memproses..."
                : decision?.action === "approve"
                  ? "Terima"
                  : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
