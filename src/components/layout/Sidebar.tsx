"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Ticket,
  FileCheck,
  CreditCard,
  TrendingUp,
  Database,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  group: "main" | "admin";
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "SPV", "TEAMWORK", "MANAGERIAL", "PAYROLL_VIEWER"],
    group: "main",
  },
  {
    label: "Karyawan",
    href: "/employees",
    icon: Users,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "FINANCE"],
    group: "main",
  },
  {
    label: "Performa",
    href: "/performance",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"],
    group: "main",
  },
  {
    label: "Ticketing",
    href: "/tickets",
    icon: Ticket,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"],
    group: "main",
  },
  {
    label: "Review",
    href: "/reviews",
    icon: FileCheck,
    roles: ["SUPER_ADMIN", "HRD", "SPV"],
    group: "main",
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: CreditCard,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "PAYROLL_VIEWER"],
    group: "main",
  },
  {
    label: "Finance",
    href: "/finance",
    icon: TrendingUp,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "PAYROLL_VIEWER"],
    group: "main",
  },
  {
    label: "Master Data",
    href: "/master/branches",
    icon: Database,
    roles: ["SUPER_ADMIN", "HRD"],
    group: "admin",
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
    group: "admin",
  },
];

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  HRD: "HRD",
  FINANCE: "Finance",
  SPV: "Supervisor",
  TEAMWORK: "Team Work",
  MANAGERIAL: "Managerial",
  PAYROLL_VIEWER: "Payroll Viewer",
};

type SidebarProps = {
  userRole: UserRole;
};

function NavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-teal-500/[0.13] text-white"
          : "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
      )}
    >
      <Icon
        size={16}
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-teal-400" : "text-white/35"
        )}
      />
      {item.label}
    </Link>
  );
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(userRole));
  const mainItems = visible.filter((i) => i.group === "main");
  const adminItems = visible.filter((i) => i.group === "admin");

  function isActive(item: NavItem) {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="w-60 min-h-screen bg-[#0f172a] flex flex-col shrink-0 border-r border-white/[0.05]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shrink-0 text-white text-xs font-black"
            style={{ boxShadow: "0 0 16px rgba(20,184,166,0.35)" }}
          >
            HR
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              HRIS Internal
            </h1>
            <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-medium">
              Human Resource
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {mainItems.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              Menu Utama
            </p>
            {mainItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item)} />
            ))}
          </div>
        )}

        {adminItems.length > 0 && (
          <div className="space-y-0.5 pt-5">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              Administrasi
            </p>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item)} />
            ))}
          </div>
        )}
      </nav>

      {/* Role badge */}
      <div className="px-4 py-4 border-t border-white/[0.07]">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/[0.12] text-teal-300 border border-teal-500/20 tracking-wide">
          {ROLE_LABEL[userRole]}
        </span>
      </div>
    </aside>
  );
}
