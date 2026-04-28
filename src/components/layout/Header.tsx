import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HRD: "HRD",
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

export default function Header({ userEmail, userRole }: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800">{userEmail}</p>
          <p className="text-xs text-slate-500">{ROLE_LABEL[userRole] ?? userRole}</p>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" type="submit">
            Keluar
          </Button>
        </form>
      </div>
    </header>
  );
}
