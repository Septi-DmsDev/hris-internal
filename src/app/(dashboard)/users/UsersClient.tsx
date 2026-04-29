"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { UserPlus, Pencil, Trash2, Mail, ShieldCheck, Users, Building2 } from "lucide-react";
import { inviteUser, updateUser, removeUserAccess } from "@/server/actions/users";
import type { UserRow, UserFormOptions } from "@/server/actions/users";
import type { UserRole } from "@/types";

const ROLE_CONFIG: Record<UserRole, { label: string; badgeCls: string; dot: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    badgeCls: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  HRD: {
    label: "HRD",
    badgeCls: "bg-violet-50 text-violet-700 border border-violet-200",
    dot: "bg-violet-400",
  },
  KABAG: {
    label: "Kepala Bagian",
    badgeCls: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-400",
  },
  SPV: {
    label: "Supervisor",
    badgeCls: "bg-sky-50 text-sky-700 border border-sky-200",
    dot: "bg-sky-400",
  },
  MANAGERIAL: {
    label: "Managerial",
    badgeCls: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-400",
  },
  FINANCE: {
    label: "Finance",
    badgeCls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-400",
  },
  TEAMWORK: {
    label: "Team Work",
    badgeCls: "bg-orange-50 text-orange-700 border border-orange-200",
    dot: "bg-orange-400",
  },
  PAYROLL_VIEWER: {
    label: "Payroll Viewer",
    badgeCls: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
};

const ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN", "HRD", "KABAG", "SPV",
  "MANAGERIAL", "FINANCE", "TEAMWORK", "PAYROLL_VIEWER",
];

const DIV_SCOPED: UserRole[] = ["SPV", "KABAG"];

const STATS_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badgeCls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ email }: { email: string }) {
  const colors = [
    "from-teal-500 to-teal-600",
    "from-violet-500 to-violet-600",
    "from-blue-500 to-blue-600",
    "from-amber-500 to-amber-600",
    "from-emerald-500 to-emerald-600",
    "from-sky-500 to-sky-600",
  ];
  const colorIdx = email.charCodeAt(0) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center shrink-0 shadow-sm`}>
      <span className="text-white text-sm font-bold">{email.charAt(0).toUpperCase()}</span>
    </div>
  );
}

const selectCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50";

type FormProps = {
  options: UserFormOptions;
  defaultRole?: UserRole;
  defaultEmployeeId?: string | null;
  defaultDivisionIds?: string[];
  userRoleId?: string;
  isInvite?: boolean;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
};

function UserForm({
  options,
  defaultRole,
  defaultEmployeeId,
  defaultDivisionIds = [],
  userRoleId,
  isInvite,
  onSubmit,
  onCancel,
  pending,
  error,
}: FormProps) {
  const [role, setRole] = useState<UserRole>(defaultRole ?? "TEAMWORK");
  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId ?? "");
  const [divisionIds, setDivisionIds] = useState<string[]>(defaultDivisionIds);

  const needsDivision = DIV_SCOPED.includes(role);
  const isKabag = role === "KABAG";

  function toggleDivision(id: string) {
    if (isKabag) {
      setDivisionIds((prev) =>
        prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
      );
    } else {
      setDivisionIds([id]);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);
    fd.set("employeeId", employeeId);
    fd.delete("divisionIds");
    for (const d of divisionIds) fd.append("divisionIds", d);
    await onSubmit(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {userRoleId && <input type="hidden" name="userRoleId" value={userRoleId} />}

      {isInvite && (
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Mail size={13} className="text-slate-400" />
            Alamat Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nama@perusahaan.com"
            required
            className="border-slate-200 focus:ring-teal-500 focus:border-teal-500"
          />
          <p className="text-xs text-slate-400">Link undangan akan dikirim ke email ini.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-slate-400" />
          Role Sistem
        </Label>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value as UserRole); setDivisionIds([]); }}
          className={selectCls}
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Users size={13} className="text-slate-400" />
          Link ke Karyawan
          <span className="text-slate-400 font-normal">(opsional)</span>
        </Label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className={selectCls}
        >
          <option value="">Tidak dihubungkan</option>
          {options.employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.fullName}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          Wajib untuk semua role kecuali SUPER_ADMIN agar bisa akses halaman Saya.
        </p>
      </div>

      {needsDivision && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Building2 size={13} className="text-slate-400" />
            Scope Divisi
            {isKabag && (
              <span className="text-slate-400 font-normal">(bisa pilih lebih dari satu)</span>
            )}
          </Label>
          <div className="border border-slate-200 rounded-lg p-3 space-y-1 max-h-44 overflow-y-auto bg-slate-50">
            {options.divisions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Belum ada divisi aktif</p>
            ) : (
              options.divisions.map((div) => {
                const selected = divisionIds.includes(div.id);
                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => toggleDivision(div.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5 ${
                      selected
                        ? "bg-teal-500/10 text-teal-700 font-medium"
                        : "hover:bg-white text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        selected ? "bg-teal-500 border-teal-500" : "border-slate-300"
                      }`}
                    >
                      {selected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {div.name}
                  </button>
                );
              })
            )}
          </div>
          {!isKabag && divisionIds.length === 0 && (
            <p className="text-xs text-amber-600">SPV wajib memilih 1 divisi.</p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button
          type="submit"
          disabled={pending || (needsDivision && !isKabag && divisionIds.length === 0)}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {pending
            ? "Memproses..."
            : isInvite
            ? "Kirim Undangan"
            : "Simpan Perubahan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type Props = {
  data: UserRow[];
  options: UserFormOptions;
};

export default function UsersClient({ data, options }: Props) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<UserRow | null>(null);
  const [removingRow, setRemovingRow] = useState<UserRow | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleInvite(fd: FormData) {
    setPending(true);
    setFormError(null);
    try {
      const result = await inviteUser(fd);
      if (result?.error) { setFormError(result.error); return; }
      setInviteOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleUpdate(fd: FormData) {
    setPending(true);
    setFormError(null);
    try {
      const result = await updateUser(fd);
      if (result?.error) { setFormError(result.error); return; }
      setEditingRow(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!removingRow) return;
    setPending(true);
    try {
      await removeUserAccess(removingRow.userRoleId);
      setRemovingRow(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        id: "user",
        header: "Pengguna",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar email={u.email} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate max-w-[220px]">
                  {u.email}
                </p>
                {u.employeeName ? (
                  <p className="text-xs text-slate-400 truncate">{u.employeeName}</p>
                ) : (
                  <p className="text-xs text-slate-300 italic">Tidak terhubung ke karyawan</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
      {
        id: "divisions",
        header: "Scope Divisi",
        cell: ({ row }) => {
          const names = row.original.divisionNames;
          if (names.length === 0) return <span className="text-xs text-slate-300">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {names.map((n) => (
                <span
                  key={n}
                  className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium"
                >
                  {n}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-400 hover:text-teal-600 hover:bg-teal-50"
              onClick={() => {
                setEditingRow(row.original);
                setFormError(null);
              }}
            >
              <Pencil size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => setRemovingRow(row.original)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS_ROLES.map((r) => {
          const count = data.filter((u) => u.role === r).length;
          const cfg = ROLE_CONFIG[r];
          return (
            <div
              key={r}
              className={`rounded-lg border px-4 py-3 flex items-center gap-3 bg-white ${cfg.badgeCls}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
              <div>
                <p className="text-xl font-bold text-slate-800 leading-none">{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Total{" "}
          <span className="font-semibold text-slate-700">{data.length}</span>{" "}
          pengguna terdaftar
        </p>
        <Button
          onClick={() => {
            setInviteOpen(true);
            setFormError(null);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          size="sm"
        >
          <UserPlus size={15} />
          Undang Pengguna
        </Button>
      </div>

      <DataTable columns={columns} data={data} />

      {/* Invite dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          setFormError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <UserPlus size={18} className="text-teal-600" />
              Undang Pengguna Baru
            </DialogTitle>
          </DialogHeader>
          <UserForm
            options={options}
            isInvite
            onSubmit={handleInvite}
            onCancel={() => setInviteOpen(false)}
            pending={pending}
            error={formError}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editingRow}
        onOpenChange={(o) => {
          if (!o) setEditingRow(null);
          setFormError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Pencil size={16} className="text-teal-600" />
              Edit Akses Pengguna
            </DialogTitle>
            {editingRow && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5 pt-1">
                <Mail size={12} />
                {editingRow.email}
              </p>
            )}
          </DialogHeader>
          {editingRow && (
            <UserForm
              options={options}
              userRoleId={editingRow.userRoleId}
              defaultRole={editingRow.role}
              defaultEmployeeId={editingRow.employeeId}
              defaultDivisionIds={editingRow.divisionIds}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRow(null)}
              pending={pending}
              error={formError}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removingRow}
        onOpenChange={(o) => {
          if (!o) setRemovingRow(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akses Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Akses sistem untuk{" "}
              <span className="font-semibold text-slate-700">{removingRow?.email}</span>{" "}
              akan dicabut. Akun Supabase tidak dihapus — pengguna hanya tidak bisa
              login ke dashboard lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {pending ? "Menghapus..." : "Hapus Akses"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
