export function resolveHeaderTitle(pathname: string) {
  if (pathname === "/me") return "Saya";
  if (pathname === "/me/profile") return "Profil Saya";
  if (pathname.startsWith("/payroll/") && pathname.endsWith("/payslip.pdf")) return "Slip Gaji";
  if (/^\/payroll\/[^/]+\/[^/]+$/.test(pathname)) return "Detail Payroll";
  if (pathname.startsWith("/payroll")) return "Payroll";
  if (pathname.startsWith("/finance")) return "Finance";
  if (pathname.startsWith("/performance/training")) return "Evaluasi Training";
  if (pathname.startsWith("/performance")) return "Performa";
  if (pathname.startsWith("/employees/")) return "Detail Karyawan";
  if (pathname.startsWith("/employees")) return "Karyawan";
  if (pathname.startsWith("/tickets")) return "Ticketing";
  if (pathname.startsWith("/reviews")) return "Review";
  if (pathname.startsWith("/master/")) return "Master Data";
  if (pathname.startsWith("/users")) return "Manajemen Pengguna";
  if (pathname.startsWith("/settings")) return "Pengaturan";
  return "Dashboard";
}
