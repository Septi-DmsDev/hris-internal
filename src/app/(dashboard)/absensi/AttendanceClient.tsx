"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/tables/DataTable";
import {
  approveAttendanceFallbackRequest,
  rejectAttendanceFallbackRequest,
  upsertAttendanceRecord,
} from "@/server/actions/attendance";

type EmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  divisionName: string;
};

type AttendanceRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  attendanceDate: string;
  attendanceStatus: string;
  checkInTime: string;
  checkOutTime: string;
  breakOutTime: string;
  breakInTime: string;
  tapsCount: number;
  punctualityStatus: string;
  source: string;
  notes: string;
  updatedAt: string;
};

type AttendanceDraft = {
  employeeId: string;
  attendanceDate: string;
  attendanceStatus: string;
  checkInTime: string;
  checkOutTime: string;
  punctualityStatus: string;
  notes: string;
};

type FallbackRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  attendanceDate: string;
  photoUrl: string;
  latitude: string;
  longitude: string;
  distanceMeters: number | null;
  radiusMetersSnapshot: number | null;
  geofenceMatched: boolean;
  fingerprintFailureReason: string;
  developerModeDisabledConfirmed: boolean;
  status: string;
  reviewNotes: string;
  reviewedAt: string;
  createdAt: string;
};

type Props = {
  selectedDate: string;
  employees: EmployeeOption[];
  records: AttendanceRow[];
  fallbackRequests: FallbackRequest[];
};

const STATUS_LABELS: Record<string, string> = {
  HADIR: "Hadir",
  ALPA: "Alpa",
  IZIN: "Izin",
  SAKIT: "Sakit",
  CUTI: "Cuti",
  OFF: "Off",
};

const PUNCTUALITY_LABELS: Record<string, string> = {
  TEPAT_WAKTU: "Tepat Waktu",
  TELAT: "Telat",
};

function createDraft(date: string): AttendanceDraft {
  return {
    employeeId: "",
    attendanceDate: date,
    attendanceStatus: "HADIR",
    checkInTime: "",
    checkOutTime: "",
    punctualityStatus: "TEPAT_WAKTU",
    notes: "",
  };
}

function FallbackCard({
  req,
  pending,
  onAction,
}: {
  req: FallbackRequest;
  pending: boolean;
  onAction: (action: "approve" | "reject", id: string) => Promise<void>;
}) {
  const borderClass =
    req.status === "PENDING"
      ? "border-amber-200 bg-amber-50/30"
      : req.status === "APPROVED"
        ? "border-emerald-200 bg-emerald-50/30"
        : "border-slate-200";

  return (
    <div className={`rounded-lg border-2 p-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{req.employeeName}</p>
            <Badge
              variant={
                req.status === "APPROVED"
                  ? "default"
                  : req.status === "REJECTED"
                    ? "destructive"
                    : "secondary"
              }
              className="text-xs"
            >
              {req.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            {req.employeeCode} · {req.divisionName} · {req.createdAt}
          </p>

          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Alasan gagal sidik jari:</span>{" "}
            {req.fingerprintFailureReason}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span
              className={`font-medium ${req.geofenceMatched ? "text-emerald-600" : "text-red-600"}`}
            >
              {req.geofenceMatched ? "✓" : "✗"} Geofence{" "}
              {req.geofenceMatched ? "sesuai" : "tidak sesuai"}
            </span>
            {req.distanceMeters !== null && (
              <span className="text-slate-500">
                Jarak: <span className={req.geofenceMatched ? "text-emerald-600" : "text-red-600 font-medium"}>{req.distanceMeters} m</span>
                {" "}/ Radius: {req.radiusMetersSnapshot ?? "—"} m
              </span>
            )}
            <span
              className={
                req.developerModeDisabledConfirmed
                  ? "text-emerald-600"
                  : "text-amber-600 font-medium"
              }
            >
              Dev mode:{" "}
              {req.developerModeDisabledConfirmed ? "Off ✓" : "Belum dikonfirmasi ⚠"}
            </span>
          </div>
        </div>

        <a
          href={req.photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          Lihat Foto →
        </a>
      </div>

      {req.status === "PENDING" && (
        <div className="mt-3 flex gap-2 border-t border-amber-100 pt-3">
          <Button
            size="sm"
            onClick={() => void onAction("approve", req.id)}
            disabled={pending}
          >
            Approve — Hadir
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void onAction("reject", req.id)}
            disabled={pending}
          >
            Tolak — Alpa
          </Button>
        </div>
      )}
      {req.status !== "PENDING" && req.reviewNotes && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
          Catatan review: {req.reviewNotes}
        </p>
      )}
    </div>
  );
}

export default function AttendanceClient({
  selectedDate,
  employees,
  records,
  fallbackRequests,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<AttendanceDraft>(() => createDraft(selectedDate));
  const [editingRow, setEditingRow] = useState<AttendanceRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stats = useMemo(() => {
    const tepatWaktu = records.filter(
      (r) => r.attendanceStatus === "HADIR" && r.punctualityStatus === "TEPAT_WAKTU"
    ).length;
    const telat = records.filter(
      (r) => r.attendanceStatus === "HADIR" && r.punctualityStatus === "TELAT"
    ).length;
    const tidakHadir = records.filter((r) =>
      ["ALPA", "IZIN", "SAKIT", "CUTI"].includes(r.attendanceStatus)
    ).length;
    const belumAbsen = Math.max(0, employees.length - records.length);
    const pendingFallback = fallbackRequests.filter((r) => r.status === "PENDING").length;
    return { tepatWaktu, telat, tidakHadir, belumAbsen, pendingFallback };
  }, [records, employees, fallbackRequests]);

  const filteredRecords = useMemo(() => {
    switch (statusFilter) {
      case "TEPAT_WAKTU":
        return records.filter((r) => r.punctualityStatus === "TEPAT_WAKTU");
      case "TELAT":
        return records.filter((r) => r.punctualityStatus === "TELAT");
      case "TIDAK_HADIR":
        return records.filter((r) =>
          ["ALPA", "IZIN", "SAKIT", "CUTI"].includes(r.attendanceStatus)
        );
      case "FINGERPRINT":
        return records.filter((r) => r.source === "FINGERPRINT_ADMS");
      case "MANUAL":
        return records.filter((r) => r.source === "MANUAL");
      default:
        return records;
    }
  }, [records, statusFilter]);

  function updateDraft(field: keyof AttendanceDraft, value: string) {
    setDraft((cur) => {
      if (field === "attendanceStatus" && value !== "HADIR") {
        return { ...cur, attendanceStatus: value, punctualityStatus: "", checkInTime: "", checkOutTime: "" };
      }
      if (field === "attendanceStatus" && value === "HADIR") {
        return { ...cur, attendanceStatus: value, punctualityStatus: cur.punctualityStatus || "TEPAT_WAKTU" };
      }
      return { ...cur, [field]: value };
    });
  }

  function handleDateChange(value: string) {
    setDraft((cur) => ({ ...cur, attendanceDate: value }));
    router.push(`/absensi?date=${value}`);
  }

  function handleEdit(row: AttendanceRow) {
    setEditingRow(row);
    setError(null);
    setSuccess(null);
    setDraft({
      employeeId: row.employeeId,
      attendanceDate: row.attendanceDate,
      attendanceStatus: row.attendanceStatus,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      punctualityStatus: row.punctualityStatus,
      notes: row.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setEditingRow(null);
    setDraft(createDraft(selectedDate));
    setError(null);
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await upsertAttendanceRecord(draft);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(
        editingRow
          ? `Absensi ${editingRow.employeeName} berhasil diperbarui.`
          : "Absensi berhasil disimpan."
      );
      setEditingRow(null);
      setDraft(createDraft(draft.attendanceDate));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleFallback(action: "approve" | "reject", requestId: string) {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result =
        action === "approve"
          ? await approveAttendanceFallbackRequest({ requestId })
          : await rejectAttendanceFallbackRequest({ requestId });
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setSuccess(
        action === "approve"
          ? "Fallback disetujui. Status absensi diperbarui menjadi HADIR."
          : "Fallback ditolak. Status absensi diperbarui menjadi ALPA."
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const columns: ColumnDef<AttendanceRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "employeeName",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.employeeName}</p>
            <p className="text-xs text-slate-400">
              {row.original.employeeCode} · {row.original.divisionName}
            </p>
          </div>
        ),
      },
      {
        header: "Status",
        accessorKey: "attendanceStatus",
        cell: ({ row }) => {
          const s = row.original.attendanceStatus;
          const variant =
            s === "HADIR" ? "secondary" : s === "OFF" ? "outline" : "destructive";
          return <Badge variant={variant}>{STATUS_LABELS[s] ?? s}</Badge>;
        },
      },
      {
        header: "Jam Kerja",
        id: "jam",
        cell: ({ row }) => {
          const { checkInTime, checkOutTime, breakOutTime, breakInTime, tapsCount, source } =
            row.original;
          return (
            <div className="space-y-0.5 font-mono text-sm">
              <div className="flex items-center gap-1">
                <span className={checkInTime ? "text-slate-800" : "text-slate-300"}>
                  {checkInTime || "--:--"}
                </span>
                <span className="text-slate-300">→</span>
                <span className={checkOutTime ? "text-slate-800" : "text-slate-300"}>
                  {checkOutTime || "--:--"}
                </span>
              </div>
              {breakOutTime ? (
                <div className="flex items-center gap-1 font-sans text-xs text-slate-400">
                  <span>Istirahat:</span>
                  <span className="font-mono">{breakOutTime}</span>
                  <span>→</span>
                  <span className="font-mono">{breakInTime || "--:--"}</span>
                </div>
              ) : null}
              {source === "FINGERPRINT_ADMS" && tapsCount > 0 ? (
                <div className="font-sans text-xs text-slate-300">{tapsCount} tap</div>
              ) : null}
            </div>
          );
        },
      },
      {
        header: "Disiplin",
        accessorKey: "punctualityStatus",
        cell: ({ row }) => {
          const p = row.original.punctualityStatus;
          if (!p) return <span className="text-sm text-slate-300">—</span>;
          return (
            <Badge variant={p === "TELAT" ? "destructive" : "default"} className="text-xs">
              {PUNCTUALITY_LABELS[p] ?? p}
            </Badge>
          );
        },
      },
      {
        header: "Sumber",
        accessorKey: "source",
        cell: ({ row }) => {
          const { source, updatedAt, notes } = row.original;
          const isAdms = source === "FINGERPRINT_ADMS";
          return (
            <div className="space-y-0.5">
              <Badge
                variant="outline"
                className={
                  isAdms
                    ? "border-blue-200 bg-blue-50 text-xs text-blue-700"
                    : "border-slate-200 text-xs text-slate-500"
                }
              >
                {isAdms ? "Sidik Jari" : "Manual"}
              </Badge>
              <p
                className="max-w-[140px] truncate text-xs text-slate-400"
                title={notes || updatedAt}
              >
                {notes || updatedAt}
              </p>
            </div>
          );
        },
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row.original)}
            disabled={pending}
            className="text-slate-500 hover:text-slate-800"
          >
            Edit
          </Button>
        ),
      },
    ],
    [pending]
  );

  const pendingFallbacks = fallbackRequests.filter((r) => r.status === "PENDING");
  const resolvedFallbacks = fallbackRequests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-4">
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tanggal</p>
          <Input
            className="mt-2"
            type="date"
            value={draft.attendanceDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">{records.length} data tercatat</p>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Tepat Waktu</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.tepatWaktu}</p>
          <p className="mt-0.5 text-xs text-emerald-500">
            dari {stats.tepatWaktu + stats.telat} hadir
          </p>
        </div>

        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Telat</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.telat}</p>
          <p className="mt-0.5 text-xs text-amber-500">karyawan hadir terlambat</p>
        </div>

        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-500">Tidak Hadir</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{stats.tidakHadir}</p>
          <p className="mt-0.5 text-xs text-red-400">alpa / izin / sakit / cuti</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Belum Tercatat</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{stats.belumAbsen}</p>
          <p className="mt-0.5 text-xs text-slate-400">dari {employees.length} aktif</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {editingRow ? (
          <div className="mb-3 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <div>
              <span className="text-sm font-semibold text-amber-800">Mengedit absensi:</span>{" "}
              <span className="text-sm text-amber-700">{editingRow.employeeName}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-7 px-2 text-amber-700 hover:bg-amber-100 hover:text-amber-900"
            >
              Batal
            </Button>
          </div>
        ) : (
          <p className="mb-3 text-sm font-semibold text-slate-700">Tambah / Ubah Absensi</p>
        )}

        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.7fr_0.7fr_0.8fr_1fr_auto]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Karyawan
            </label>
            <select
              value={draft.employeeId}
              onChange={(e) => updateDraft("employeeId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih karyawan...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              value={draft.attendanceStatus}
              onChange={(e) => updateDraft("attendanceStatus", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Masuk
            </label>
            <Input
              type="time"
              value={draft.checkInTime}
              onChange={(e) => updateDraft("checkInTime", e.target.value)}
              disabled={draft.attendanceStatus !== "HADIR"}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pulang
            </label>
            <Input
              type="time"
              value={draft.checkOutTime}
              onChange={(e) => updateDraft("checkOutTime", e.target.value)}
              disabled={draft.attendanceStatus !== "HADIR"}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Disiplin
            </label>
            <select
              value={draft.punctualityStatus}
              onChange={(e) => updateDraft("punctualityStatus", e.target.value)}
              disabled={draft.attendanceStatus !== "HADIR"}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">—</option>
              {Object.entries(PUNCTUALITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Catatan
            </label>
            <Input
              value={draft.notes}
              onChange={(e) => updateDraft("notes", e.target.value)}
              placeholder="Opsional"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => void handleSubmit()}
              disabled={pending || !draft.employeeId}
              className="w-full"
            >
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter tabs + Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 pt-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9 gap-0.5">
              <TabsTrigger value="ALL" className="text-xs">
                Semua ({records.length})
              </TabsTrigger>
              <TabsTrigger value="TEPAT_WAKTU" className="text-xs">
                Tepat Waktu ({stats.tepatWaktu})
              </TabsTrigger>
              <TabsTrigger value="TELAT" className="text-xs">
                Telat ({stats.telat})
              </TabsTrigger>
              <TabsTrigger value="TIDAK_HADIR" className="text-xs">
                Tidak Hadir ({stats.tidakHadir})
              </TabsTrigger>
              <TabsTrigger value="FINGERPRINT" className="text-xs">
                Sidik Jari
              </TabsTrigger>
              <TabsTrigger value="MANUAL" className="text-xs">
                Manual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-4 pt-3">
          <DataTable
            data={filteredRecords}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Cari nama karyawan..."
          />
        </div>
      </div>

      {/* Fallback Requests */}
      {fallbackRequests.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Pengajuan Fallback Sidik Jari
            </h3>
            {stats.pendingFallback > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.pendingFallback} menunggu
              </Badge>
            )}
          </div>
          <div className="space-y-3">
            {pendingFallbacks.map((req) => (
              <FallbackCard
                key={req.id}
                req={req}
                pending={pending}
                onAction={handleFallback}
              />
            ))}
            {resolvedFallbacks.map((req) => (
              <FallbackCard
                key={req.id}
                req={req}
                pending={pending}
                onAction={handleFallback}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
