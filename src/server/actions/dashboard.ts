"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { dailyActivityEntries, monthlyPointPerformances } from "@/lib/db/schema/point";
import { attendanceAlphaEvents, attendanceTickets, employeeReviews, incidentLogs } from "@/lib/db/schema/hr";
import { requireAuth, getCurrentUserRoleRow } from "@/lib/auth/session";
import { and, avg, count, eq, inArray, sql } from "drizzle-orm";
import type { UserRole } from "@/types";

const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];

export type DashboardStats = {
  role: UserRole;
  employees: {
    totalAktif: number;
    training: number;
    reguler: number;
  };
  pendingApprovals: {
    tickets: number;
    activities: number;
    reviews: number;
    alpha: number;
  };
  activityByStatus: { status: string; jumlah: number }[];
  divisionPerformance: {
    divisionName: string;
    avgPercent: number | null;
    periodLabel: string;
  }[];
  incidentSummary: {
    total: number;
    withDeduction: number;
  };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const isDivScoped = DIV_SCOPED_ROLES.includes(role) && roleRow.divisionIds.length > 0;
  const divScope = isDivScoped ? inArray(employees.divisionId, roleRow.divisionIds) : undefined;

  const empRows = await db
    .select({ employmentStatus: employees.employmentStatus, cnt: count() })
    .from(employees)
    .where(and(eq(employees.isActive, true), divScope))
    .groupBy(employees.employmentStatus);

  let totalAktif = 0;
  let training = 0;
  let reguler = 0;
  for (const r of empRows) {
    totalAktif += Number(r.cnt);
    if (r.employmentStatus === "TRAINING") training += Number(r.cnt);
    if (r.employmentStatus === "REGULER") reguler += Number(r.cnt);
  }

  const [ticketPending] = await db
    .select({ cnt: count() })
    .from(attendanceTickets)
    .leftJoin(employees, eq(attendanceTickets.employeeId, employees.id))
    .where(and(inArray(attendanceTickets.status, ["SUBMITTED", "NEED_REVIEW"]), divScope));

  const [activityPending] = await db
    .select({ cnt: count() })
    .from(dailyActivityEntries)
    .leftJoin(employees, eq(dailyActivityEntries.employeeId, employees.id))
    .where(and(inArray(dailyActivityEntries.status, ["DIAJUKAN", "DIAJUKAN_ULANG"]), divScope));

  const [reviewPending] = await db
    .select({ cnt: count() })
    .from(employeeReviews)
    .leftJoin(employees, eq(employeeReviews.employeeId, employees.id))
    .where(and(eq(employeeReviews.status, "SUBMITTED"), divScope));

  const [alphaPending] = await db
    .select({ cnt: count() })
    .from(attendanceAlphaEvents)
    .leftJoin(employees, eq(attendanceAlphaEvents.employeeId, employees.id))
    .where(and(sql`${attendanceAlphaEvents.status} <> 'SP1_ISSUED'`, divScope));

  const actStatusRows = await db
    .select({ status: dailyActivityEntries.status, jumlah: count() })
    .from(dailyActivityEntries)
    .leftJoin(employees, eq(dailyActivityEntries.employeeId, employees.id))
    .where(divScope)
    .groupBy(dailyActivityEntries.status);

  const divPerfRows = await db
    .select({
      divisionName: monthlyPointPerformances.divisionSnapshotName,
      avgPercent: avg(monthlyPointPerformances.performancePercent),
      periodStart: sql<string>`max(${monthlyPointPerformances.periodStartDate})`,
    })
    .from(monthlyPointPerformances)
    .leftJoin(employees, eq(monthlyPointPerformances.employeeId, employees.id))
    .where(and(eq(employees.isActive, true), divScope))
    .groupBy(monthlyPointPerformances.divisionSnapshotName)
    .orderBy(monthlyPointPerformances.divisionSnapshotName);

  const [incTotal] = await db
    .select({ cnt: count() })
    .from(incidentLogs)
    .leftJoin(employees, eq(incidentLogs.employeeId, employees.id))
    .where(and(eq(incidentLogs.isActive, true), divScope));

  const [incWithDeduction] = await db
    .select({ cnt: count() })
    .from(incidentLogs)
    .leftJoin(employees, eq(incidentLogs.employeeId, employees.id))
    .where(and(eq(incidentLogs.isActive, true), sql`${incidentLogs.payrollDeduction} is not null`, divScope));

  return {
    role,
    employees: { totalAktif, training, reguler },
    pendingApprovals: {
      tickets: Number(ticketPending?.cnt ?? 0),
      activities: Number(activityPending?.cnt ?? 0),
      reviews: Number(reviewPending?.cnt ?? 0),
      alpha: Number(alphaPending?.cnt ?? 0),
    },
    activityByStatus: actStatusRows.map((r) => ({ status: r.status, jumlah: Number(r.jumlah) })),
    divisionPerformance: divPerfRows.map((r) => ({
      divisionName: r.divisionName,
      avgPercent: r.avgPercent != null ? Number(Number(r.avgPercent).toFixed(1)) : null,
      periodLabel: r.periodStart ?? "-",
    })),
    incidentSummary: {
      total: Number(incTotal?.cnt ?? 0),
      withDeduction: Number(incWithDeduction?.cnt ?? 0),
    },
  };
}
