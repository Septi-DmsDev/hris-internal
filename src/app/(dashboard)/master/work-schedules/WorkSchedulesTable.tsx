"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { POINT_TARGET_HARIAN } from "@/config/constants";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createWorkSchedule,
  createWorkShiftMaster,
  deleteWorkShiftMaster,
  deleteWorkSchedule,
  updateWorkShiftMaster,
  updateWorkSchedule,
} from "@/server/actions/work-schedules";

const DAY_LABELS: Record<number, string> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
};

type WorkScheduleDayDraft = {
  dayOfWeek: number;
  dayStatus: "KERJA" | "OFF" | "CUTI" | "SAKIT" | "IZIN" | "ALPA" | "SETENGAH_HARI";
  isWorkingDay: boolean;
  shiftId?: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  breakToleranceMinutes: string;
  checkInToleranceMinutes: string;
  checkOutStart: string;
  checkOutToleranceMinutes: string;
  targetPoints: string;
};

type WorkScheduleDayRow = Omit<WorkScheduleDayDraft, "targetPoints"> & {
  targetPoints: number;
};

type WorkScheduleDraft = {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  days: WorkScheduleDayDraft[];
};

export type WorkScheduleRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  days: WorkScheduleDayRow[];
};

export type WorkShiftRow = {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  checkOutStart: string | null;
  checkInToleranceMinutes: number;
  breakToleranceMinutes: number;
  checkOutToleranceMinutes: number;
  isOvernight: boolean;
  applicableDivisionCodes: string[];
  notes: string;
  sortOrder: number;
  isActive: boolean;
};

type WorkShiftDraft = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  checkOutStart: string;
  checkInToleranceMinutes: string;
  breakToleranceMinutes: string;
  checkOutToleranceMinutes: string;
  isOvernight: boolean;
  applicableDivisionCodes: string;
  notes: string;
  sortOrder: string;
  isActive: boolean;
};

function createDefaultDays() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    dayStatus: dayOfWeek === 0 ? "OFF" : "KERJA",
    isWorkingDay: dayOfWeek !== 0,
    shiftId: "",
    startTime: dayOfWeek === 0 ? "" : "08:00",
    endTime: dayOfWeek === 0 ? "" : "17:00",
    breakStart: dayOfWeek === 0 ? "" : "12:00",
    breakEnd: dayOfWeek === 0 ? "" : "13:00",
    breakToleranceMinutes: dayOfWeek === 0 ? "0" : "5",
    checkInToleranceMinutes: "0",
    checkOutStart: "",
    checkOutToleranceMinutes: "0",
    targetPoints: dayOfWeek === 0 ? "0" : String(POINT_TARGET_HARIAN),
  })) satisfies WorkScheduleDayDraft[];
}

function createEmptyDraft(): WorkScheduleDraft {
  return {
    code: "",
    name: "",
    description: "",
    isActive: true,
    days: createDefaultDays(),
  };
}

function createDraftFromRow(row: WorkScheduleRow): WorkScheduleDraft {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
      days: row.days.map((day) => ({
        ...day,
        shiftId: "",
        startTime: day.startTime ?? "",
        endTime: day.endTime ?? "",
        breakStart: day.breakStart ?? "",
        breakEnd: day.breakEnd ?? "",
        breakToleranceMinutes: String(day.breakToleranceMinutes ?? 5),
        checkInToleranceMinutes: String(day.checkInToleranceMinutes ?? 0),
        checkOutStart: day.checkOutStart ?? "",
        checkOutToleranceMinutes: day.checkOutToleranceMinutes ?? "0",
        targetPoints: String(day.targetPoints),
      })),
  };
}

function toActionInput(draft: WorkScheduleDraft) {
  return {
    code: draft.code,
    name: draft.name,
    description: draft.description,
    isActive: draft.isActive,
      days: draft.days.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        dayStatus: day.dayStatus,
        isWorkingDay: day.isWorkingDay,
        startTime: day.startTime,
        endTime: day.endTime,
        breakStart: day.breakStart,
        breakEnd: day.breakEnd,
        breakToleranceMinutes: Number(day.breakToleranceMinutes || 0),
        checkInToleranceMinutes: Number(day.checkInToleranceMinutes || 0),
        checkOutStart: day.checkOutStart,
        checkOutToleranceMinutes: Number(day.checkOutToleranceMinutes || 0),
        targetPoints: Number(day.targetPoints || 0),
      })),
  };
}

function createShiftDraft(): WorkShiftDraft {
  return {
    code: "",
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    checkOutStart: "",
    checkInToleranceMinutes: "0",
    breakToleranceMinutes: "5",
    checkOutToleranceMinutes: "0",
    isOvernight: false,
    applicableDivisionCodes: "",
    notes: "",
    sortOrder: "0",
    isActive: true,
  };
}

function createShiftDraftFromRow(row: WorkShiftRow): WorkShiftDraft {
  return {
    code: row.code,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    breakStart: row.breakStart ?? "",
    breakEnd: row.breakEnd ?? "",
    checkOutStart: row.checkOutStart ?? "",
    checkInToleranceMinutes: String(row.checkInToleranceMinutes),
    breakToleranceMinutes: String(row.breakToleranceMinutes),
    checkOutToleranceMinutes: String(row.checkOutToleranceMinutes),
    isOvernight: row.isOvernight,
    applicableDivisionCodes: row.applicableDivisionCodes.join(", "),
    notes: row.notes,
    sortOrder: String(row.sortOrder),
    isActive: row.isActive,
  };
}

function toShiftInput(draft: WorkShiftDraft) {
  return {
    code: draft.code,
    name: draft.name,
    startTime: draft.startTime,
    endTime: draft.endTime,
    breakStart: draft.breakStart,
    breakEnd: draft.breakEnd,
    checkOutStart: draft.checkOutStart,
    checkInToleranceMinutes: Number(draft.checkInToleranceMinutes || 0),
    breakToleranceMinutes: Number(draft.breakToleranceMinutes || 0),
    checkOutToleranceMinutes: Number(draft.checkOutToleranceMinutes || 0),
    isOvernight: draft.isOvernight,
    applicableDivisionCodes: draft.applicableDivisionCodes
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean),
    notes: draft.notes,
    sortOrder: Number(draft.sortOrder || 0),
    isActive: draft.isActive,
  };
}

function ScheduleForm({
  draft,
  shifts,
  onChange,
  onDayChange,
}: {
  draft: WorkScheduleDraft;
  shifts: WorkShiftRow[];
  onChange: (field: keyof WorkScheduleDraft, value: string | boolean) => void;
  onDayChange: (
    index: number,
    field: keyof WorkScheduleDayDraft,
    value: string | boolean | number
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Kode</label>
          <Input
            value={draft.code}
            onChange={(event) => onChange("code", event.target.value)}
            maxLength={20}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Nama Jadwal</label>
          <Input
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Deskripsi</label>
        <textarea
          value={draft.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Status</label>
        <select
          value={draft.isActive ? "true" : "false"}
          onChange={(event) => onChange("isActive", event.target.value === "true")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Konfigurasi 7 Hari</h3>
        {draft.days.map((day, index) => (
          <div
            key={day.dayOfWeek}
            className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-6"
          >
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Hari</p>
              <p className="text-sm font-medium text-slate-800">{DAY_LABELS[day.dayOfWeek]}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Masuk Target</p>
              <select
                value={day.isWorkingDay ? "true" : "false"}
                onChange={(event) => {
                  const isWorkingDay = event.target.value === "true";
                  onDayChange(index, "isWorkingDay", isWorkingDay);
                if (!isWorkingDay) {
                  onDayChange(index, "dayStatus", "OFF");
                  onDayChange(index, "startTime", "");
                  onDayChange(index, "endTime", "");
                  onDayChange(index, "breakStart", "");
                  onDayChange(index, "breakEnd", "");
                  onDayChange(index, "breakToleranceMinutes", "0");
                  onDayChange(index, "checkInToleranceMinutes", "0");
                  onDayChange(index, "checkOutStart", "");
                  onDayChange(index, "checkOutToleranceMinutes", "0");
                  onDayChange(index, "targetPoints", "0");
                } else {
                  onDayChange(index, "dayStatus", "KERJA");
                  onDayChange(index, "breakStart", "12:00");
                  onDayChange(index, "breakEnd", "13:00");
                  onDayChange(index, "breakToleranceMinutes", "5");
                  onDayChange(index, "checkInToleranceMinutes", "0");
                  onDayChange(index, "targetPoints", String(POINT_TARGET_HARIAN));
                }
              }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Status Hari</p>
              <select
                value={day.dayStatus}
                onChange={(event) =>
                  onDayChange(index, "dayStatus", event.target.value)
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="KERJA">Kerja</option>
                <option value="SETENGAH_HARI">Setengah Hari</option>
                <option value="OFF">Off</option>
                <option value="CUTI">Cuti</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
                <option value="ALPA">Alpa</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Shift</p>
              <select
                value={day.shiftId}
                disabled={!day.isWorkingDay}
                onChange={(event) => {
                  const shiftId = event.target.value;
                  onDayChange(index, "shiftId", shiftId);
                  const shift = shifts.find((item) => item.id === shiftId);
                  if (shift) {
                    onDayChange(index, "startTime", shift.startTime);
                    onDayChange(index, "endTime", shift.endTime);
                    if (shift.breakStart) onDayChange(index, "breakStart", shift.breakStart);
                    if (shift.breakEnd) onDayChange(index, "breakEnd", shift.breakEnd);
                    if (shift.checkOutStart) onDayChange(index, "checkOutStart", shift.checkOutStart);
                    onDayChange(index, "checkInToleranceMinutes", String(shift.checkInToleranceMinutes));
                    onDayChange(index, "breakToleranceMinutes", String(shift.breakToleranceMinutes));
                    onDayChange(index, "checkOutToleranceMinutes", String(shift.checkOutToleranceMinutes));
                  }
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Manual</option>
                {shifts
                  .filter((shift) => shift.isActive)
                  .map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.code} ({shift.startTime}-{shift.endTime})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Jam Masuk</p>
              <Input
                type="time"
                value={day.startTime}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "startTime", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Jam Pulang</p>
              <Input
                type="time"
                value={day.endTime}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "endTime", event.target.value)
                }
                />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Mulai Istirahat</p>
              <Input
                type="time"
                value={day.breakStart}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "breakStart", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Selesai Istirahat</p>
              <Input
                type="time"
                value={day.breakEnd}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "breakEnd", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Toleransi Istirahat (menit)</p>
              <Input
                type="number"
                min={0}
                max={60}
                value={day.breakToleranceMinutes}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "breakToleranceMinutes", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Toleransi Masuk (menit)</p>
              <Input
                type="number"
                min={0}
                max={60}
                value={day.checkInToleranceMinutes}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "checkInToleranceMinutes", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Awal Tap Pulang</p>
              <Input
                type="time"
                value={day.checkOutStart}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "checkOutStart", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Toleransi Pulang (menit)</p>
              <Input
                type="number"
                min={0}
                max={60}
                value={day.checkOutToleranceMinutes}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "checkOutToleranceMinutes", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Target Poin</p>
              <Input
                type="number"
                value={day.targetPoints}
                disabled={!day.isWorkingDay}
                onChange={(event) =>
                  onDayChange(index, "targetPoints", event.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type WorkSchedulesTableProps = {
  data: WorkScheduleRow[];
  shifts: WorkShiftRow[];
};

export default function WorkSchedulesTable({
  data,
  shifts,
}: WorkSchedulesTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WorkScheduleRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<WorkScheduleRow | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShiftRow | null>(null);
  const [deletingShift, setDeletingShift] = useState<WorkShiftRow | null>(null);
  const [shiftDraft, setShiftDraft] = useState<WorkShiftDraft>(createShiftDraft());
  const [draft, setDraft] = useState<WorkScheduleDraft>(createEmptyDraft());
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleDraftChange(
    field: keyof WorkScheduleDraft,
    value: string | boolean
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleDayChange(
    index: number,
    field: keyof WorkScheduleDayDraft,
    value: string | boolean | number
  ) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day, dayIndex) =>
        dayIndex === index ? { ...day, [field]: value } : day
      ),
    }));
  }

  async function submitCreate() {
    setPending(true);
    setFormError(null);
    try {
      const result = await createWorkSchedule(toActionInput(draft));
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setCreateOpen(false);
      setDraft(createEmptyDraft());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function submitEdit() {
    if (!editingRow) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await updateWorkSchedule(editingRow.id, toActionInput(draft));
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
      const result = await deleteWorkSchedule(deletingRow.id);
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

  async function submitShift() {
    setPending(true);
    setFormError(null);
    try {
      const payload = toShiftInput(shiftDraft);
      const result = editingShift
        ? await updateWorkShiftMaster(editingShift.id, payload)
        : await createWorkShiftMaster(payload);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setEditingShift(null);
      setShiftDraft(createShiftDraft());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteShift() {
    if (!deletingShift) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await deleteWorkShiftMaster(deletingShift.id);
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      setDeletingShift(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const columns: ColumnDef<WorkScheduleRow>[] = useMemo(
    () => [
      {
        header: "Jadwal",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-500">{row.original.code}</p>
          </div>
        ),
      },
      {
        header: "Hari Kerja",
        id: "workingDays",
        cell: ({ row }) =>
          row.original.days.filter((day) => day.isWorkingDay).length,
      },
      {
        header: "Ringkasan",
        id: "summary",
        cell: ({ row }) => {
          const workingDays = row.original.days.filter((day) => day.isWorkingDay);
          if (!workingDays.length) return "Semua hari off";
          const firstDay = workingDays[0];
          return `${firstDay?.startTime ?? "-"} - ${firstDay?.endTime ?? "-"} / istirahat ${firstDay?.breakStart ?? "-"}-${firstDay?.breakEnd ?? "-"} / tol ${firstDay?.breakToleranceMinutes ?? 0}m / ${firstDay?.targetPoints ?? 0} poin`;
        },
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
                setDraft(createDraftFromRow(row.original));
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
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setShiftOpen(true)}>
            Kelola Shift
          </Button>
          <Button
            type="button"
            onClick={() => {
              setFormError(null);
              setDraft(createEmptyDraft());
              setCreateOpen(true);
            }}
          >
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {shiftOpen ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Master Shift</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setFormError(null);
                setEditingShift(null);
                setShiftDraft(createShiftDraft());
              }}
            >
              Tambah Shift
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={shiftDraft.code} onChange={(event) => setShiftDraft((v) => ({ ...v, code: event.target.value }))} placeholder="Kode shift" />
            <Input value={shiftDraft.name} onChange={(event) => setShiftDraft((v) => ({ ...v, name: event.target.value }))} placeholder="Nama shift" />
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Jam Masuk</p>
              <Input type="time" value={shiftDraft.startTime} onChange={(event) => setShiftDraft((v) => ({ ...v, startTime: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Jam Pulang</p>
              <Input type="time" value={shiftDraft.endTime} onChange={(event) => setShiftDraft((v) => ({ ...v, endTime: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Mulai Istirahat</p>
              <Input type="time" value={shiftDraft.breakStart} onChange={(event) => setShiftDraft((v) => ({ ...v, breakStart: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Selesai Istirahat</p>
              <Input type="time" value={shiftDraft.breakEnd} onChange={(event) => setShiftDraft((v) => ({ ...v, breakEnd: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Awal Tap Pulang Valid</p>
              <Input type="time" value={shiftDraft.checkOutStart} onChange={(event) => setShiftDraft((v) => ({ ...v, checkOutStart: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Toleransi Masuk (menit)</p>
              <Input type="number" min={0} max={60} value={shiftDraft.checkInToleranceMinutes} onChange={(event) => setShiftDraft((v) => ({ ...v, checkInToleranceMinutes: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Toleransi Istirahat (menit)</p>
              <Input type="number" min={0} max={60} value={shiftDraft.breakToleranceMinutes} onChange={(event) => setShiftDraft((v) => ({ ...v, breakToleranceMinutes: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Toleransi Pulang (menit)</p>
              <Input type="number" min={0} max={60} value={shiftDraft.checkOutToleranceMinutes} onChange={(event) => setShiftDraft((v) => ({ ...v, checkOutToleranceMinutes: event.target.value }))} />
            </div>
            <Input value={shiftDraft.sortOrder} onChange={(event) => setShiftDraft((v) => ({ ...v, sortOrder: event.target.value }))} type="number" placeholder="Urutan" />
            <select
              value={shiftDraft.isActive ? "true" : "false"}
              onChange={(event) => setShiftDraft((v) => ({ ...v, isActive: event.target.value === "true" }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
          <Input
            value={shiftDraft.applicableDivisionCodes}
            onChange={(event) => setShiftDraft((v) => ({ ...v, applicableDivisionCodes: event.target.value }))}
            placeholder="Divisi berlaku (pisahkan koma), contoh: FINISHING, PRINTING"
          />
          <textarea
            value={shiftDraft.notes}
            onChange={(event) => setShiftDraft((v) => ({ ...v, notes: event.target.value }))}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Catatan shift"
          />
          <div className="grid gap-2">
            {shifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                <span>{shift.code} - {shift.name} ({shift.startTime}-{shift.endTime})</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingShift(shift); setShiftDraft(createShiftDraftFromRow(shift)); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeletingShift(shift)}>
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setShiftOpen(false); setEditingShift(null); }}>
              Tutup
            </Button>
            <Button type="button" onClick={() => void submitShift()} disabled={pending}>
              {pending ? "Menyimpan..." : editingShift ? "Simpan Shift" : "Tambah Shift"}
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        data={data}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Cari jadwal kerja..."
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Kerja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ScheduleForm
              draft={draft}
              shifts={shifts}
              onChange={handleDraftChange}
              onDayChange={handleDayChange}
            />
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={pending}
              >
                Batal
              </Button>
              <Button type="button" onClick={() => void submitCreate()} disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Jadwal Kerja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ScheduleForm
              draft={draft}
              shifts={shifts}
              onChange={handleDraftChange}
              onDayChange={handleDayChange}
            />
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRow(null)}
                disabled={pending}
              >
                Batal
              </Button>
              <Button type="button" onClick={() => void submitEdit()} disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </div>
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
            <AlertDialogTitle>Hapus Jadwal Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              {`Jadwal "${deletingRow?.name ?? ""}" akan dihapus jika sudah tidak dipakai profil karyawan.`}
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

      <AlertDialog
        open={deletingShift !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingShift(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Master Shift</AlertDialogTitle>
            <AlertDialogDescription>
              {`Shift "${deletingShift?.name ?? ""}" akan dihapus.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteShift();
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
