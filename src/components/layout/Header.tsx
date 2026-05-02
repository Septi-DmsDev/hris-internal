import HeaderTitle from "./HeaderTitle";

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

  return (
    <header className="fixed left-60 right-0 top-0 z-30 h-16 border-b border-slate-200/80 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <HeaderTitle />
      </div>

      <div className="flex items-center gap-3 ml-6">
        <div className="flex items-center gap-2.5">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-slate-800 leading-none">{userEmail}</p>
            <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
          </div>
          <UserAvatar email={userEmail} />
        </div>

      </div>
    </header>
  );
}
