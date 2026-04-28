"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BarChart3, Ticket,
  FileCheck, CreditCard, Settings, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "SPV", "TEAMWORK", "MANAGERIAL", "PAYROLL_VIEWER"],
  },
  {
    label: "Karyawan",
    href: "/employees",
    icon: <Users size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "FINANCE"],
  },
  {
    label: "Performa",
    href: "/performance",
    icon: <BarChart3 size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"],
  },
  {
    label: "Ticketing",
    href: "/tickets",
    icon: <Ticket size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"],
  },
  {
    label: "Review",
    href: "/reviews",
    icon: <FileCheck size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "SPV"],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: <CreditCard size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "PAYROLL_VIEWER"],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: <BarChart3 size={18} />,
    roles: ["SUPER_ADMIN", "HRD", "FINANCE", "PAYROLL_VIEWER"],
  },
  {
    label: "Master Data",
    href: "/master/branches",
    icon: <Database size={18} />,
    roles: ["SUPER_ADMIN", "HRD"],
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: <Settings size={18} />,
    roles: ["SUPER_ADMIN"],
  },
];

type SidebarProps = {
  userRole: UserRole;
};

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-base font-bold tracking-tight">HRIS Internal</h1>
        <p className="text-xs text-slate-400 mt-0.5">Human Resource System</p>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
