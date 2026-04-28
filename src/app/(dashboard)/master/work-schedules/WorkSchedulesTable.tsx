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
  deleteWorkSchedule,
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
  startTime: string;
  endTime: string;
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

function createDefaultDays() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    dayStatus: dayOfWeek === 0 ? "OFF" : "KERJA",
    isWorkingDay: dayOfWeek !== 0,
    startTime: dayOfWeek === 0 ? "" : "08:00",
    endTime: dayOfWeek === 0 ? "" : "17:00",
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
      startTime: day.startTime ?? "",
      endTime: day.endTime ?? "",
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
      targetPoints: Number(day.targetPoints || 0),
    })),
  };
}

function ScheduleForm({
  draft,
  onChange,
  onDayChange,
}: {
  draft: WorkScheduleDraft;
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
                    onDayChange(index, "targetPoints", "0");
                  } else {
                    onDayChange(index, "dayStatus", "KERJA");
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
};

export default function WorkSchedulesTable({
  data,
}: WorkSchedulesTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WorkScheduleRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<WorkScheduleRow | null>(null);
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
          return `${workingDays[0]?.startTime ?? "-"} - ${workingDays[0]?.endTime ?? "-"} / ${workingDays[0]?.targetPoints ?? 0} poin`;
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
    </div>
  );
}
