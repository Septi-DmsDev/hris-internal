"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import { employeeReviews, incidentLogs } from "@/lib/db/schema/hr";
import { checkRole, getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { createReviewSchema, createIncidentSchema } from "@/lib/validations/hr";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

const REVIEW_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV"];
const SELF_SERVICE_REVIEW_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL"];

// Bobot aspek review
const WEIGHTS = {
  sopQuality: 0.25,
  instruction: 0.15,
  attendanceDiscipline: 0.20,
  initiativeTeamwork: 0.20,
  processMiss: 0.20,
};

function computeReviewScore(scores: {
  sopQualityScore: number;
  instructionScore: number;
  attendanceDisciplineScore: number;
  initiativeTeamworkScore: number;
  processMissScore: number;
}) {
  const raw =
    (scores.sopQualityScore * WEIGHTS.sopQuality +
      scores.instructionScore * WEIGHTS.instruction +
      scores.attendanceDisciplineScore * WEIGHTS.attendanceDiscipline +
      scores.initiativeTeamworkScore * WEIGHTS.initiativeTeamwork +
      scores.processMissScore * WEIGHTS.processMiss) /
    5 * 100;
  const total = Number(raw.toFixed(2));
  let category = "Buruk";
  if (total >= 90) category = "Sangat Baik";
  else if (total >= 80) category = "Baik";
  else if (total >= 70) category = "Cukup";
  else if (total >= 60) category = "Kurang";
  return { total, category };
}

async function assertReviewScope(role: UserRole, divisionId: string | null, employeeId: string) {
  if (role !== "SPV") return true;
  if (!divisionId) return false;

  const [employeeRow] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return employeeRow?.divisionId === divisionId;
}

export async function getReviews() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const isSelfService = SELF_SERVICE_REVIEW_ROLES.includes(role);

  // TEAMWORK/MANAGERIAL tanpa employeeId → tidak bisa melihat apapun
  if (isSelfService && !roleRow.employeeId) {
    return { role, reviews: [], incidents: [] };
  }

  // Role lain yang tidak ada di daftar → kosong
  if (!REVIEW_ROLES.includes(role) && !isSelfService) {
    return { role, reviews: [], incidents: [] };
  }

  function reviewWhereClause() {
    if (isSelfService) return eq(employeeReviews.employeeId, roleRow.employeeId!);
    if (role === "SPV" && roleRow.divisionId) return eq(employees.divisionId, roleRow.divisionId);
    return undefined;
  }

  function incidentWhereClause() {
    if (isSelfService) return eq(incidentLogs.employeeId, roleRow.employeeId!);
    if (role === "SPV" && roleRow.divisionId) return eq(employees.divisionId, roleRow.divisionId);
    return undefined;
  }

  const rows = await db
    .select({
      id: employeeReviews.id,
      employeeId: employeeReviews.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      periodStartDate: employeeReviews.periodStartDate,
      periodEndDate: employeeReviews.periodEndDate,
      sopQualityScore: employeeReviews.sopQualityScore,
      instructionScore: employeeReviews.instructionScore,
      attendanceDisciplineScore: employeeReviews.attendanceDisciplineScore,
      initiativeTeamworkScore: employeeReviews.initiativeTeamworkScore,
      processMissScore: employeeReviews.processMissScore,
      totalScore: employeeReviews.totalScore,
      category: employeeReviews.category,
      status: employeeReviews.status,
      reviewNotes: employeeReviews.reviewNotes,
      createdAt: employeeReviews.createdAt,
    })
    .from(employeeReviews)
    .leftJoin(employees, eq(employeeReviews.employeeId, employees.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(reviewWhereClause())
    .orderBy(desc(employeeReviews.createdAt));

  const incidents = await db
    .select({
      id: incidentLogs.id,
      employeeId: incidentLogs.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      incidentType: incidentLogs.incidentType,
      incidentDate: incidentLogs.incidentDate,
      description: incidentLogs.description,
      impact: incidentLogs.impact,
      payrollDeduction: incidentLogs.payrollDeduction,
      isActive: incidentLogs.isActive,
      notes: incidentLogs.notes,
      createdAt: incidentLogs.createdAt,
    })
    .from(incidentLogs)
    .leftJoin(employees, eq(incidentLogs.employeeId, employees.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(incidentWhereClause())
    .orderBy(desc(incidentLogs.incidentDate));

  return { role, reviews: rows, incidents };
}

export async function createReview(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "SPV"]);
  if (authError) return authError;

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input review tidak valid." };
  }

  const roleRow = await getCurrentUserRoleRow();
  const inScope = await assertReviewScope(roleRow.role as UserRole, roleRow.divisionId ?? null, parsed.data.employeeId);
  if (!inScope) {
    return { error: "Akses ditolak untuk karyawan di luar scope divisi Anda." };
  }

  const scores = {
    sopQualityScore: parsed.data.sopQualityScore,
    instructionScore: parsed.data.instructionScore,
    attendanceDisciplineScore: parsed.data.attendanceDisciplineScore,
    initiativeTeamworkScore: parsed.data.initiativeTeamworkScore,
    processMissScore: parsed.data.processMissScore,
  };
  const { total, category } = computeReviewScore(scores);

  try {
    await db.insert(employeeReviews).values({
      employeeId: parsed.data.employeeId,
      // Repo belum memiliki relasi auth user -> employee, jadi reviewer employee belum bisa diisi aman.
      reviewerEmployeeId: null,
      periodStartDate: parsed.data.periodStartDate,
      periodEndDate: parsed.data.periodEndDate,
      ...scores,
      totalScore: total.toFixed(2),
      category,
      status: "SUBMITTED",
      reviewNotes: parsed.data.reviewNotes,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Karyawan tidak valid." };
    throw e;
  }

  revalidatePath("/reviews");
  return { success: true, total, category };
}

export async function validateReview(reviewId: string) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return authError;

  const user = await getUser();
  const [review] = await db
    .select({ id: employeeReviews.id, status: employeeReviews.status })
    .from(employeeReviews)
    .where(eq(employeeReviews.id, reviewId))
    .limit(1);

  if (!review) return { error: "Review tidak ditemukan." };
  if (review.status !== "SUBMITTED") return { error: "Review tidak dalam status yang dapat divalidasi." };

  await db
    .update(employeeReviews)
    .set({ status: "VALIDATED", validatedByUserId: user?.id ?? null, validatedAt: new Date(), updatedAt: new Date() })
    .where(eq(employeeReviews.id, reviewId));

  revalidatePath("/reviews");
  return { success: true };
}

export async function createIncident(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "SPV"]);
  if (authError) return authError;

  const parsed = createIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input incident tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const inScope = await assertReviewScope(role, roleRow.divisionId ?? null, parsed.data.employeeId);
  if (!inScope) {
    return { error: "Akses ditolak untuk karyawan di luar scope divisi Anda." };
  }

  const [emp] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, parsed.data.employeeId))
    .limit(1);

  try {
    await db.insert(incidentLogs).values({
      employeeId: parsed.data.employeeId,
      divisionId: emp?.divisionId ?? null,
      incidentType: parsed.data.incidentType,
      incidentDate: parsed.data.incidentDate,
      description: parsed.data.description,
      impact: parsed.data.impact,
      payrollDeduction: parsed.data.payrollDeduction?.toFixed(2) ?? null,
      recordedByUserId: user?.id ?? parsed.data.employeeId,
      recordedByRole: role,
      notes: parsed.data.notes,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Karyawan tidak valid." };
    throw e;
  }

  revalidatePath("/reviews");
  return { success: true };
}
