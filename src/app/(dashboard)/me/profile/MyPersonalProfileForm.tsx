"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyPersonalProfile } from "@/server/actions/me";

type MyPersonalProfileFormProps = {
  initialData: {
    nik: string;
    nickname: string;
    birthPlace: string;
    birthDate: string;
    gender: string;
    religion: string;
    maritalStatus: string;
    phoneNumber: string;
    address: string;
    photoUrl: string;
    nikLocked: boolean;
    profileCompletionRequired: boolean;
  };
};

export default function MyPersonalProfileForm({ initialData }: MyPersonalProfileFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateMyPersonalProfile(formData);
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
    <form action={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      {initialData.profileCompletionRequired ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Lengkapi data diri terlebih dahulu untuk membuka akses ke seluruh sistem.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nik">NIK</Label>
          <Input id="nik" name="nik" defaultValue={initialData.nik} maxLength={50} required disabled={initialData.nikLocked} />
          {initialData.nikLocked ? (
            <p className="text-xs text-slate-500">NIK sudah terkunci. Jika salah, hubungi HRD untuk perubahan.</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nickname">Nama Panggilan</Label>
          <Input id="nickname" name="nickname" defaultValue={initialData.nickname} maxLength={100} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthPlace">Tempat Lahir</Label>
          <Input id="birthPlace" name="birthPlace" defaultValue={initialData.birthPlace} maxLength={100} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Tanggal Lahir</Label>
          <Input id="birthDate" name="birthDate" type="date" defaultValue={initialData.birthDate} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gender">Jenis Kelamin</Label>
          <Input id="gender" name="gender" defaultValue={initialData.gender} maxLength={20} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="religion">Agama</Label>
          <Input id="religion" name="religion" defaultValue={initialData.religion} maxLength={50} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maritalStatus">Status</Label>
          <Input id="maritalStatus" name="maritalStatus" defaultValue={initialData.maritalStatus} maxLength={50} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Nomor HP</Label>
          <Input id="phoneNumber" name="phoneNumber" defaultValue={initialData.phoneNumber} maxLength={30} required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="photoUrl">URL Foto Profil</Label>
          <Input id="photoUrl" name="photoUrl" type="url" defaultValue={initialData.photoUrl} required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="address">Alamat</Label>
          <textarea
            id="address"
            name="address"
            defaultValue={initialData.address}
            required
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Profil"}
        </Button>
      </div>
    </form>
  );
}
