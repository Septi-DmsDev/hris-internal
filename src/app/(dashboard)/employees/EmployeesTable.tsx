"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
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
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
} from "@/server/actions/employees";
import { getEmployeeLoginInfo, upsertEmployeeLogin } from "@/server/actions/users";

const EMPLOYEE_GROUP_OPTIONS = [
  { value: "TEAMWORK", label: "Teamwork" },
  { value: "MANAGERIAL", label: "Managerial" },
] as const;

const EMPLOYMENT_STATUS_OPTIONS = [
  "TRAINING",
  "REGULER",
  "DIALIHKAN_TRAINING",
  "TIDAK_LOLOS",
  "NONAKTIF",
  "RESIGN",
] as const;

const PAYROLL_STATUS_OPTIONS = [
  "TRAINING",
  "REGULER",
  "FINAL_PAYROLL",
  "NONAKTIF",
] as const;

const EMPLOYMENT_STATUS_LABEL: Record<
  (typeof EMPLOYMENT_STATUS_OPTIONS)[number],
  string
> = {
  TRAINING: "Training",
  REGULER: "Reguler",
  DIALIHKAN_TRAINING: "Dialihkan Training",
  TIDAK_LOLOS: "Tidak Lolos",
  NONAKTIF: "Nonaktif",
  RESIGN: "Resign",
};

const PAYROLL_STATUS_LABEL: Record<
  (typeof PAYROLL_STATUS_OPTIONS)[number],
  string
> = {
  TRAINING: "Training",
  REGULER: "Reguler",
  FINAL_PAYROLL: "Final Payroll",
  NONAKTIF: "Nonaktif",
};

type Option = {
  id: string;
  name: string;
};

type PositionOption = Option & {
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
};

type ScheduleOption = Option & {
  code: string;
};

export type EmployeeFormOptions = {
  branches: Option[];
  divisions: Option[];
  positions: PositionOption[];
  grades: Array<Option & { code: string }>;
  schedules: ScheduleOption[];
  supervisors: Array<{ id: string; fullName: string }>;
  canManage: boolean;
};

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  divisionName: string;
  positionName: string;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus:
    | "TRAINING"
    | "REGULER"
    | "DIALIHKAN_TRAINING"
    | "TIDAK_LOLOS"
    | "NONAKTIF"
    | "RESIGN";
  payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
  supervisorName: string;
  isActive: boolean;
  startDate: string;
};

type EmployeeDraft = {
  employeeCode: string;
  fullName: string;
  nickname: string;
  photoUrl: string;
  phoneNumber: string;
  address: string;
  startDate: string;
  branchId: string;
  divisionId: string;
  positionId: string;
  jobdesk: string;
  gradeId: string;
  scheduleId: string;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus:
    | "TRAINING"
    | "REGULER"
    | "DIALIHKAN_TRAINING"
    | "TIDAK_LOLOS"
    | "NONAKTIF"
    | "RESIGN";
  payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
  supervisorEmployeeId: string;
  effectiveDate: string;
  trainingGraduationDate: string;
  isActive: boolean;
  notes: string;
};

type EmployeeDetailResult = Awaited<ReturnType<typeof getEmployeeById>>;

type LoginDraft = { email: string; password: string; confirmPassword: string };

function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return format(value, "yyyy-MM-dd");
}

function createEmptyDraft(): EmployeeDraft {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    employeeCode: "",
    fullName: "",
    nickname: "",
    photoUrl: "",
    phoneNumber: "",
    address: "",
    startDate: today,
    branchId: "",
    divisionId: "",
    positionId: "",
    jobdesk: "",
    gradeId: "",
    scheduleId: "",
    employeeGroup: "TEAMWORK",
    employmentStatus: "TRAINING",
    payrollStatus: "TRAINING",
    supervisorEmployeeId: "",
    effectiveDate: today,
    trainingGraduationDate: "",
    isActive: true,
    notes: "",
  };
}

function createDraftFromEmployee(detail: NonNullable<EmployeeDetailResult>) {
  const { employee, currentScheduleAssignment } = detail;

  return {
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    nickname: employee.nickname ?? "",
    photoUrl: employee.photoUrl ?? "",
    phoneNumber: employee.phoneNumber ?? "",
    address: employee.address ?? "",
    startDate: formatDateInput(employee.startDate),
    branchId: employee.branchId,
    divisionId: employee.divisionId,
    positionId: employee.positionId,
    jobdesk: employee.jobdesk ?? "",
    gradeId: employee.gradeId,
    scheduleId: currentScheduleAssignment?.scheduleId ?? "",
    employeeGroup: employee.employeeGroup,
    employmentStatus: employee.employmentStatus,
    payrollStatus: employee.payrollStatus,
    supervisorEmployeeId: employee.supervisorEmployeeId ?? "",
    effectiveDate: format(new Date(), "yyyy-MM-dd"),
    trainingGraduationDate: formatDateInput(employee.trainingGraduationDate),
    isActive: employee.isActive,
    notes: employee.notes ?? "",
  } satisfies EmployeeDraft;
}

function toActionInput(draft: EmployeeDraft) {
  return {
    employeeCode: draft.employeeCode,
    fullName: draft.fullName,
    nickname: draft.nickname,
    photoUrl: draft.photoUrl,
    phoneNumber: draft.phoneNumber,
    address: draft.address,
    startDate: draft.startDate,
    branchId: draft.branchId,
    divisionId: draft.divisionId,
    positionId: draft.positionId,
    jobdesk: draft.jobdesk,
    gradeId: draft.gradeId,
    scheduleId: draft.scheduleId,
    employeeGroup: draft.employeeGroup,
    employmentStatus: draft.employmentStatus,
    payrollStatus: draft.payrollStatus,
    supervisorEmployeeId: draft.supervisorEmployeeId,
    effectiveDate: draft.effectiveDate,
    trainingGraduationDate: draft.trainingGraduationDate,
    isActive: draft.isActive,
    notes: draft.notes,
  };
}

function DraftField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function EmployeeForm({
  draft,
  onChange,
  options,
}: {
  draft: EmployeeDraft;
  onChange: (
    field: keyof EmployeeDraft,
    value: string | boolean
  ) => void;
  options: EmployeeFormOptions;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DraftField label="ID Karyawan / NIK">
        <Input
          value={draft.employeeCode}
          onChange={(event) => onChange("employeeCode", event.target.value)}
          maxLength={30}
          required
        />
      </DraftField>
      <DraftField label="Nama Lengkap">
        <Input
          value={draft.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          maxLength={150}
          required
        />
      </DraftField>
      <DraftField label="Nama Panggilan">
        <Input
          value={draft.nickname}
          onChange={(event) => onChange("nickname", event.target.value)}
          maxLength={100}
        />
      </DraftField>
      <DraftField label="Nomor HP">
        <Input
          value={draft.phoneNumber}
          onChange={(event) => onChange("phoneNumber", event.target.value)}
          maxLength={30}
        />
      </DraftField>
      <DraftField label="Tanggal Masuk">
        <Input
          type="date"
          value={draft.startDate}
          onChange={(event) => onChange("startDate", event.target.value)}
          required
        />
      </DraftField>
      <DraftField label="Tanggal Efektif Perubahan">
        <Input
          type="date"
          value={draft.effectiveDate}
          onChange={(event) => onChange("effectiveDate", event.target.value)}
        />
      </DraftField>
      <DraftField label="Cabang">
        <select
          value={draft.branchId}
          onChange={(event) => onChange("branchId", event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Pilih cabang</option>
          {options.branches.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Divisi">
        <select
          value={draft.divisionId}
          onChange={(event) => onChange("divisionId", event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Pilih divisi</option>
          {options.divisions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Jabatan">
        <select
          value={draft.positionId}
          onChange={(event) => onChange("positionId", event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Pilih jabatan</option>
          {options.positions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.employeeGroup})
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Grade">
        <select
          value={draft.gradeId}
          onChange={(event) => onChange("gradeId", event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Pilih grade</option>
          {options.grades.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.code})
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Kelompok Karyawan">
        <select
          value={draft.employeeGroup}
          onChange={(event) =>
            onChange(
              "employeeGroup",
              event.target.value as EmployeeDraft["employeeGroup"]
            )
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {EMPLOYEE_GROUP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Status Kerja">
        <select
          value={draft.employmentStatus}
          onChange={(event) =>
            onChange(
              "employmentStatus",
              event.target.value as EmployeeDraft["employmentStatus"]
            )
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {EMPLOYMENT_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Status Payroll">
        <select
          value={draft.payrollStatus}
          onChange={(event) =>
            onChange(
              "payrollStatus",
              event.target.value as EmployeeDraft["payrollStatus"]
            )
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {PAYROLL_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PAYROLL_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Supervisor">
        <select
          value={draft.supervisorEmployeeId}
          onChange={(event) =>
            onChange("supervisorEmployeeId", event.target.value)
          }
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Pilih supervisor</option>
          {options.supervisors.map((option) => (
            <option key={option.id} value={option.id}>
              {option.fullName}
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Jadwal Kerja">
        <select
          value={draft.scheduleId}
          onChange={(event) => onChange("scheduleId", event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Belum ditetapkan</option>
          {options.schedules.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.code})
            </option>
          ))}
        </select>
      </DraftField>
      <DraftField label="Jobdesk">
        <Input
          value={draft.jobdesk}
          onChange={(event) => onChange("jobdesk", event.target.value)}
          maxLength={100}
        />
      </DraftField>
      <DraftField label="Tanggal Lulus Training">
        <Input
          type="date"
          value={draft.trainingGraduationDate}
          onChange={(event) =>
            onChange("trainingGraduationDate", event.target.value)
          }
        />
      </DraftField>
      <DraftField label="Foto URL">
        <Input
          value={draft.photoUrl}
          onChange={(event) => onChange("photoUrl", event.target.value)}
        />
      </DraftField>
      <DraftField label="Status Aktif">
        <select
          value={draft.isActive ? "true" : "false"}
          onChange={(event) => onChange("isActive", event.target.value === "true")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </DraftField>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-slate-700">Alamat</label>
        <textarea
          value={draft.address}
          onChange={(event) => onChange("address", event.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-slate-700">Catatan</label>
        <textarea
          value={draft.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

type EmployeesTableProps = {
  data: EmployeeRow[];
  options: EmployeeFormOptions;
};

export default function EmployeesTable({
  data,
  options,
}: EmployeesTableProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EmployeeRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<EmployeeRow | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(createEmptyDraft());
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [loginDraft, setLoginDraft] = useState<LoginDraft>({ email: "", password: "", confirmPassword: "" });
  const [existingLoginEmail, setExistingLoginEmail] = useState<string | null>(null);

  function handleDraftChange(
    field: keyof EmployeeDraft,
    value: string | boolean
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetCreateDialog() {
    setDraft(createEmptyDraft());
    setFormError(null);
    setCreateOpen(true);
  }

  async function submitCreate() {
    setPending(true);
    setFormError(null);
    try {
      const result = await createEmployee(toActionInput(draft));
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

  async function openEdit(row: EmployeeRow) {
    setLoadingEditId(row.id);
    setFormError(null);
    try {
      const [detail, loginInfo] = await Promise.all([
        getEmployeeById(row.id),
        getEmployeeLoginInfo(row.id),
      ]);
      if (!detail) {
        setFormError("Detail karyawan tidak ditemukan.");
        return;
      }
      setDraft(createDraftFromEmployee(detail));
      setExistingLoginEmail(loginInfo?.email ?? null);
      setLoginDraft({ email: loginInfo?.email ?? "", password: "", confirmPassword: "" });
      setEditingRow(row);
    } finally {
      setLoadingEditId(null);
    }
  }

  async function submitEdit() {
    if (!editingRow) return;
    setPending(true);
    setFormError(null);
    try {
      const result = await updateEmployee(editingRow.id, toActionInput(draft));
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }
      if (loginDraft.email) {
        if (loginDraft.password && loginDraft.password !== loginDraft.confirmPassword) {
          setFormError("Konfirmasi password tidak cocok.");
          return;
        }
        const loginResult = await upsertEmployeeLogin({
          employeeId: editingRow.id,
          email: loginDraft.email,
          password: loginDraft.password || undefined,
        });
        if (loginResult?.error) {
          setFormError(loginResult.error);
          return;
        }
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
      const result = await deleteEmployee(deletingRow.id);
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

  const columns: ColumnDef<EmployeeRow>[] = useMemo(
    () => [
      {
        header: "Karyawan",
        accessorKey: "fullName",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Link
              href={`/employees/${row.original.id}`}
              className="font-medium text-slate-900 hover:underline"
            >
              {row.original.fullName}
            </Link>
            <p className="text-xs text-slate-500">{row.original.employeeCode}</p>
          </div>
        ),
      },
      { header: "Divisi", accessorKey: "divisionName" },
      { header: "Jabatan", accessorKey: "positionName" },
      {
        header: "Kelompok",
        accessorKey: "employeeGroup",
        cell: ({ row }) => (
          <Badge variant={row.original.employeeGroup === "MANAGERIAL" ? "outline" : "secondary"}>
            {row.original.employeeGroup === "MANAGERIAL" ? "Managerial" : "Teamwork"}
          </Badge>
        ),
      },
      {
        header: "Status",
        accessorKey: "employmentStatus",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge variant={row.original.isActive ? "default" : "secondary"}>
              {EMPLOYMENT_STATUS_LABEL[row.original.employmentStatus]}
            </Badge>
            <p className="text-xs text-slate-500">
              Payroll: {PAYROLL_STATUS_LABEL[row.original.payrollStatus]}
            </p>
          </div>
        ),
      },
      {
        header: "Supervisor",
        accessorKey: "supervisorName",
        cell: ({ row }) => row.original.supervisorName || "-",
      },
      {
        header: "Aksi",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/employees/${row.original.id}`}>Detail</Link>
            </Button>
            {options.canManage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void openEdit(row.original)}
                  disabled={loadingEditId === row.original.id}
                >
                  {loadingEditId === row.original.id ? "Memuat..." : "Edit"}
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
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [loadingEditId, options.canManage]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-500">
          {options.canManage
            ? "HRD dan Super Admin dapat menambah, mengubah, dan menghapus profil."
            : "Role ini hanya memiliki akses baca untuk profil karyawan."}
        </div>
        <div className="flex gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/master/work-schedules">Kelola Jadwal Kerja</Link>
          </Button>
          {options.canManage ? (
            <Button type="button" onClick={resetCreateDialog}>
              Tambah Karyawan
            </Button>
          ) : null}
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchKey="fullName"
        searchPlaceholder="Cari nama karyawan..."
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tambah Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <EmployeeForm
              draft={draft}
              onChange={handleDraftChange}
              options={options}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Karyawan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <EmployeeForm
              draft={draft}
              onChange={handleDraftChange}
              options={options}
            />

            {options.canManage && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Akun Login Sistem</p>
                  {existingLoginEmail ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Akun aktif: <span className="font-medium text-slate-700">{existingLoginEmail}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Karyawan ini belum memiliki akun login.</p>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DraftField label="Email Login">
                    <Input
                      type="email"
                      value={loginDraft.email}
                      onChange={(e) => setLoginDraft((v) => ({ ...v, email: e.target.value }))}
                      placeholder="email@perusahaan.com"
                    />
                  </DraftField>
                  <DraftField label={existingLoginEmail ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}>
                    <Input
                      type="password"
                      value={loginDraft.password}
                      onChange={(e) => setLoginDraft((v) => ({ ...v, password: e.target.value }))}
                      placeholder="Min. 8 karakter"
                    />
                  </DraftField>
                  {loginDraft.password && (
                    <DraftField label="Konfirmasi Password">
                      <Input
                        type="password"
                        value={loginDraft.confirmPassword}
                        onChange={(e) => setLoginDraft((v) => ({ ...v, confirmPassword: e.target.value }))}
                        placeholder="Ulangi password"
                      />
                    </DraftField>
                  )}
                </div>
              </div>
            )}

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
            <AlertDialogTitle>Hapus Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              {`Data karyawan "${deletingRow?.fullName ?? ""}" akan dihapus beserta histori terkait.`}
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
