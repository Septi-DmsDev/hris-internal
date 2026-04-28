"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/DataTable";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { createTicket, approveTicket, rejectTicket, cancelTicket } from "@/server/actions/tickets";
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
  status: string;
  payrollImpact: string | null;
  reviewNotes: string;
  rejectionReason: string;
  createdAt: string;
};

type EmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  divisionName: string;
};

type Props = {
  role: UserRole;
  tickets: TicketRow[];
  employeeOptions: EmployeeOption[];
};

type TicketDraft = {
  employeeId: string;
  ticketType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

type DecisionState = {
  action: "approve" | "reject";
  ticketId: string;
  label: string;
};

const TICKET_TYPE_LABEL: Record<string, string> = {
  CUTI: "Cuti", SAKIT: "Sakit", IZIN: "Izin", EMERGENCY: "Emergency", SETENGAH_HARI: "Setengah Hari",
};

const TICKET_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline", SUBMITTED: "secondary", AUTO_APPROVED: "default", AUTO_REJECTED: "destructive",
  NEED_REVIEW: "secondary", APPROVED_SPV: "default", APPROVED_HRD: "default",
  REJECTED: "destructive", CANCELLED: "outline", LOCKED: "default",
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Diajukan", AUTO_APPROVED: "Auto Approved",
  AUTO_REJECTED: "Auto Rejected", NEED_REVIEW: "Perlu Review",
  APPROVED_SPV: "Disetujui SPV", APPROVED_HRD: "Disetujui HRD",
  REJECTED: "Ditolak", CANCELLED: "Dibatalkan", LOCKED: "Terkunci",
};

const PAYROLL_IMPACT_LABEL: Record<string, string> = {
  UNPAID: "Unpaid", PAID_QUOTA_MONTHLY: "Quota Bulanan", PAID_QUOTA_ANNUAL: "Quota Tahunan",
};

function createDraft(): TicketDraft {
  const today = new Date().toISOString().slice(0, 10);
  return { employeeId: "", ticketType: "IZIN", startDate: today, endDate: today, reason: "" };
}

export default function TicketingClient({ role, tickets, employeeOptions }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [decision, setDecision] = useState<DecisionState | null>(null);
  const [draft, setDraft] = useState<TicketDraft>(createDraft());
  const [decisionNotes, setDecisionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canApprove = ["SUPER_ADMIN", "HRD", "SPV"].includes(role);
  const canCreate = true;

  function update(field: keyof TicketDraft, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function handleCreate() {
    setPending(true); setError(null);
    try {
      const result = await createTicket(draft);
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess("Tiket berhasil diajukan."); setCreateOpen(false); setDraft(createDraft());
      router.refresh();
    } finally { setPending(false); }
  }

  async function handleDecision() {
    if (!decision) return;
    setPending(true); setError(null);
    try {
      const payload = {
        ticketId: decision.ticketId,
        notes: decisionNotes || undefined,
        rejectionReason: rejectionReason || undefined,
      };
      const result =
        decision.action === "approve" ? await approveTicket(payload) : await rejectTicket(payload);
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess(decision.action === "approve" ? "Tiket disetujui." : "Tiket ditolak.");
      setDecision(null); setDecisionNotes(""); setRejectionReason("");
      router.refresh();
    } finally { setPending(false); }
  }

  async function handleCancel(ticketId: string) {
    setPending(true); setError(null);
    try {
      const result = await cancelTicket(ticketId);
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess("Tiket dibatalkan."); router.refresh();
    } finally { setPending(false); }
  }

  const columns: ColumnDef<TicketRow>[] = useMemo(() => [
    {
      header: "Karyawan",
      accessorKey: "employeeName",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-slate-900">{row.original.employeeName}</p>
          <p className="text-xs text-slate-500">{row.original.employeeCode} · {row.original.divisionName}</p>
        </div>
      ),
    },
    {
      header: "Jenis",
      accessorKey: "ticketType",
      cell: ({ row }) => (
        <Badge variant="outline">{TICKET_TYPE_LABEL[row.original.ticketType] ?? row.original.ticketType}</Badge>
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
    { header: "Alasan", accessorKey: "reason", cell: ({ row }) => <p className="text-sm max-w-[200px] truncate">{row.original.reason}</p> },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={TICKET_STATUS_VARIANT[row.original.status] ?? "outline"}>
            {TICKET_STATUS_LABEL[row.original.status] ?? row.original.status}
          </Badge>
          {row.original.payrollImpact && (
            <p className="text-xs text-slate-500">{PAYROLL_IMPACT_LABEL[row.original.payrollImpact]}</p>
          )}
        </div>
      ),
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => {
        const t = row.original;
        const isPending = ["SUBMITTED", "NEED_REVIEW"].includes(t.status);
        const isCancellable = ["DRAFT", "SUBMITTED"].includes(t.status);
        return (
          <div className="flex gap-1.5 flex-wrap">
            {canApprove && isPending && (
              <>
                <Button size="sm" onClick={() => setDecision({ action: "approve", ticketId: t.id, label: `${t.employeeName} · ${TICKET_TYPE_LABEL[t.ticketType]}` })}>
                  Setujui
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDecision({ action: "reject", ticketId: t.id, label: `${t.employeeName} · ${TICKET_TYPE_LABEL[t.ticketType]}` })}>
                  Tolak
                </Button>
              </>
            )}
            {isCancellable && (
              <Button size="sm" variant="outline" onClick={() => void handleCancel(t.id)} disabled={pending}>
                Batalkan
              </Button>
            )}
          </div>
        );
      },
    },
  ], [canApprove, pending]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div />
        {canCreate && (
          <Button onClick={() => { setError(null); setDraft(createDraft()); setCreateOpen(true); }}>
            Ajukan Tiket
          </Button>
        )}
      </div>

      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <DataTable data={tickets} columns={columns} searchKey="employeeName" searchPlaceholder="Cari karyawan..." />

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Ajukan Tiket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Karyawan</label>
              <select value={draft.employeeId} onChange={(e) => update("employeeId", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Pilih karyawan</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode}) · {emp.divisionName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Jenis Tiket</label>
              <select value={draft.ticketType} onChange={(e) => update("ticketType", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="CUTI">Cuti</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="SETENGAH_HARI">Setengah Hari</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Tanggal Mulai</label>
                <Input type="date" value={draft.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Tanggal Akhir</label>
                <Input type="date" value={draft.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Alasan</label>
              <textarea value={draft.reason} onChange={(e) => update("reason", e.target.value)} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>Batal</Button>
            <Button onClick={() => void handleCreate()} disabled={pending}>
              {pending ? "Menyimpan..." : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject Dialog */}
      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{decision?.action === "approve" ? "Setujui Tiket" : "Tolak Tiket"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{decision?.label}</p>
            {decision?.action === "reject" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Alasan Penolakan <span className="text-red-500">*</span></label>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Catatan (opsional)</label>
              <textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={pending}>Batal</Button>
            <Button variant={decision?.action === "reject" ? "destructive" : "default"}
              onClick={() => void handleDecision()} disabled={pending}>
              {pending ? "Memproses..." : decision?.action === "approve" ? "Setujui" : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
