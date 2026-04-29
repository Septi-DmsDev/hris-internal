import { logoutAction } from "@/server/actions/auth";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HRD: "HRD",
  FINANCE: "Finance",
  SPV: "Supervisor",
  TEAMWORK: "Team Work",
  MANAGERIAL: "Managerial",
  PAYROLL_VIEWER: "Payroll Viewer",
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700",
  HRD: "bg-teal-100 text-teal-700",
  FINANCE: "bg-blue-100 text-blue-700",
  SPV: "bg-amber-100 text-amber-700",
  TEAMWORK: "bg-slate-100 text-slate-700",
  MANAGERIAL: "bg-orange-100 text-orange-700",
  PAYROLL_VIEWER: "bg-green-100 text-green-700",
};

type HeaderProps = {
  userEmail: string;
  userRole: string;
};

function UserAvatar({ email }: { email: string }) {
  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
      <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
    </div>
  );
}

export default function Header({ userEmail, userRole }: HeaderProps) {
  const roleLabel = ROLE_LABEL[userRole] ?? userRole;
  const roleBadgeClass = ROLE_COLOR[userRole] ?? "bg-slate-100 text-slate-700";

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800">Dashboard</span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadgeClass}`}
        >
          {roleLabel}
        </span>

        <div className="flex items-center gap-2.5">
          <UserAvatar email={userEmail} />
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-slate-800 leading-none">{userEmail}</p>
            <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 font-medium"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </form>
      </div>
    </header>
  );
}
