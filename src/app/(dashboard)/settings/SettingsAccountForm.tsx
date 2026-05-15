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
    canEditPersonalEnrichment: boolean;
    hobbies: Array<{ id: string; hobbyName: string; notes: string }>;
    educationHistories: Array<{
      id: string;
      institutionName: string;
      degree: string;
      major: string;
      startYear: string;
      endYear: string;
      notes: string;
    }>;
    competencies: Array<{
      id: string;
      competencyName: string;
      level: string;
      issuer: string;
      certifiedAt: string;
      attachmentUrl: string;
      notes: string;
    }>;
  };
};

export default function SettingsAccountForm({ initialData }: SettingsAccountFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hobbies, setHobbies] = useState(
    initialData.hobbies.length ? initialData.hobbies : [{ id: crypto.randomUUID(), hobbyName: "", notes: "" }]
  );
  const [educationHistories, setEducationHistories] = useState(
    initialData.educationHistories.length
      ? initialData.educationHistories
      : [{ id: crypto.randomUUID(), institutionName: "", degree: "", major: "", startYear: "", endYear: "", notes: "" }]
  );
  const [competencies, setCompetencies] = useState(
    initialData.competencies.length
      ? initialData.competencies
      : [{ id: crypto.randomUUID(), competencyName: "", level: "", issuer: "", certifiedAt: "", attachmentUrl: "", notes: "" }]
  );

  function handleSubmit(formData: FormData) {
    setMessage(null);
    formData.set("hobbies", JSON.stringify(hobbies.filter((item) => item.hobbyName.trim())));
    formData.set(
      "educationHistories",
      JSON.stringify(educationHistories.filter((item) => item.institutionName.trim()))
    );
    formData.set(
      "competencies",
      JSON.stringify(competencies.filter((item) => item.competencyName.trim()))
    );
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

      <input type="hidden" name="hobbies" value={JSON.stringify(hobbies.filter((item) => item.hobbyName.trim()))} />
      <input type="hidden" name="educationHistories" value={JSON.stringify(educationHistories.filter((item) => item.institutionName.trim()))} />
      <input type="hidden" name="competencies" value={JSON.stringify(competencies.filter((item) => item.competencyName.trim()))} />

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Hobi</p>
          {initialData.canEditPersonalEnrichment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setHobbies((prev) => [...prev, { id: crypto.randomUUID(), hobbyName: "", notes: "" }])
              }
            >
              Tambah Hobi
            </Button>
          ) : null}
        </div>
        {hobbies.map((hobby) => (
          <div key={hobby.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nama Hobi</Label>
              <Input
                value={hobby.hobbyName}
                disabled={!initialData.canEditPersonalEnrichment}
                onChange={(e) =>
                  setHobbies((prev) =>
                    prev.map((item) => (item.id === hobby.id ? { ...item, hobbyName: e.target.value } : item))
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input
                value={hobby.notes}
                disabled={!initialData.canEditPersonalEnrichment}
                onChange={(e) =>
                  setHobbies((prev) =>
                    prev.map((item) => (item.id === hobby.id ? { ...item, notes: e.target.value } : item))
                  )
                }
              />
            </div>
            {initialData.canEditPersonalEnrichment ? (
              <div className="md:col-span-2">
                <Button type="button" variant="destructive" size="sm" onClick={() => setHobbies((prev) => prev.filter((item) => item.id !== hobby.id))}>
                  Hapus
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Riwayat Pendidikan</p>
          {initialData.canEditPersonalEnrichment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setEducationHistories((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), institutionName: "", degree: "", major: "", startYear: "", endYear: "", notes: "" },
                ])
              }
            >
              Tambah Pendidikan
            </Button>
          ) : null}
        </div>
        {educationHistories.map((education) => (
          <div key={education.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Institusi</Label>
              <Input value={education.institutionName} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setEducationHistories((prev) => prev.map((item) => (item.id === education.id ? { ...item, institutionName: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5">
              <Label>Jenjang</Label>
              <Input value={education.degree} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setEducationHistories((prev) => prev.map((item) => (item.id === education.id ? { ...item, degree: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5">
              <Label>Jurusan</Label>
              <Input value={education.major} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setEducationHistories((prev) => prev.map((item) => (item.id === education.id ? { ...item, major: e.target.value } : item)))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tahun Masuk</Label>
                <Input value={education.startYear} maxLength={4} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setEducationHistories((prev) => prev.map((item) => (item.id === education.id ? { ...item, startYear: e.target.value } : item)))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tahun Lulus</Label>
                <Input value={education.endYear} maxLength={4} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setEducationHistories((prev) => prev.map((item) => (item.id === education.id ? { ...item, endYear: e.target.value } : item)))} />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Catatan</Label>
              <Input value={education.notes} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setEducationHistories((prev) => prev.map((item) => (item.id === education.id ? { ...item, notes: e.target.value } : item)))} />
            </div>
            {initialData.canEditPersonalEnrichment ? (
              <div className="md:col-span-2">
                <Button type="button" variant="destructive" size="sm" onClick={() => setEducationHistories((prev) => prev.filter((item) => item.id !== education.id))}>
                  Hapus
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Kompetensi</p>
          {initialData.canEditPersonalEnrichment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCompetencies((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), competencyName: "", level: "", issuer: "", certifiedAt: "", attachmentUrl: "", notes: "" },
                ])
              }
            >
              Tambah Kompetensi
            </Button>
          ) : null}
        </div>
        {competencies.map((competency) => (
          <div key={competency.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nama Kompetensi</Label>
              <Input value={competency.competencyName} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setCompetencies((prev) => prev.map((item) => (item.id === competency.id ? { ...item, competencyName: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Input value={competency.level} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setCompetencies((prev) => prev.map((item) => (item.id === competency.id ? { ...item, level: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5">
              <Label>Penerbit</Label>
              <Input value={competency.issuer} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setCompetencies((prev) => prev.map((item) => (item.id === competency.id ? { ...item, issuer: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Sertifikat</Label>
              <Input type="date" value={competency.certifiedAt} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setCompetencies((prev) => prev.map((item) => (item.id === competency.id ? { ...item, certifiedAt: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Link Dokumen Pendukung</Label>
              <Input value={competency.attachmentUrl} placeholder="https://..." disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setCompetencies((prev) => prev.map((item) => (item.id === competency.id ? { ...item, attachmentUrl: e.target.value } : item)))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Catatan</Label>
              <Input value={competency.notes} disabled={!initialData.canEditPersonalEnrichment} onChange={(e) => setCompetencies((prev) => prev.map((item) => (item.id === competency.id ? { ...item, notes: e.target.value } : item)))} />
            </div>
            {initialData.canEditPersonalEnrichment ? (
              <div className="md:col-span-2">
                <Button type="button" variant="destructive" size="sm" onClick={() => setCompetencies((prev) => prev.filter((item) => item.id !== competency.id))}>
                  Hapus
                </Button>
              </div>
            ) : null}
          </div>
        ))}
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
