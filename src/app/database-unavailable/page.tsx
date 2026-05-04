import {
  getDatabaseTargetLabel,
  isLocalDatabaseTarget,
} from "@/lib/db/errors";

export default function DatabaseUnavailablePage() {
  const databaseTarget = getDatabaseTargetLabel();
  const localTarget = isLocalDatabaseTarget();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center">
        <div className="w-full rounded-3xl border border-amber-500/20 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Database unavailable
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
            Login berhasil, tetapi aplikasi tidak bisa menjangkau PostgreSQL.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Dashboard ini memakai Supabase Auth untuk login dan PostgreSQL
            untuk role, dashboard, payroll, dan data operasional. Saat koneksi
            database gagal, halaman dashboard tidak bisa dirender.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Target `DATABASE_URL`
            </p>
            <p className="mt-2 font-mono text-sm text-amber-200">
              {databaseTarget}
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-6 text-slate-300">
            <p>
              Penyebab paling umum di deployment container adalah host database
              masih diarahkan ke `localhost`. Di dalam container Coolify,
              `localhost` menunjuk ke container aplikasi itu sendiri, bukan ke
              service Postgres lain.
            </p>
            <p>
              {localTarget
                ? "Nilai saat ini masih memakai localhost. Ganti host DATABASE_URL ke hostname service Postgres yang benar atau ke host/IP database yang memang bisa dijangkau dari container aplikasi."
                : "Periksa apakah host, port, kredensial, dan network antar service memang saling terhubung dari container aplikasi ke Postgres."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
