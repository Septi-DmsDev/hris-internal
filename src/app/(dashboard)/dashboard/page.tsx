import { getDashboardStats } from "@/server/actions/dashboard";
import { Badge } from "@/components/ui/badge";

const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  DIAJUKAN: "Diajukan",
  DITOLAK_SPV: "Ditolak SPV",
  REVISI_TW: "Revisi TW",
  DIAJUKAN_ULANG: "Diajukan Ulang",
  DISETUJUI_SPV: "Disetujui SPV",
  OVERRIDE_HRD: "Override HRD",
  DIKUNCI_PAYROLL: "Dikunci Payroll",
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function AlertCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 transition-colors">
      <span className="text-sm text-slate-600">{label}</span>
      {value > 0 ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{value}</span>
      ) : (
        <span className="text-xs text-slate-400">Tidak ada</span>
      )}
    </a>
  );
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const totalPending =
    stats.pendingApprovals.tickets +
    stats.pendingApprovals.activities +
    stats.pendingApprovals.reviews;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard HRD</h1>
        <p className="text-sm text-slate-500">Ringkasan performa dan status operasional karyawan.</p>
      </div>

      {/* Employee Overview */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Karyawan</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total Aktif" value={stats.employees.totalAktif} />
          <StatCard label="Status Reguler" value={stats.employees.reguler} />
          <StatCard label="Status Training" value={stats.employees.training} />
        </div>
      </section>

      {/* Pending Approvals */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Menunggu Tindakan
          {totalPending > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {totalPending}
            </span>
          )}
        </h2>
        <div className="space-y-2">
          <AlertCard label="Tiket Izin / Sakit / Cuti" value={stats.pendingApprovals.tickets} href="/tickets" />
          <AlertCard label="Aktivitas Harian Perlu Disetujui" value={stats.pendingApprovals.activities} href="/performance" />
          <AlertCard label="Review Karyawan Perlu Divalidasi" value={stats.pendingApprovals.reviews} href="/reviews" />
        </div>
      </section>

      {/* Division Performance */}
      {stats.divisionPerformance.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Performa per Divisi</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 text-left">Divisi</th>
                  <th className="px-4 py-3 text-right">Avg Performa</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.divisionPerformance.map((d) => {
                  const pct = d.avgPercent ?? 0;
                  const color =
                    pct >= 100 ? "text-emerald-700" : pct >= 80 ? "text-amber-700" : "text-red-700";
                  const badge =
                    pct >= 100
                      ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Tercapai</Badge>
                      : pct >= 80
                      ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Mendekati</Badge>
                      : <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Di bawah target</Badge>;
                  return (
                    <tr key={d.divisionName} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{d.divisionName}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${color}`}>
                        {d.avgPercent != null ? `${d.avgPercent}%` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">{badge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Activity by Status */}
      {stats.activityByStatus.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Aktivitas Harian per Status</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.activityByStatus
              .sort((a, b) => b.jumlah - a.jumlah)
              .map((s) => (
                <StatCard
                  key={s.status}
                  label={ACTIVITY_STATUS_LABEL[s.status] ?? s.status}
                  value={s.jumlah}
                />
              ))}
          </div>
        </section>
      )}

      {/* Incident Summary */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Incident Log</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Incident Aktif" value={stats.incidentSummary.total} />
          <StatCard
            label="Berpotensi Potong Payroll"
            value={stats.incidentSummary.withDeduction}
            sub="dengan nilai potongan tercatat"
          />
        </div>
      </section>
    </div>
  );
}
