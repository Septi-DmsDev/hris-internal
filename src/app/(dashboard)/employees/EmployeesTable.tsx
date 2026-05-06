"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createEmployee, deleteEmployee, getEmployeeById, importEmployeesFromXlsx, updateEmployee } from "@/server/actions/employees";
import { getEmployeeLoginInfo, upsertEmployeeLogin } from "@/server/actions/users";
import { Plus, Upload } from "lucide-react";

type Option = { id: string; name: string };
type PositionOption = Option & { employeeGroup: "MANAGERIAL" | "TEAMWORK" };
type ScheduleOption = Option & { code: string };

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
  branchName: string;
  phoneNumber: string;
  divisionName: string;
  positionName: string;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus: "TRAINING" | "REGULER" | "DIALIHKAN_TRAINING" | "TIDAK_LOLOS" | "NONAKTIF" | "RESIGN";
  payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
  supervisorName: string;
  isActive: boolean;
  startDate: string;
};

type EmployeeDraft = {
  employeeCode: string;
  fullName: string;
  branchId: string;
  birthPlace: string;
  birthDate: string;
  gender: string;
  religion: string;
  maritalStatus: string;
  address: string;
  phoneNumber: string;
  startDate: string;
  trainingGraduationDate: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  divisionId: string;
  positionId: string;
  gradeId: string;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus: "TRAINING" | "REGULER" | "DIALIHKAN_TRAINING" | "TIDAK_LOLOS" | "NONAKTIF" | "RESIGN";
  payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
  supervisorEmployeeId: string;
  scheduleId: string;
  effectiveDate: string;
  isActive: boolean;
};

type EmployeeDetailResult = Awaited<ReturnType<typeof getEmployeeById>>;

function toLoginEmail(username: string, fallbackEmail: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  if (normalized.length > 0) return `${normalized}@hris.internal`;
  return fallbackEmail.trim();
}

function createEmptyDraft(options: EmployeeFormOptions): EmployeeDraft {
  const today = new Date().toISOString().slice(0, 10);
  const defaultPosition = options.positions.find((position) => position.employeeGroup === "TEAMWORK") ?? options.positions[0];
  const defaultSupervisor = options.supervisors[0];

  return {
    employeeCode: "",
    fullName: "",
    branchId: options.branches[0]?.id ?? "",
    birthPlace: "",
    birthDate: "",
    gender: "",
    religion: "",
    maritalStatus: "",
    address: "",
    phoneNumber: "",
    startDate: today,
    trainingGraduationDate: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    divisionId: options.divisions[0]?.id ?? "",
    positionId: defaultPosition?.id ?? "",
    gradeId: options.grades[0]?.id ?? "",
    employeeGroup: defaultPosition?.employeeGroup ?? "TEAMWORK",
    employmentStatus: "TRAINING",
    payrollStatus: "TRAINING",
    supervisorEmployeeId: defaultSupervisor?.id ?? "",
    scheduleId: "",
    effectiveDate: today,
    isActive: true,
  };
}

function createDraftFromEmployee(detail: NonNullable<EmployeeDetailResult>, loginEmail: string | null): EmployeeDraft {
  const { employee, currentScheduleAssignment } = detail;
  const today = new Date().toISOString().slice(0, 10);

  return {
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    branchId: employee.branchId,
    birthPlace: employee.birthPlace ?? "",
    birthDate: employee.birthDate ? new Date(employee.birthDate).toISOString().slice(0, 10) : "",
    gender: employee.gender ?? "",
    religion: employee.religion ?? "",
    maritalStatus: employee.maritalStatus ?? "",
    address: employee.address ?? "",
    phoneNumber: employee.phoneNumber ?? "",
    startDate: new Date(employee.startDate).toISOString().slice(0, 10),
    trainingGraduationDate: employee.trainingGraduationDate ? new Date(employee.trainingGraduationDate).toISOString().slice(0, 10) : "",
    username: loginEmail ? loginEmail.split("@")[0] : "",
    email: loginEmail ?? "",
    password: "",
    confirmPassword: "",
    divisionId: employee.divisionId,
    positionId: employee.positionId,
    gradeId: employee.gradeId,
    employeeGroup: employee.employeeGroup,
    employmentStatus: employee.employmentStatus,
    payrollStatus: employee.payrollStatus,
    supervisorEmployeeId: employee.supervisorEmployeeId ?? "",
    scheduleId: currentScheduleAssignment?.scheduleId ?? "",
    effectiveDate: today,
    isActive: employee.isActive,
  };
}

function toActionInput(draft: EmployeeDraft) {
  return {
    employeeCode: draft.employeeCode,
    fullName: draft.fullName,
    birthPlace: draft.birthPlace,
    birthDate: draft.birthDate,
    gender: draft.gender,
    religion: draft.religion,
    maritalStatus: draft.maritalStatus,
    phoneNumber: draft.phoneNumber,
    address: draft.address,
    startDate: draft.startDate,
    branchId: draft.branchId,
    divisionId: draft.divisionId,
    positionId: draft.positionId,
    gradeId: draft.gradeId,
    employeeGroup: draft.employeeGroup,
    employmentStatus: draft.employmentStatus,
    payrollStatus: draft.payrollStatus,
    supervisorEmployeeId: draft.supervisorEmployeeId,
    scheduleId: draft.scheduleId,
    trainingGraduationDate: draft.trainingGraduationDate,
    effectiveDate: draft.effectiveDate,
    isActive: draft.isActive,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-700">{label}</label>{children}</div>;
}

function EmployeePersonalForm({ draft, onChange, options }: { draft: EmployeeDraft; onChange: (field: keyof EmployeeDraft, value: string) => void; options: EmployeeFormOptions }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="CABANG"><select value={draft.branchId} onChange={(e) => onChange("branchId", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required><option value="">Pilih cabang</option>{options.branches.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
      <Field label="NAMA"><Input value={draft.fullName} onChange={(e) => onChange("fullName", e.target.value)} required /></Field>
      <Field label="Username"><Input value={draft.username} onChange={(e) => onChange("username", e.target.value)} /></Field>
      <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => onChange("email", e.target.value)} /></Field>
      <Field label="Password"><Input type="password" value={draft.password} onChange={(e) => onChange("password", e.target.value)} /></Field>
      <Field label="Konfirmasi Password"><Input type="password" value={draft.confirmPassword} onChange={(e) => onChange("confirmPassword", e.target.value)} /></Field>
      <Field label="TEMPAT LAHIR"><Input value={draft.birthPlace} onChange={(e) => onChange("birthPlace", e.target.value)} /></Field>
      <Field label="TGL LAHIR"><Input type="date" value={draft.birthDate} onChange={(e) => onChange("birthDate", e.target.value)} /></Field>
      <Field label="JENIS KELAMIN"><Input value={draft.gender} onChange={(e) => onChange("gender", e.target.value)} /></Field>
      <Field label="AGAMA"><Input value={draft.religion} onChange={(e) => onChange("religion", e.target.value)} /></Field>
      <Field label="STATUS"><Input value={draft.maritalStatus} onChange={(e) => onChange("maritalStatus", e.target.value)} /></Field>
      <Field label="NO TELP"><Input value={draft.phoneNumber} onChange={(e) => onChange("phoneNumber", e.target.value)} /></Field>
      <Field label="MASUK KERJA"><Input type="date" value={draft.startDate} onChange={(e) => onChange("startDate", e.target.value)} /></Field>
      <Field label="LOLOS TRAINING"><Input type="date" value={draft.trainingGraduationDate} onChange={(e) => onChange("trainingGraduationDate", e.target.value)} /></Field>
      <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium text-slate-700">ALAMAT</label><textarea value={draft.address} onChange={(e) => onChange("address", e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
    </div>
  );
}

export default function EmployeesTable({ data, options }: { data: EmployeeRow[]; options: EmployeeFormOptions }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EmployeeRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<EmployeeRow | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(createEmptyDraft(options));
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  function onDraftChange(field: keyof EmployeeDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setDraft(createEmptyDraft(options));
    setFormError(null);
    setCreateOpen(true);
  }

  async function submitCreate() {
    setPending(true);
    setFormError(null);
    try {
      if (draft.password && draft.password !== draft.confirmPassword) {
        setFormError("Konfirmasi password tidak cocok.");
        return;
      }

      const result = await createEmployee(toActionInput(draft));
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }

      const email = toLoginEmail(draft.username, draft.email);
      if (email && draft.password && result && "employeeId" in result) {
        const loginResult = await upsertEmployeeLogin({ employeeId: result.employeeId, email, password: draft.password });
        if (loginResult?.error) {
          setFormError(`Data karyawan tersimpan, tetapi akun login gagal: ${loginResult.error}`);
          return;
        }
      }

      setCreateOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function openEdit(row: EmployeeRow) {
    setPending(true);
    setFormError(null);
    try {
      const [detail, loginInfo] = await Promise.all([getEmployeeById(row.id), getEmployeeLoginInfo(row.id)]);
      if (!detail) {
        setFormError("Detail karyawan tidak ditemukan.");
        return;
      }
      setDraft(createDraftFromEmployee(detail, loginInfo?.email ?? null));
      setEditingRow(row);
    } finally {
      setPending(false);
    }
  }

  async function submitEdit() {
    if (!editingRow) return;
    setPending(true);
    setFormError(null);

    try {
      if (draft.password && draft.password !== draft.confirmPassword) {
        setFormError("Konfirmasi password tidak cocok.");
        return;
      }

      const result = await updateEmployee(editingRow.id, toActionInput(draft));
      if (result && "error" in result) {
        setFormError(result.error);
        return;
      }

      const loginEmail = toLoginEmail(draft.username, draft.email);
      if (loginEmail) {
        const loginResult = await upsertEmployeeLogin({ employeeId: editingRow.id, email: loginEmail, password: draft.password || undefined });
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

  async function submitImport() {
    setPending(true);
    setFormError(null);
    try {
      if (!importFile) {
        setFormError("Pilih file Excel terlebih dahulu.");
        return;
      }
      const formData = new FormData();
      formData.append("file", importFile);
      const result = await importEmployeesFromXlsx(formData);
      if (result && "error" in result) {
        setFormError(result.error ?? "Import gagal.");
        return;
      }
      setImportOpen(false);
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

  const columns: ColumnDef<EmployeeRow>[] = useMemo(() => [
    { header: "CABANG", accessorKey: "branchName" },
    {
      header: "NAMA",
      accessorKey: "fullName",
      cell: ({ row }) => <Link href={`/employees/${row.original.id}`} className="font-medium text-slate-900 hover:underline">{row.original.fullName}</Link>,
    },
    { header: "NO TELP", accessorKey: "phoneNumber" },
    { header: "MASUK KERJA", accessorKey: "startDate" },
    {
      header: "STATUS",
      accessorKey: "employmentStatus",
      cell: ({ row }) => {
        const status = row.original.employmentStatus;
        const statusClass =
          status === "REGULER"
            ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
            : status === "TRAINING"
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : row.original.isActive
                ? ""
                : "bg-slate-100 text-slate-600 hover:bg-slate-100";

        return (
          <Badge variant="secondary" className={statusClass}>
            {status}
          </Badge>
        );
      },
    },
    { header: "Aksi", id: "actions", cell: ({ row }) => <div className="flex gap-2"><Button asChild variant="outline" size="sm"><Link href={`/employees/${row.original.id}`}>Detail</Link></Button>{options.canManage ? <><Button variant="outline" size="sm" onClick={() => void openEdit(row.original)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => setDeletingRow(row.original)}>Hapus</Button></> : null}</div> },
  ], [options.canManage]);

  return (
    <div className="space-y-3">
      <DataTable data={data} columns={columns} searchKey="fullName" searchPlaceholder="Cari nama karyawan..." toolbarSlot={options.canManage ? <div className="flex gap-2"><Button asChild type="button" variant="outline" size="sm"><a href="/employees/export.xlsx"><Upload size={14} className="mr-1.5" />Export Excel</a></Button><Button type="button" variant="outline" size="sm" onClick={() => { setImportOpen(true); setFormError(null); }}><Upload size={14} className="mr-1.5" />Import Excel</Button><Button type="button" size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={openCreate}><Plus size={14} className="mr-1.5" />Tambah Karyawan</Button></div> : undefined} />

      <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent><DialogHeader><DialogTitle>Import Karyawan</DialogTitle></DialogHeader><div className="space-y-3"><p className="text-sm text-slate-600">Format: CABANG, NAMA, Username, Password, TEMPAT LAHIR, TGL LAHIR, JENIS KELAMIN, AGAMA, STATUS, ALAMAT, NO TELP, EMAIL, MASUK KERJA, LOLOS TRAINING.</p><Input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />{formError ? <p className="text-sm text-red-600">{formError}</p> : null}<DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button><Button onClick={() => void submitImport()} disabled={pending}>{pending ? "Mengimpor..." : "Import"}</Button></DialogFooter></div></DialogContent></Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Tambah Karyawan</DialogTitle></DialogHeader><EmployeePersonalForm draft={draft} onChange={onDraftChange} options={options} />{formError ? <p className="text-sm text-red-600">{formError}</p> : null}<DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button><Button onClick={() => void submitCreate()} disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={editingRow !== null} onOpenChange={(open) => { if (!open) setEditingRow(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Edit Karyawan</DialogTitle></DialogHeader><EmployeePersonalForm draft={draft} onChange={onDraftChange} options={options} />{formError ? <p className="text-sm text-red-600">{formError}</p> : null}<DialogFooter><Button variant="outline" onClick={() => setEditingRow(null)}>Batal</Button><Button onClick={() => void submitEdit()} disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deletingRow !== null} onOpenChange={(open) => { if (!open) setDeletingRow(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Karyawan</AlertDialogTitle><AlertDialogDescription>{`Data karyawan \"${deletingRow?.fullName ?? ""}\" akan dinonaktifkan.`}</AlertDialogDescription></AlertDialogHeader>{formError ? <p className="text-sm text-red-600">{formError}</p> : null}<AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); void handleDelete(); }}>{pending ? "Menghapus..." : "Hapus"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
