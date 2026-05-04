"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
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
import { cancelTicket, createTicket } from "@/server/actions/tickets";
import type { UserRole } from "@/types";

type TicketRow = {
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
  attachmentUrl: string | null;
  status: string;
  payrollImpact: string | null;
  reviewNotes: string;
  rejectionReason: string;
  createdAt: string;
};

type Props = {
  role: UserRole;
  hasEmployeeLink: boolean;
  tickets: TicketRow[];
};

type TicketDraft = {
  ticketType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl: string;
};

const TICKET_TYPE_LABEL: Record<string, string> = {
  CUTI: "Cuti",
  SAKIT: "Sakit",
  IZIN: "Izin",
  EMERGENCY: "Emergency",
  SETENGAH_HARI: "Setengah Hari",
};

const TICKET_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  AUTO_APPROVED: "default",
  AUTO_REJECTED: "destructive",
  NEED_REVIEW: "secondary",
  APPROVED_SPV: "default",
  APPROVED_HRD: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
  LOCKED: "default",
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Diajukan",
  AUTO_APPROVED: "Auto Approved",
  AUTO_REJECTED: "Auto Rejected",
  NEED_REVIEW: "Perlu Review",
  APPROVED_SPV: "Disetujui SPV",
  APPROVED_HRD: "Disetujui HRD",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  LOCKED: "Terkunci",
};

const PAYROLL_IMPACT_LABEL: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID_QUOTA_MONTHLY: "Quota Bulanan",
  PAID_QUOTA_ANNUAL: "Quota Tahunan",
};

function createDraft(): TicketDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ticketType: "IZIN",
    startDate: today,
    endDate: today,
    reason: "",
    attachmentUrl: "",
  };
}

function getDurationDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }
  return Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
}

export default function TicketingClient({
  role,
  hasEmployeeLink,
  tickets,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<TicketDraft>(createDraft());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const needsAttachment =
    draft.ticketType === "SAKIT" &&
    getDurationDays(draft.startDate, draft.endDate) > 1;
  const canSubmit = hasEmployeeLink;

  function update(field: keyof TicketDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate() {
    setPending(true);
    setError(null);
    try {
      const result = await createTicket(draft);
      if (result && "error" in result) {
        setError(result.error ?? "Gagal mengajukan tiket.");
        return;
      }
      setSuccess("Tiket berhasil diajukan.");
      setCreateOpen(false);
      setDraft(createDraft());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const handleCancel = useCallback(
    async (ticketId: string) => {
      setPending(true);
      setError(null);
      try {
        const result = await cancelTicket(ticketId);
        if (result && "error" in result) {
          setError(result.error ?? "Gagal membatalkan tiket.");
          return;
        }
        setSuccess("Tiket dibatalkan.");
        router.refresh();
      } finally {
        setPending(false);
      }
    },
    [router],
  );

  const columns: ColumnDef<TicketRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-slate-900">
              {row.original.employeeName}
            </p>
            <p className="text-xs text-slate-500">
              {row.original.employeeCode} - {row.original.divisionName}
            </p>
          </div>
        ),
      },
      {
        header: "Jenis",
        accessorKey: "ticketType",
        cell: ({ row }) => (
          <Badge variant="outline">
            {TICKET_TYPE_LABEL[row.original.ticketType] ??
              row.original.ticketType}
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
            <p className="text-xs text-slate-400">
              {row.original.daysCount} hari
            </p>
          </div>
        ),
      },
      {
        header: "Alasan",
        accessorKey: "reason",
        cell: ({ row }) => (
          <p className="max-w-[220px] truncate text-sm">
            {row.original.reason}
          </p>
        ),
      },
      {
        header: "Bukti",
        accessorKey: "attachmentUrl",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">
            {row.original.attachmentUrl ? "Terlampir" : "-"}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge
              variant={TICKET_STATUS_VARIANT[row.original.status] ?? "outline"}
            >
              {TICKET_STATUS_LABEL[row.original.status] ?? row.original.status}
            </Badge>
            {row.original.payrollImpact && (
              <p className="text-xs text-slate-500">
                {PAYROLL_IMPACT_LABEL[row.original.payrollImpact]}
              </p>
            )}
            {row.original.rejectionReason && (
              <p className="max-w-[220px] truncate text-xs text-red-600">
                {row.original.rejectionReason}
              </p>
            )}
          </div>
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
          const isCancellable = ["DRAFT", "SUBMITTED"].includes(t.status);
          return isCancellable ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCancel(t.id)}
              disabled={pending}
            >
              Batalkan
            </Button>
          ) : null;
        },
      },
    ],
    [handleCancel, pending],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Ticketing Saya</h2>
        <p className="text-sm text-slate-500">
          {role === "TEAMWORK"
            ? "Pengajuan masuk ke SPV/KABAG lalu HRD."
            : "Pengajuan Anda masuk ke antrian HRD."}
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
      {!hasEmployeeLink && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Akun belum terhubung ke data karyawan, jadi belum bisa mengajukan tiket pribadi.
        </div>
      )}

      <DataTable
        data={tickets}
        columns={columns}
        globalSearch
        searchPlaceholder="Cari perizinan..."
        toolbarSlot={
          <Button
            onClick={() => {
              setError(null);
              setDraft(createDraft());
              setCreateOpen(true);
            }}
            disabled={!canSubmit}
          >
            Ajukan Tiket
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajukan Tiket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Tiket akan diajukan untuk akun Anda sendiri.
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Jenis Tiket
              </label>
              <select
                value={draft.ticketType}
                onChange={(e) => update("ticketType", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="CUTI">Cuti</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="SETENGAH_HARI">Setengah Hari</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Tanggal Akhir
                </label>
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Alasan / Catatan
              </label>
              <textarea
                value={draft.reason}
                onChange={(e) => update("reason", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {needsAttachment && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Bukti fisik/digital <span className="text-red-500">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={draft.attachmentUrl}
                  onChange={(e) => update("attachmentUrl", e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Sakit lebih dari 1 hari wajib menyertakan surat dokter.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={() => void handleCreate()} disabled={pending}>
              {pending ? "Menyimpan..." : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
