"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/DataTable";
import { upsertAttendanceRecord } from "@/server/actions/attendance";

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

type Props = {
  selectedDate: string;
  employees: EmployeeOption[];
  records: AttendanceRow[];
};

const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  HADIR: "Hadir",
  ALPA: "Alpa",
  IZIN: "Izin",
  SAKIT: "Sakit",
  CUTI: "Cuti",
  OFF: "Off",
};

const PUNCTUALITY_LABEL: Record<string, string> = {
  TEPAT_WAKTU: "Tepat Waktu",
  TELAT: "Telat",
};

function createDraft(selectedDate: string): AttendanceDraft {
  return {
    employeeId: "",
    attendanceDate: selectedDate,
    attendanceStatus: "HADIR",
    checkInTime: "",
    checkOutTime: "",
    punctualityStatus: "TEPAT_WAKTU",
    notes: "",
  };
}

export default function AttendanceClient({ selectedDate, employees, records }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<AttendanceDraft>(() => createDraft(selectedDate));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateDraft(field: keyof AttendanceDraft, value: string) {
    setDraft((current) => {
      if (field === "attendanceStatus" && value !== "HADIR") {
        return { ...current, attendanceStatus: value, punctualityStatus: "", checkInTime: "", checkOutTime: "" };
      }
      if (field === "attendanceStatus" && value === "HADIR") {
        return { ...current, attendanceStatus: value, punctualityStatus: current.punctualityStatus || "TEPAT_WAKTU" };
      }
      return { ...current, [field]: value };
    });
  }

  function handleDateFilterChange(value: string) {
    setDraft((current) => ({ ...current, attendanceDate: value }));
    router.push(`/absensi?date=${value}`);
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
      setSuccess("Absensi berhasil disimpan.");
      setDraft(createDraft(draft.attendanceDate));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function handleEdit(row: AttendanceRow) {
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
  }

  const columns: ColumnDef<AttendanceRow>[] = useMemo(() => [
    {
      header: "Karyawan",
      accessorKey: "employeeName",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-slate-900">{row.original.employeeName}</p>
          <p className="text-xs text-slate-500">{row.original.employeeCode} - {row.original.divisionName}</p>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "attendanceStatus",
      cell: ({ row }) => {
        const isNegative = ["ALPA", "IZIN", "SAKIT", "CUTI"].includes(row.original.attendanceStatus);
        return (
          <Badge variant={isNegative ? "destructive" : "secondary"}>
            {ATTENDANCE_STATUS_LABEL[row.original.attendanceStatus] ?? row.original.attendanceStatus}
          </Badge>
        );
      },
    },
    {
      header: "Jam",
      id: "time",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">
          {row.original.checkInTime || "-"} / {row.original.checkOutTime || "-"}
        </span>
      ),
    },
    {
      header: "Disiplin",
      accessorKey: "punctualityStatus",
      cell: ({ row }) => row.original.punctualityStatus ? (
        <Badge variant={row.original.punctualityStatus === "TELAT" ? "destructive" : "default"}>
          {PUNCTUALITY_LABEL[row.original.punctualityStatus] ?? row.original.punctualityStatus}
        </Badge>
      ) : <span className="text-sm text-slate-400">-</span>,
    },
    {
      header: "Sumber",
      accessorKey: "source",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.source}</span>,
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => handleEdit(row.original)} disabled={pending}>
          Edit
        </Button>
      ),
    },
  ], [pending]);

  const attendanceStats = {
    hadir: records.filter((row) => row.attendanceStatus === "HADIR").length,
    telat: records.filter((row) => row.punctualityStatus === "TELAT").length,
    absen: records.filter((row) => ["ALPA", "IZIN", "SAKIT", "CUTI"].includes(row.attendanceStatus)).length,
  };

  return (
    <div className="space-y-4">
      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Tanggal</p>
          <Input className="mt-2" type="date" value={draft.attendanceDate} onChange={(e) => handleDateFilterChange(e.target.value)} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Data</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{records.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Hadir</p>
          <p className="mt-2 text-xl font-semibold text-emerald-600">{attendanceStats.hadir}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Telat / Absen</p>
          <p className="mt-2 text-xl font-semibold text-amber-600">{attendanceStats.telat} / {attendanceStats.absen}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr_auto]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Karyawan</label>
            <select
              value={draft.employeeId}
              onChange={(e) => updateDraft("employeeId", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.employeeCode} - {employee.divisionName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
            <select
              value={draft.attendanceStatus}
              onChange={(e) => updateDraft("attendanceStatus", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(ATTENDANCE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Masuk</label>
            <Input type="time" value={draft.checkInTime} onChange={(e) => updateDraft("checkInTime", e.target.value)} disabled={draft.attendanceStatus !== "HADIR"} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Pulang</label>
            <Input type="time" value={draft.checkOutTime} onChange={(e) => updateDraft("checkOutTime", e.target.value)} disabled={draft.attendanceStatus !== "HADIR"} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Disiplin</label>
            <select
              value={draft.punctualityStatus}
              onChange={(e) => updateDraft("punctualityStatus", e.target.value)}
              disabled={draft.attendanceStatus !== "HADIR"}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">-</option>
              {Object.entries(PUNCTUALITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Catatan</label>
            <Input value={draft.notes} onChange={(e) => updateDraft("notes", e.target.value)} placeholder="Opsional" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void handleSubmit()} disabled={pending} className="w-full">
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </div>

      <DataTable data={records} columns={columns} searchKey="employeeName" searchPlaceholder="Cari karyawan..." />
    </div>
  );
}
