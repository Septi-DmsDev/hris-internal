import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyDashboard } from "@/server/actions/me";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HRD: "HRD",
  KABAG: "Kabag",
  FINANCE: "Finance",
  SPV: "Supervisor",
  TEAMWORK: "Team Work",
  MANAGERIAL: "Managerial",
  PAYROLL_VIEWER: "Payroll Viewer",
};

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
  if (!schedule) return "Belum ada";

  if (schedule.scheduleName && schedule.scheduleCode) {
    return `${schedule.scheduleName} (${schedule.scheduleCode})`;
  }

  return schedule.scheduleName ?? schedule.scheduleCode ?? "Belum ada";
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default async function MePage() {
  const result = await getMyDashboard();

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  if (!result.employee) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saya</h1>
          <p className="mt-1 text-sm text-slate-500">Area personal untuk ringkasan kerja dan profil Anda.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {result.emptyReason ?? "Data personal belum tersedia."}
        </div>
      </div>
    );
  }

  const {
    employee,
    activeSchedule,
    quickActions,
    latestTicket,
    latestReview,
    incidentSummary,
    latestPerformance,
    teamworkActivitySummary,
    latestPayroll,
  } = result;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={employee.isActive ? "default" : "secondary"}>
              {employee.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
            <Badge variant="outline">{employee.employeeGroup}</Badge>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{employee.fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {employee.employeeCode} | {employee.positionName ?? "-"} | {employee.divisionName ?? "-"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/me/profile">Lihat Profil Lengkap</Link>
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identitas</p>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p><span className="font-medium text-slate-900">Role:</span> {ROLE_LABEL[result.role] ?? result.role}</p>
            <p><span className="font-medium text-slate-900">Divisi:</span> {employee.divisionName ?? "-"}</p>
            <p><span className="font-medium text-slate-900">Jabatan:</span> {employee.positionName ?? "-"}</p>
            <p><span className="font-medium text-slate-900">Status Kerja:</span> {EMPLOYMENT_STATUS_LABEL[employee.employmentStatus] ?? employee.employmentStatus}</p>
            <p><span className="font-medium text-slate-900">Status Payroll:</span> {PAYROLL_STATUS_LABEL[employee.payrollStatus] ?? employee.payrollStatus}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aksi Cepat</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-teal-200 hover:bg-teal-50"
              >
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="mt-1 text-xs text-slate-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Jadwal Aktif"
          value={formatScheduleLabel(activeSchedule)}
          helper={activeSchedule ? `Efektif ${formatDate(activeSchedule.effectiveStartDate)}` : undefined}
        />
        <SummaryCard
          label="Supervisor"
          value={employee.supervisorName ?? "Belum ditetapkan"}
          helper={`Mulai kerja ${formatDate(employee.startDate)}`}
        />
        <SummaryCard
          label="Tiket Terakhir"
          value={latestTicket ? `${latestTicket.ticketType} | ${latestTicket.status}` : "Belum ada"}
          helper={latestTicket ? `${formatDate(latestTicket.startDate)} s/d ${formatDate(latestTicket.endDate)}` : undefined}
        />
        <SummaryCard
          label="Review Terakhir"
          value={latestReview ? `${latestReview.category ?? "-"} | ${latestReview.status}` : "Belum ada"}
          helper={latestReview ? `${formatDate(latestReview.periodStartDate)} s/d ${formatDate(latestReview.periodEndDate)}` : undefined}
        />
      </section>

      {employee.employeeGroup === "TEAMWORK" && teamworkActivitySummary ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Aktivitas Pribadi 30 Hari Terakhir
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ringkasan aktivitas kerja yang perlu diajukan, menunggu approval, dan yang sudah approved.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Perlu Diajukan"
              value={teamworkActivitySummary.needsSubmitCount}
              helper="Draft atau revisi yang masih perlu Anda ajukan."
            />
            <SummaryCard
              label="Menunggu Approval"
              value={teamworkActivitySummary.pendingApprovalCount}
              helper="Aktivitas yang sudah diajukan dan masih menunggu approval."
            />
            <SummaryCard
              label="Approved"
              value={teamworkActivitySummary.approvedCount}
              helper={`Poin approved ${teamworkActivitySummary.approvedPoints.toLocaleString("id-ID")}`}
            />
            <SummaryCard
              label="Ditolak"
              value={teamworkActivitySummary.rejectedCount}
              helper="Aktivitas yang pernah ditolak SPV dan perlu ditinjau ulang."
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Incident Aktif</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{incidentSummary.activeCount}</p>
          <p className="mt-2 text-sm text-slate-500">
            {incidentSummary.latestIncidentType
              ? `${incidentSummary.latestIncidentType} | ${formatDate(incidentSummary.latestIncidentDate)}`
              : "Belum ada incident aktif."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Performa Terakhir</p>
          {latestPerformance ? (
            <>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {Number(latestPerformance.performancePercent).toFixed(1)}%
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {formatDate(latestPerformance.periodStartDate)} s/d {formatDate(latestPerformance.periodEndDate)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Belum ada data performa pribadi.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payroll Terakhir</p>
          {latestPayroll ? (
            <>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                Rp {Number(latestPayroll.takeHomePay).toLocaleString("id-ID")}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {latestPayroll.periodCode} | {latestPayroll.periodStatus}
              </p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href={`/payroll/${latestPayroll.periodId}/${employee.id}`}>Lihat Slip Gaji</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Belum ada ringkasan payroll yang dapat ditampilkan.</p>
          )}
        </div>
      </section>
    </div>
  );
}
