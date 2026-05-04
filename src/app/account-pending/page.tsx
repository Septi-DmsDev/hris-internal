import { requireAuth } from "@/lib/auth/session";
import { logoutAction } from "@/server/actions/auth";

export default async function AccountPendingPage() {
  const user = await requireAuth();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl items-center">
        <div className="w-full rounded-3xl border border-amber-500/20 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Access pending
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">
            Akun berhasil login, tetapi belum punya akses dashboard.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Session Supabase Anda valid, namun aplikasi tidak menemukan row
            `user_roles` untuk akun ini. Admin perlu menambahkan mapping user
            ke role aplikasi sebelum dashboard bisa dibuka.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              User login
            </p>
            <p className="mt-2 font-mono text-sm text-amber-200">
              {user.email ?? user.id}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">{user.id}</p>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-6 text-slate-300">
            <p>
              Tambahkan user ini ke tabel `user_roles` lewat menu Users atau SQL
              admin, lalu refresh halaman ini.
            </p>
            <p>
              Jika akun ini seharusnya belum dipakai, keluar dulu lalu login
              dengan akun yang sudah terdaftar.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-400"
            >
              Coba Lagi
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
