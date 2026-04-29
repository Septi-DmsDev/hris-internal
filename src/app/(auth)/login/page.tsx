import LoginForm from "./LoginForm";

const FEATURES = [
  "Manajemen karyawan & data profil lengkap",
  "Sistem performa & aktivitas harian terpadu",
  "Payroll otomatis dengan closing keuangan",
  "Ticketing izin, sakit, dan cuti terintegrasi",
];

export default function LoginPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-[#0f172a] px-12 py-10 shrink-0 relative overflow-hidden">
        {/* Subtle background glow */}
        <div
          className="absolute top-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)",
            transform: "translate(-30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)",
            transform: "translate(30%, 30%)",
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-white text-sm font-black"
            style={{ boxShadow: "0 0 20px rgba(20,184,166,0.4)" }}
          >
            HR
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            HRIS Internal
          </span>
        </div>

        {/* Center content */}
        <div className="space-y-6 relative z-10">
          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Kelola SDM<br />
              <span className="text-teal-400">lebih efisien.</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Platform terpadu untuk seluruh siklus HR — dari onboarding
              karyawan hingga closing payroll bulanan.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                </div>
                <span className="text-sm text-white/55">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/20 relative z-10 font-medium">
          HRIS Internal · Sistem Informasi SDM
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-8 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xs font-black">
              HR
            </div>
            <span className="font-bold text-slate-900">HRIS Internal</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Selamat datang
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Masuk ke akun HRIS Anda untuk melanjutkan
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
