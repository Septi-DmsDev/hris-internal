"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decideOvertimeRequest, submitOvertimeRequest } from "@/server/actions/overtime";
import type { UserRole } from "@/types";

export type OvertimeRow = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  divisionName: string;
  requestDate: string;
  overtimeType: "OVERTIME_1H" | "OVERTIME_2H" | "OVERTIME_3H" | "LEMBUR_FULLDAY" | "PATCH_ABSENCE_3H";
  overtimeHours: number;
  breakHours: number;
  baseAmount: number;
  mealAmount: number;
  totalAmount: number;
  periodCode: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
};

const OVERTIME_TYPE_LABEL: Record<OvertimeRow["overtimeType"], string> = {
  OVERTIME_1H: "Overtime 1 Jam",
  OVERTIME_2H: "Overtime 2 Jam",
  OVERTIME_3H: "Overtime 3 Jam",
  LEMBUR_FULLDAY: "Lembur 1 Hari",
  PATCH_ABSENCE_3H: "Penambalan Izin (3 Jam)",
};

const OVERTIME_HELP_TEXT: Record<OvertimeRow["overtimeType"], string> = {
  OVERTIME_1H: "Rp11.000 (tanpa uang makan)",
  OVERTIME_2H: "Rp22.000 (tanpa uang makan)",
  OVERTIME_3H: "Rp33.000 + uang makan Rp10.000",
  LEMBUR_FULLDAY: "Rp100.000 + uang makan Rp20.000",
  PATCH_ABSENCE_3H: "Rp11.000 + uang makan Rp30.000, maksimal 3x/periode (IZIN/SAKIT/CUTI approved)",
};

function currency(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function OvertimeClient({
  role,
  canSubmit,
  canApprove,
  myRequests,
  pendingRequests,
  processedRequests,
}: {
  role: UserRole;
  canSubmit: boolean;
  canApprove: boolean;
  myRequests: OvertimeRow[];
  pendingRequests: OvertimeRow[];
  processedRequests: OvertimeRow[];
}) {
  const router = useRouter();
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [overtimeType, setOvertimeType] = useState<OvertimeRow["overtimeType"]>("OVERTIME_1H");
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmitRequest() {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await submitOvertimeRequest({
        requestDate,
        overtimeType,
        reason,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Pengajuan overtime gagal.");
        return;
      }
      setReason("");
      setSuccess("Pengajuan overtime berhasil dikirim.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDecision(requestId: string, action: "APPROVE" | "REJECT") {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await decideOvertimeRequest({
        requestId,
        action,
        reviewNotes: reviewNotes[requestId] ?? "",
      });
      if (result && "error" in result) {
        setError(result.error ?? "Proses approval overtime gagal.");
        return;
      }
      setSuccess(action === "APPROVE" ? "Pengajuan overtime disetujui." : "Pengajuan overtime ditolak.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">Overtime</h2>
        <p className="text-sm text-slate-500">Role aktif: {role}</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      {canSubmit ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Pengajuan Overtime (TEAMWORK)</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tanggal</label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Jenis Overtime</label>
              <select
                value={overtimeType}
                onChange={(e) => setOvertimeType(e.target.value as OvertimeRow["overtimeType"])}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(OVERTIME_TYPE_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{OVERTIME_HELP_TEXT[overtimeType]}</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Alasan / Catatan</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void handleSubmitRequest()} disabled={pending}>
              {pending ? "Mengirim..." : "Kirim Pengajuan"}
            </Button>
          </div>
        </div>
      ) : null}

      {canApprove ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Antrian Approval Overtime</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Karyawan</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Jenis</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Nominal</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Catatan Review</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequests.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">Tidak ada pengajuan overtime yang menunggu approval.</td></tr>
                ) : pendingRequests.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{row.employeeName}</p>
                      <p className="text-xs text-slate-500">{row.employeeCode} · {row.divisionName}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.requestDate}</td>
                    <td className="px-3 py-2 text-slate-700">{OVERTIME_TYPE_LABEL[row.overtimeType]}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{currency(row.totalAmount)}</td>
                    <td className="px-3 py-2">
                      <Input
                        placeholder="Opsional untuk approve, wajib jika tolak"
                        value={reviewNotes[row.id] ?? ""}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" onClick={() => void handleDecision(row.id, "APPROVE")} disabled={pending}>Setujui</Button>
                        <Button size="sm" variant="destructive" onClick={() => void handleDecision(row.id, "REJECT")} disabled={pending}>Tolak</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{canSubmit ? "Riwayat Pengajuan Saya" : "Riwayat Pengajuan Overtime"}</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Karyawan</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Tanggal</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Jenis</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500">Nominal</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(canSubmit ? myRequests : processedRequests).length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">Belum ada data overtime.</td></tr>
            ) : (canSubmit ? myRequests : processedRequests).map((row) => (
              <tr key={row.id} className="bg-white">
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{row.employeeName}</p>
                  <p className="text-xs text-slate-500">{row.employeeCode} · {row.divisionName}</p>
                </td>
                <td className="px-3 py-2 text-slate-700">{row.requestDate}</td>
                <td className="px-3 py-2 text-slate-700">{OVERTIME_TYPE_LABEL[row.overtimeType]}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">{currency(row.totalAmount)}</td>
                <td className="px-3 py-2">
                  <Badge variant={row.status === "APPROVED" ? "default" : row.status === "REJECTED" ? "destructive" : "secondary"}>
                    {row.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{row.reviewNotes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

