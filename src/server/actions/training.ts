"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import { monthlyPointPerformances } from "@/lib/db/schema/point";
import { checkRole, getCurrentUserRoleRow, requireAuth } from "@/lib/auth/session";
import { asc, desc, eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

const TRAINING_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];

function resolveCategory(pct: number, passPct: number) {
  if (pct >= passPct) return "LULUS";
  if (pct >= passPct * 0.8) return "MENDEKATI";
  return "BELUM_LULUS";
}

export async function getTrainingEvaluations() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!TRAINING_ROLES.includes(role)) {
    return { role, evaluations: [] };
  }

  const trainees = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      startDate: employees.startDate,
      trainingGraduationDate: employees.trainingGraduationDate,
      employmentStatus: employees.employmentStatus,
      divisionId: employees.divisionId,
      divisionName: divisions.name,
      divisionTrainingPassPercent: divisions.trainingPassPercent,
    })
    .from(employees)
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(
      and(
        eq(employees.employeeGroup, "TEAMWORK"),
        eq(employees.employmentStatus, "TRAINING"),
        eq(employees.isActive, true),
        ["SPV", "KABAG"].includes(role) && roleRow.divisionIds.length > 0
          ? inArray(employees.divisionId, roleRow.divisionIds)
          : undefined,
      )
    )
    .orderBy(asc(employees.startDate));

  const results = await Promise.all(
    trainees.map(async (trainee) => {
      const performances = await db
        .select({
          id: monthlyPointPerformances.id,
          periodStartDate: monthlyPointPerformances.periodStartDate,
          periodEndDate: monthlyPointPerformances.periodEndDate,
          performancePercent: monthlyPointPerformances.performancePercent,
          totalApprovedPoints: monthlyPointPerformances.totalApprovedPoints,
          totalTargetPoints: monthlyPointPerformances.totalTargetPoints,
          status: monthlyPointPerformances.status,
        })
        .from(monthlyPointPerformances)
        .where(eq(monthlyPointPerformances.employeeId, trainee.id))
        .orderBy(desc(monthlyPointPerformances.periodStartDate));

      const passPct = trainee.divisionTrainingPassPercent ?? 80;
      const avgPct =
        performances.length === 0
          ? 0
          : performances.reduce((sum, p) => sum + Number(p.performancePercent), 0) /
            performances.length;

      const latestPct =
        performances.length > 0 ? Number(performances[0].performancePercent) : 0;

      const trainingMonths = trainee.startDate
        ? Math.ceil(
            (Date.now() - new Date(trainee.startDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        : 0;

      return {
        ...trainee,
        divisionName: trainee.divisionName ?? "-",
        divisionTrainingPassPercent: passPct,
        performances: performances.map((p) => ({
          ...p,
          performancePercent: Number(p.performancePercent),
          totalApprovedPoints: Number(p.totalApprovedPoints),
          totalTargetPoints: Number(p.totalTargetPoints),
          periodStartDate: p.periodStartDate instanceof Date
            ? p.periodStartDate.toISOString().slice(0, 10)
            : String(p.periodStartDate),
          periodEndDate: p.periodEndDate instanceof Date
            ? p.periodEndDate.toISOString().slice(0, 10)
            : String(p.periodEndDate),
        })),
        avgPerformancePercent: Number(avgPct.toFixed(2)),
        latestPerformancePercent: latestPct,
        trainingMonths,
        evaluationCategory: resolveCategory(avgPct, passPct),
      };
    })
  );

  return { role, evaluations: results };
}

export async function graduateTrainee(employeeId: string, notes: string) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return authError;

  const [emp] = await db
    .select({ id: employees.id, employmentStatus: employees.employmentStatus })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!emp) return { error: "Karyawan tidak ditemukan." };
  if (emp.employmentStatus !== "TRAINING") {
    return { error: "Karyawan tidak sedang dalam masa training." };
  }

  await db
    .update(employees)
    .set({
      employmentStatus: "REGULER",
      payrollStatus: "REGULER",
      trainingGraduationDate: new Date(),
      notes,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, employeeId));

  revalidatePath("/performance/training");
  revalidatePath("/employees");
  return { success: true };
}

export async function failTrainee(employeeId: string, notes: string) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return authError;

  const [emp] = await db
    .select({ id: employees.id, employmentStatus: employees.employmentStatus })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!emp) return { error: "Karyawan tidak ditemukan." };
  if (emp.employmentStatus !== "TRAINING") {
    return { error: "Karyawan tidak sedang dalam masa training." };
  }

  await db
    .update(employees)
    .set({
      employmentStatus: "TIDAK_LOLOS",
      payrollStatus: "NONAKTIF",
      notes,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, employeeId));

  revalidatePath("/performance/training");
  revalidatePath("/employees");
  return { success: true };
}
