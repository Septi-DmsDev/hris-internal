import type { UserRole } from "@/types";

export type PersonalQuickAction = {
  href: string;
  label: string;
  description: string;
};

export function resolveMyAccessState(role: UserRole, employeeId: string | null) {
  if (role === "SUPER_ADMIN" && !employeeId) {
    return {
      canAccess: false,
      redirectTo: "/dashboard",
    };
  }

  return {
    canAccess: true,
    redirectTo: null,
  };
}

export function buildPersonalQuickActions(role: UserRole): PersonalQuickAction[] {
  const commonActions: PersonalQuickAction[] = [
    {
      href: "/tickets",
      label: "Tiket",
      description: "Ajukan dan lihat riwayat tiket pribadi.",
    },
    {
      href: "/me/profile",
      label: "Profil Saya",
      description: "Lihat detail profil dan data kepegawaian pribadi.",
    },
  ];

  if (role === "TEAMWORK") {
    return [
      {
        href: "/performance",
        label: "Input Poin",
        description: "Masuk ke aktivitas harian dan performa pribadi.",
      },
      ...commonActions,
    ];
  }

  if (role === "FINANCE") {
    return [
      {
        href: "/payroll",
        label: "Payroll",
        description: "Lihat payroll dan hasil periode terbaru.",
      },
      {
        href: "/finance",
        label: "Finance",
        description: "Lihat rekap finance dan biaya payroll.",
      },
      ...commonActions,
    ];
  }

  if (role === "PAYROLL_VIEWER") {
    return [
      {
        href: "/payroll",
        label: "Payroll",
        description: "Lihat payroll dan hasil periode terbaru.",
      },
      ...commonActions,
    ];
  }

  if (role === "HRD" || role === "SPV" || role === "KABAG") {
    return [
      {
        href: "/reviews",
        label: "Review",
        description: "Lihat review, incident, dan aktivitas terkait.",
      },
      {
        href: "/tickets",
        label: "Tiket",
        description: "Kelola tiket pribadi dan pantau pengajuan.",
      },
      {
        href: "/me/profile",
        label: "Profil Saya",
        description: "Lihat detail profil dan data kepegawaian pribadi.",
      },
    ];
  }

  if (role === "MANAGERIAL") {
    return [
      {
        href: "/reviews",
        label: "Review",
        description: "Lihat review pribadi dan catatan kerja.",
      },
      ...commonActions,
    ];
  }

  return commonActions;
}
