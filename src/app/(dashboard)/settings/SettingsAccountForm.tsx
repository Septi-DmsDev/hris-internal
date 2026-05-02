"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyAccountSettings } from "@/server/actions/settings";

type SettingsAccountFormProps = {
  initialData: {
    userEmail: string;
    username: string;
    phoneNumber: string;
    employeeCode: string | null;
    fullName: string | null;
  };
};

export default function SettingsAccountForm({ initialData }: SettingsAccountFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMyAccountSettings(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      if (result?.success) {
        setMessage({ type: "success", text: result.success });
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nama Lengkap</Label>
          <Input id="fullName" value={initialData.fullName ?? "-"} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employeeCode">Kode Karyawan</Label>
          <Input id="employeeCode" value={initialData.employeeCode ?? "-"} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" defaultValue={initialData.username} required maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Nomor HP</Label>
          <Input id="phoneNumber" name="phoneNumber" defaultValue={initialData.phoneNumber} maxLength={30} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="email">Email Login</Label>
          <Input id="email" name="email" type="email" defaultValue={initialData.userEmail} required />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Ubah Password</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input id="newPassword" name="newPassword" type="password" placeholder="Minimal 8 karakter" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Ulangi password baru" />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
