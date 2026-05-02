"use client";

import { useState, useTransition } from "react";
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
import { assignEmployeeSchedule } from "@/server/actions/schedule";
import { CalendarCog, CheckCircle2, Loader2 } from "lucide-react";

type TeamMember = {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  scheduleName: string | null;
  scheduleCode: string | null;
  scheduleId: string | null;
  effectiveStartDate: string | null;
};

type ScheduleOption = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  teamMembers: TeamMember[];
  scheduleOptions: ScheduleOption[];
};

type AssignForm = {
  employeeId: string;
  employeeName: string;
  scheduleId: string;
  effectiveDate: string;
  notes: string;
};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SchedulerClient({ teamMembers, scheduleOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AssignForm>({
    employeeId: "",
    employeeName: "",
    scheduleId: "",
    effectiveDate: getTodayStr(),
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function openDialog(member: TeamMember) {
    setForm({
      employeeId: member.employeeId,
      employeeName: member.employeeName,
      scheduleId: member.scheduleId ?? "",
      effectiveDate: getTodayStr(),
      notes: "",
    });
    setError(null);
    setSuccess(false);
    setDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.scheduleId) {
      setError("Pilih jadwal terlebih dahulu.");
      return;
    }
    if (!form.effectiveDate) {
      setError("Tanggal efektif harus diisi.");
      return;
    }

    startTransition(async () => {
      const result = await assignEmployeeSchedule({
        employeeId: form.employeeId,
        scheduleId: form.scheduleId,
        effectiveDate: form.effectiveDate,
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

  const columns: ColumnDef<TeamMember & Record<string, unknown>>[] = [
    {
      accessorKey: "employeeName",
      header: "Nama Karyawan",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-slate-800">{row.original.employeeName}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{row.original.employeeCode}</p>
        </div>
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
        const { scheduleName, scheduleCode, effectiveStartDate } = row.original;
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
      <DataTable
        data={teamMembers as (TeamMember & Record<string, unknown>)[]}
        columns={columns}
        searchKey="employeeName"
        searchPlaceholder="Cari karyawan..."
      />

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
                Jadwal Baru
              </Label>
              <select
                id="scheduleId"
                value={form.scheduleId}
                onChange={(e) => setForm((f) => ({ ...f, scheduleId: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                required
              >
                <option value="">— Pilih jadwal —</option>
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
                htmlFor="effectiveDate"
                className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Tanggal Efektif
              </Label>
              <Input
                id="effectiveDate"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
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
    </>
  );
}
