"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignEmployeeSchedule, assignEmployeeSchedulesBulk, getEmployeeScheduleDetail } from "@/server/actions/schedule";
import { createWorkShiftMaster, deleteWorkShiftMaster, updateWorkShiftMaster } from "@/server/actions/work-schedules";
import { CalendarCog, CalendarDays, CheckCircle2, Clock, Filter, Loader2, Users } from "lucide-react";
import type { MyScheduleResult } from "@/server/actions/schedule";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";
import {
  NEW_EMPLOYEE_GROUPS,
  normalizeEmployeeGroup,
  resolveEmployeeGroupLabel,
} from "@/lib/employee-groups";

type TeamMember = {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branchId: string | null;
  branchName: string;
  divisionId: string | null;
  divisionName: string;
  positionId: string | null;
  positionName: string;
  employeeGroup: import("@/lib/employee-groups").EmployeeGroup;
  scheduleName: string | null;
  scheduleCode: string | null;
  scheduleId: string | null;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
};

type ScheduleOption = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  teamMembers: TeamMember[];
  scheduleOptions: ScheduleOption[];
  shiftMasters: ShiftMaster[];
  canBulkAssign?: boolean;
};

type AssignForm = {
  employeeId: string;
  employeeName: string;
  scheduleId: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  notes: string;
};

type BulkForm = {
  scheduleId: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  notes: string;
};

type ShiftMaster = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type ShiftDraft = {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDaysStr(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return "-";
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export default function SchedulerClient({ teamMembers, scheduleOptions, shiftMasters, canBulkAssign = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"SCHEDULER" | "SHIFT">("SCHEDULER");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [form, setForm] = useState<AssignForm>({
    employeeId: "",
    employeeName: "",
    scheduleId: "",
    effectiveStartDate: getTodayStr(),
    effectiveEndDate: addDaysStr(6),
    notes: "",
  });
  const [bulkForm, setBulkForm] = useState<BulkForm>({
    scheduleId: "",
    effectiveStartDate: getTodayStr(),
    effectiveEndDate: addDaysStr(6),
    notes: "",
  });
  const [branchFilter, setBranchFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [shiftSuccess, setShiftSuccess] = useState(false);
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft>({
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    isActive: true,
  });
  const [scheduleDetailOpen, setScheduleDetailOpen] = useState(false);
  const [scheduleDetailLoading, setScheduleDetailLoading] = useState(false);
  const [scheduleDetailError, setScheduleDetailError] = useState<string | null>(null);
  const [scheduleDetail, setScheduleDetail] = useState<MyScheduleResult | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const branchOptions = useMemo(
    () =>
      Array.from(
        new Map(
          teamMembers
            .map((member) => [member.branchId ?? member.branchName, member.branchName] as const)
        ).entries()
      ).map(([value, label]) => ({ value, label })),
    [teamMembers]
  );

  const divisionOptions = useMemo(
    () =>
      Array.from(
        new Map(
          teamMembers
            .map((member) => [member.divisionId ?? member.divisionName, member.divisionName] as const)
        ).entries()
      ).map(([value, label]) => ({ value, label })),
    [teamMembers]
  );

  const positionOptions = useMemo(
    () =>
      Array.from(
        new Map(
          teamMembers
            .map((member) => [member.positionId ?? member.positionName, member.positionName] as const)
        ).entries()
      ).map(([value, label]) => ({ value, label })),
    [teamMembers]
  );

  const filteredTeamMembers = useMemo(
    () =>
      teamMembers.filter((member) => {
        const branchMatch = branchFilter
          ? (member.branchId ?? member.branchName) === branchFilter
          : true;
        const divisionMatch = divisionFilter
          ? (member.divisionId ?? member.divisionName) === divisionFilter
          : true;
        const positionMatch = positionFilter
          ? (member.positionId ?? member.positionName) === positionFilter
          : true;
        const groupMatch = groupFilter ? normalizeEmployeeGroup(member.employeeGroup) === groupFilter : true;
        return branchMatch && divisionMatch && positionMatch && groupMatch;
      }),
    [branchFilter, divisionFilter, groupFilter, positionFilter, teamMembers]
  );

  function resetFilters() {
    setBranchFilter("");
    setDivisionFilter("");
    setPositionFilter("");
    setGroupFilter("");
  }

  function resetShiftForm() {
    setShiftDraft({
      name: "",
      startTime: "08:00",
      endTime: "17:00",
      isActive: true,
    });
    setShiftError(null);
    setShiftSuccess(false);
  }

  function startEditShift(shift: ShiftMaster) {
    setShiftDraft({
      id: shift.id,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isActive: shift.isActive,
    });
    setShiftError(null);
    setShiftSuccess(false);
  }

  function openDialog(member: TeamMember) {
    setForm({
      employeeId: member.employeeId,
      employeeName: member.employeeName,
      scheduleId: member.scheduleId ?? "",
      effectiveStartDate: getTodayStr(),
      effectiveEndDate: addDaysStr(6),
      notes: "",
    });
    setError(null);
    setSuccess(false);
    setDialogOpen(true);
  }

  function closeScheduleDetail() {
    setScheduleDetailOpen(false);
    setScheduleDetail(null);
    setSelectedMember(null);
    setScheduleDetailError(null);
    setScheduleDetailLoading(false);
  }

  function openScheduleDetail(member: TeamMember) {
    setSelectedMember(member);
    setScheduleDetailOpen(true);
    setScheduleDetailLoading(true);
    setScheduleDetailError(null);
    setScheduleDetail(null);

    startTransition(async () => {
      try {
        const result = await getEmployeeScheduleDetail(member.employeeId);
        if (!result) {
          setScheduleDetailError("Jadwal karyawan tidak ditemukan.");
          setScheduleDetailLoading(false);
          return;
        }

        setScheduleDetail(result);
        setScheduleDetailLoading(false);
      } catch {
        setScheduleDetailError("Gagal memuat jadwal karyawan.");
        setScheduleDetailLoading(false);
      }
    });
  }

  function openBulkDialog() {
    setBulkForm({
      scheduleId: "",
      effectiveStartDate: getTodayStr(),
      effectiveEndDate: addDaysStr(6),
      notes: "",
    });
    setBulkError(null);
    setBulkSuccess(false);
    setBulkDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setError(null);
    setSuccess(false);
  }

  function handleBulkClose() {
    setBulkDialogOpen(false);
    setBulkError(null);
    setBulkSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.scheduleId) {
      setError("Pilih master shift terlebih dahulu.");
      return;
    }
    if (!form.effectiveStartDate || !form.effectiveEndDate) {
      setError("Rentang tanggal harus diisi.");
      return;
    }

    startTransition(async () => {
      const result = await assignEmployeeSchedule({
        employeeId: form.employeeId,
        scheduleId: form.scheduleId,
        effectiveStartDate: form.effectiveStartDate,
        effectiveEndDate: form.effectiveEndDate,
        notes: form.notes || undefined,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setDialogOpen(false);
          setSuccess(false);
        }, 1200);
      }
    });
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkError(null);
    setBulkSuccess(false);

    if (!bulkForm.scheduleId) {
      setBulkError("Pilih master shift terlebih dahulu.");
      return;
    }
    if (!bulkForm.effectiveStartDate || !bulkForm.effectiveEndDate) {
      setBulkError("Rentang tanggal harus diisi.");
      return;
    }
    if (filteredTeamMembers.length === 0) {
      setBulkError("Tidak ada karyawan yang cocok dengan filter aktif.");
      return;
    }

    startTransition(async () => {
      const result = await assignEmployeeSchedulesBulk({
        employeeIds: filteredTeamMembers.map((member) => member.employeeId),
        scheduleId: bulkForm.scheduleId,
        effectiveStartDate: bulkForm.effectiveStartDate,
        effectiveEndDate: bulkForm.effectiveEndDate,
        notes: bulkForm.notes || undefined,
      });

      if ("error" in result) {
        setBulkError(result.error);
      } else {
        setBulkSuccess(true);
        router.refresh();
        setTimeout(() => {
          setBulkDialogOpen(false);
          setBulkSuccess(false);
        }, 1200);
      }
    });
  }

  async function handleShiftSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShiftError(null);
    setShiftSuccess(false);

    if (!shiftDraft.name.trim()) {
      setShiftError("Nama shift wajib diisi.");
      return;
    }

    startTransition(async () => {
      const code = shiftDraft.name.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 20);
      const payload = {
        code,
        name: shiftDraft.name.trim(),
        startTime: shiftDraft.startTime,
        endTime: shiftDraft.endTime,
        isOvernight: false,
        applicableDivisionCodes: [],
        notes: "",
        sortOrder: 0,
        isActive: shiftDraft.isActive,
      };

      const result = shiftDraft.id
        ? await updateWorkShiftMaster(shiftDraft.id, payload)
        : await createWorkShiftMaster(payload);

      if ("error" in result) {
        setShiftError(result.error);
      } else {
        setShiftSuccess(true);
        router.refresh();
        setTimeout(() => resetShiftForm(), 700);
      }
    });
  }

  function handleDeleteShift(shiftId: string) {
    setShiftError(null);
    setShiftSuccess(false);
    startTransition(async () => {
      const result = await deleteWorkShiftMaster(shiftId);
      if ("error" in result) {
        setShiftError(result.error);
      } else {
        setShiftSuccess(true);
        router.refresh();
      }
    });
  }

  const columns: ColumnDef<TeamMember & Record<string, unknown>>[] = [
    {
      accessorKey: "employeeName",
      header: "Nama Karyawan",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => openScheduleDetail(row.original)}
          className="text-left group"
        >
          <p className="font-semibold text-slate-800 group-hover:text-teal-700 group-hover:underline">
            {row.original.employeeName}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{row.original.employeeCode}</p>
        </button>
      ),
    },
    {
      accessorKey: "divisionName",
      header: "Divisi",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">{row.original.divisionName}</span>
      ),
    },
    {
      accessorKey: "scheduleName",
      header: "Jadwal Aktif",
      cell: ({ row }) => {
        const { scheduleName, scheduleCode, effectiveStartDate, effectiveEndDate } = row.original;
        if (!scheduleName) {
          return <span className="text-xs text-slate-400 italic">Belum ada jadwal</span>;
        }
        return (
          <div>
            <p className="text-sm font-semibold text-slate-800">{scheduleName}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-mono">{scheduleCode}</span>
              {effectiveStartDate && (
                <span className="ml-1.5">· sejak {effectiveStartDate}</span>
              )}
              {effectiveEndDate && (
                <span className="ml-1.5">s.d. {effectiveEndDate}</span>
              )}
            </p>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs font-semibold border-slate-200 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-colors"
          onClick={() => openDialog(row.original)}
        >
          <CalendarCog size={12} className="mr-1.5" />
          Ganti Jadwal
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant={activeTab === "SCHEDULER" ? "default" : "outline"}
          className={activeTab === "SCHEDULER" ? "bg-teal-600 hover:bg-teal-700" : ""}
          onClick={() => setActiveTab("SCHEDULER")}
        >
          Pengatur Jadwal
        </Button>
        <Button
          type="button"
          variant={activeTab === "SHIFT" ? "default" : "outline"}
          className={activeTab === "SHIFT" ? "bg-teal-600 hover:bg-teal-700" : ""}
          onClick={() => setActiveTab("SHIFT")}
        >
          Master Shift
        </Button>
      </div>

      {activeTab === "SCHEDULER" ? (
        <>
          <div className="space-y-4 mb-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={16} className="text-teal-500" />
                <h2 className="text-sm font-semibold text-slate-900">Filter Tim</h2>
              </div>

              <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                <select
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">Semua cabang</option>
                  {branchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={divisionFilter}
                  onChange={(event) => setDivisionFilter(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">Semua divisi</option>
                  {divisionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={positionFilter}
                  onChange={(event) => setPositionFilter(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">Semua jabatan</option>
                  {positionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">Semua kelompok</option>
                  {NEW_EMPLOYEE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {resolveEmployeeGroupLabel(group)}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFilters}
                    className="h-10 w-10 px-0"
                    aria-label="Reset Filter"
                    title="Reset Filter"
                  >
                    <FontAwesomeIcon icon={faArrowsRotate} className="h-3.5 w-3.5" />
                  </Button>
                  {canBulkAssign && (
                    <Button type="button" onClick={openBulkDialog} className="h-10 bg-teal-600 hover:bg-teal-700">
                      Atur Serentak
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DataTable
            data={filteredTeamMembers as (TeamMember & Record<string, unknown>)[]}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Cari karyawan..."
          />
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Master Shift</h2>
          <form onSubmit={handleShiftSubmit} className="grid gap-3 md:grid-cols-4">
            <Input
              value={shiftDraft.name}
              onChange={(event) => setShiftDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nama shift"
            />
            <Input
              type="time"
              value={shiftDraft.startTime}
              onChange={(event) => setShiftDraft((prev) => ({ ...prev, startTime: event.target.value }))}
            />
            <Input
              type="time"
              value={shiftDraft.endTime}
              onChange={(event) => setShiftDraft((prev) => ({ ...prev, endTime: event.target.value }))}
            />
            <div className="flex gap-2">
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isPending}>
                {shiftDraft.id ? "Simpan" : "Tambah"}
              </Button>
              <Button type="button" variant="outline" onClick={resetShiftForm} disabled={isPending}>
                Reset
              </Button>
            </div>
          </form>

          {shiftError && <p className="text-xs text-red-600">{shiftError}</p>}
          {shiftSuccess && <p className="text-xs text-teal-700">Perubahan master shift berhasil disimpan.</p>}

          <div className="space-y-2">
            {shiftMasters.map((shift) => (
              <div key={shift.id} className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{shift.name}</p>
                  <p className="text-xs text-slate-500">{shift.startTime} - {shift.endTime}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEditShift(shift)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => handleDeleteShift(shift.id)}>
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={scheduleDetailOpen} onOpenChange={(open) => !open && closeScheduleDetail()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CalendarDays size={16} className="text-teal-500" />
              Jadwal Penuh Karyawan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {selectedMember?.employeeName ?? "-"}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {selectedMember?.employeeCode ?? "-"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedMember?.divisionName ?? "-"} · {selectedMember?.positionName ?? "-"}
              </p>
            </div>

            {scheduleDetailLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                <Loader2 size={14} className="animate-spin" />
                Memuat jadwal...
              </div>
            ) : scheduleDetailError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-xs text-red-700">{scheduleDetailError}</p>
              </div>
            ) : scheduleDetail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 font-semibold text-teal-700">
                    {scheduleDetail.scheduleName} ({scheduleDetail.scheduleCode})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDateDisplay(scheduleDetail.days[0]?.date ?? "")} - {formatDateDisplay(scheduleDetail.days[scheduleDetail.days.length - 1]?.date ?? "")}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {scheduleDetail.days.map((day) => {
                    const isTicket = Boolean(day.ticketOverride);
                    const label = day.ticketOverride ?? (day.dayStatus === "KERJA" ? "KERJA" : day.dayStatus);
                    const timeLabel = day.startTime && day.endTime ? `${day.startTime} - ${day.endTime}` : "-";

                    return (
                      <div
                        key={day.date}
                        className={`rounded-lg border p-3 ${
                          isTicket
                            ? "border-amber-200 bg-amber-50"
                            : day.isWorkingDay
                            ? "border-teal-200 bg-teal-50/50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <p className="text-[11px] font-semibold text-slate-900">{formatDateDisplay(day.date)}</p>
                        <p className="text-[11px] text-slate-500">{DAY_NAMES_ID[day.dayOfWeek]}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{isTicket ? "Izin / Cuti" : timeLabel}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Pilih karyawan untuk melihat jadwal.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <CalendarCog size={16} className="text-teal-500" />
              Ganti Jadwal
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Employee name (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Karyawan
              </Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800">{form.employeeName}</p>
              </div>
            </div>

            {/* Schedule select */}
            <div className="space-y-1.5">
              <Label
                htmlFor="scheduleId"
                className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Master Shift
              </Label>
              <select
                id="scheduleId"
                value={form.scheduleId}
                onChange={(e) => setForm((f) => ({ ...f, scheduleId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                required
              >
                <option value="">— Pilih master shift —</option>
                {scheduleOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Effective date */}
            <div className="space-y-1.5">
              <Label
                htmlFor="effectiveStartDate"
                className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Tanggal Mulai
              </Label>
              <Input
                id="effectiveStartDate"
                type="date"
                value={form.effectiveStartDate}
                onChange={(e) => setForm((f) => ({ ...f, effectiveStartDate: e.target.value }))}
                className="h-10 text-sm border-slate-200 focus-visible:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="effectiveEndDate"
                className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Tanggal Selesai
              </Label>
              <Input
                id="effectiveEndDate"
                type="date"
                value={form.effectiveEndDate}
                onChange={(e) => setForm((f) => ({ ...f, effectiveEndDate: e.target.value }))}
                className="h-10 text-sm border-slate-200 focus-visible:ring-teal-500"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label
                htmlFor="notes"
                className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Catatan <span className="font-normal text-slate-400">(opsional)</span>
              </Label>
              <Input
                id="notes"
                type="text"
                placeholder="Alasan perubahan jadwal..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="h-10 text-sm border-slate-200 focus-visible:ring-teal-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-teal-600" />
                <p className="text-xs text-teal-700 font-semibold">Jadwal berhasil disimpan!</p>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending || success}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Jadwal"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={handleBulkClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-teal-500" />
              Atur Jadwal Serentak
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBulkSubmit} className="space-y-4 py-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Target terfilter</p>
              <p className="text-sm font-semibold text-slate-800">
                {filteredTeamMembers.length} karyawan
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkScheduleId" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Master Shift
              </Label>
              <select
                id="bulkScheduleId"
                value={bulkForm.scheduleId}
                onChange={(event) => setBulkForm((current) => ({ ...current, scheduleId: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                required
              >
                <option value="">— Pilih master shift —</option>
                {scheduleOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkEffectiveDate" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Tanggal Mulai
              </Label>
              <Input
                id="bulkEffectiveStartDate"
                type="date"
                value={bulkForm.effectiveStartDate}
                onChange={(event) => setBulkForm((current) => ({ ...current, effectiveStartDate: event.target.value }))}
                className="h-10 text-sm border-slate-200 focus-visible:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkEffectiveEndDate" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Tanggal Selesai
              </Label>
              <Input
                id="bulkEffectiveEndDate"
                type="date"
                value={bulkForm.effectiveEndDate}
                onChange={(event) => setBulkForm((current) => ({ ...current, effectiveEndDate: event.target.value }))}
                className="h-10 text-sm border-slate-200 focus-visible:ring-teal-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkNotes" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Catatan <span className="font-normal text-slate-400">(opsional)</span>
              </Label>
              <Input
                id="bulkNotes"
                type="text"
                placeholder="Contoh: penyesuaian hari libur nasional"
                value={bulkForm.notes}
                onChange={(event) => setBulkForm((current) => ({ ...current, notes: event.target.value }))}
                className="h-10 text-sm border-slate-200 focus-visible:ring-teal-500"
              />
            </div>

            {bulkError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                <p className="text-xs text-red-700 font-medium">{bulkError}</p>
              </div>
            )}

            {bulkSuccess && (
              <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-teal-600" />
                <p className="text-xs text-teal-700 font-semibold">Jadwal serentak berhasil disimpan!</p>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBulkClose}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending || bulkSuccess || filteredTeamMembers.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Serentak"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

