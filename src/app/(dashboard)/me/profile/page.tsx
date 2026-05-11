import { format } from "date-fns";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { getMyProfile } from "@/server/actions/me";
import { resolveEmployeeGroupLabel } from "@/lib/employee-groups";
import MyPersonalProfileForm from "./MyPersonalProfileForm";

const EMPLOYMENT_STATUS_LABEL: Record<string, string> = {
  TRAINING: "Training",
  REGULER: "Reguler",
  DIALIHKAN_TRAINING: "Dialihkan Training",
  TIDAK_LOLOS: "Tidak Lolos",
  NONAKTIF: "Nonaktif",
  RESIGN: "Resign",
};

const PAYROLL_STATUS_LABEL: Record<string, string> = {
  TRAINING: "Training",
  REGULER: "Reguler",
  FINAL_PAYROLL: "Final Payroll",
  NONAKTIF: "Nonaktif",
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return format(value, "yyyy-MM-dd");
}

function formatScheduleLabel(schedule: {
  scheduleName: string | null;
  scheduleCode: string | null;
} | null) {
  if (!schedule) return "Belum ditetapkan";

  if (schedule.scheduleName && schedule.scheduleCode) {
    return `${schedule.scheduleName} (${schedule.scheduleCode})`;
  }

  return schedule.scheduleName ?? schedule.scheduleCode ?? "Belum ditetapkan";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function CompactHistoryTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((cells, index) => (
              <tr key={index} className="border-t border-slate-100">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-slate-400">
                  Belum ada histori.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function MyProfilePage() {
  const result = await getMyProfile();

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  if (!result.employee) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
          <p className="mt-1 text-sm text-slate-500">Detail profil dan data kepegawaian pribadi.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {result.emptyReason ?? "Data personal belum tersedia."}
        </div>
      </div>
    );
  }

  const { employee, activeSchedule, histories } = result;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={employee.isActive ? "default" : "secondary"}>
            {employee.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
          <Badge variant="outline">{resolveEmployeeGroupLabel(employee.employeeGroup)}</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{employee.fullName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {employee.employeeCode} | {employee.positionName ?? "-"} | {employee.divisionName ?? "-"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Data Pribadi</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="NIK" value={employee.nik ?? "-"} />
          <DetailItem label="Nama Panggilan" value={employee.nickname ?? "-"} />
          <DetailItem label="Tempat Lahir" value={employee.birthPlace ?? "-"} />
          <DetailItem label="Tanggal Lahir" value={formatDate(employee.birthDate)} />
          <DetailItem label="Jenis Kelamin" value={employee.gender ?? "-"} />
          <DetailItem label="Agama" value={employee.religion ?? "-"} />
          <DetailItem label="Status" value={employee.maritalStatus ?? "-"} />
          <DetailItem label="Nomor HP" value={employee.phoneNumber ?? "-"} />
          <DetailItem label="Email Login" value={result.userEmail || "-"} />
          <DetailItem label="Alamat" value={employee.address ?? "-"} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Lengkapi / Ubah Data Diri</h2>
        <MyPersonalProfileForm
          initialData={{
            nik: employee.nik ?? "",
            nickname: employee.nickname ?? "",
            birthPlace: employee.birthPlace ?? "",
            birthDate: employee.birthDate ? formatDate(employee.birthDate) : "",
            gender: employee.gender ?? "",
            religion: employee.religion ?? "",
            maritalStatus: employee.maritalStatus ?? "",
            phoneNumber: employee.phoneNumber ?? "",
            address: employee.address ?? "",
            photoUrl: employee.photoUrl ?? "",
            nikLocked: Boolean(employee.nik),
            profileCompletionRequired: result.profileCompletionRequired,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Data Kepegawaian</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Cabang" value={employee.branchName ?? "-"} />
          <DetailItem label="Divisi" value={employee.divisionName ?? "-"} />
          <DetailItem label="Jabatan" value={employee.positionName ?? "-"} />
          <DetailItem label="Grade" value={employee.gradeName ?? "-"} />
          <DetailItem label="Status Kerja" value={EMPLOYMENT_STATUS_LABEL[employee.employmentStatus] ?? employee.employmentStatus} />
          <DetailItem label="Status Payroll" value={PAYROLL_STATUS_LABEL[employee.payrollStatus] ?? employee.payrollStatus} />
          <DetailItem label="Supervisor" value={employee.supervisorName ?? "Belum ditetapkan"} />
          <DetailItem label="Jadwal Aktif" value={formatScheduleLabel(activeSchedule)} />
          <DetailItem label="Tanggal Masuk" value={formatDate(employee.startDate)} />
          <DetailItem label="Lulus Training" value={formatDate(employee.trainingGraduationDate)} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <CompactHistoryTable
          title="Histori Divisi"
          headers={["Tanggal", "Perubahan", "Catatan"]}
          rows={histories.divisions.map((row) => [
            formatDate(row.effectiveDate),
            `${row.previousLabel ?? "-"} -> ${row.nextLabel ?? "-"}`,
            row.notes ?? "-",
          ])}
        />
        <CompactHistoryTable
          title="Histori Jabatan"
          headers={["Tanggal", "Perubahan", "Catatan"]}
          rows={histories.positions.map((row) => [
            formatDate(row.effectiveDate),
            `${row.previousLabel ?? "-"} -> ${row.nextLabel ?? "-"}`,
            row.notes ?? "-",
          ])}
        />
        <CompactHistoryTable
          title="Histori Grade"
          headers={["Tanggal", "Perubahan", "Catatan"]}
          rows={histories.grades.map((row) => [
            formatDate(row.effectiveDate),
            `${row.previousLabel ?? "-"} -> ${row.nextLabel ?? "-"}`,
            row.notes ?? "-",
          ])}
        />
        <CompactHistoryTable
          title="Histori Supervisor"
          headers={["Tanggal", "Perubahan", "Catatan"]}
          rows={histories.supervisors.map((row) => [
            formatDate(row.effectiveDate),
            `${row.previousLabel ?? "-"} -> ${row.nextLabel ?? "-"}`,
            row.notes ?? "-",
          ])}
        />
      </div>

      <CompactHistoryTable
        title="Histori Status"
        headers={["Tanggal", "Status Kerja", "Status Payroll", "Catatan"]}
        rows={histories.statuses.map((row) => [
          formatDate(row.effectiveDate),
          `${row.previousEmploymentStatus ?? "-"} -> ${row.newEmploymentStatus}`,
          `${row.previousPayrollStatus ?? "-"} -> ${row.newPayrollStatus}`,
          row.notes ?? "-",
        ])}
      />
    </div>
  );
}
