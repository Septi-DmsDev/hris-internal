import type { UserRole } from "@/types";

export type PersonalQuickAction = {
  href: string;
  label: string;
  description: string;
};

type TeamworkActivityStatus =
  | "DRAFT"
  | "REVISI_TW"
  | "DIAJUKAN"
  | "DIAJUKAN_ULANG"
  | "DISETUJUI_SPV"
  | "OVERRIDE_HRD"
  | "DIKUNCI_PAYROLL"
  | "DITOLAK_SPV";

export type TeamworkActivitySummary = {
  needsSubmitCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvedPoints: number;
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function resolveMyAccessState(role: UserRole, employeeId: string | null) {
  if (role === "FINANCE") {
    return {
      canAccess: false,
      redirectTo: "/finance",
    };
  }

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

export function buildTeamworkActivitySummary(
  rows: Array<{ status: TeamworkActivityStatus; totalPoints: string | number | null }>
): TeamworkActivitySummary {
  return rows.reduce<TeamworkActivitySummary>(
    (summary, row) => {
      if (row.status === "DRAFT" || row.status === "REVISI_TW") {
        summary.needsSubmitCount += 1;
      }

      if (row.status === "DIAJUKAN" || row.status === "DIAJUKAN_ULANG") {
        summary.pendingApprovalCount += 1;
      }

      if (row.status === "DISETUJUI_SPV" || row.status === "OVERRIDE_HRD" || row.status === "DIKUNCI_PAYROLL") {
        summary.approvedCount += 1;
        summary.approvedPoints += toNumber(row.totalPoints);
      }

      if (row.status === "DITOLAK_SPV") {
        summary.rejectedCount += 1;
      }

      return summary;
    },
    {
      needsSubmitCount: 0,
      pendingApprovalCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      approvedPoints: 0,
    }
  );
}
