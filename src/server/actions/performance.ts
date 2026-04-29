"use server";

import { db } from "@/lib/db";
import {
  employeeDivisionHistories,
  employeeScheduleAssignments,
  employees,
  workScheduleDays,
} from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import {
  dailyActivityApprovalLogs,
  dailyActivityEntries,
  monthlyPointPerformances,
  pointCatalogEntries,
} from "@/lib/db/schema/point";
import {
  checkRole,
  getCurrentUserRoleRow,
  getUser,
  requireAuth,
} from "@/lib/auth/session";
import {
  dailyActivityDecisionSchema,
  dailyActivityEntrySchema,
  monthlyPerformanceGenerationSchema,
} from "@/lib/validations/point";
import { calculateMonthlyPointPerformance } from "@/server/point-engine/calculate-monthly-point-performance";
import { countTargetDaysForPeriod } from "@/server/point-engine/count-target-days-for-period";
import {
  getActivePointCatalogVersion,
  getPointCatalogEntriesByVersion,
} from "@/server/services/point-catalog-service";
import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

const PERFORMANCE_ACTIVITY_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV"];
const PERFORMANCE_SELF_SERVICE_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL"];
const PERFORMANCE_GENERATE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
const APPROVABLE_STATUSES = ["DIAJUKAN", "DIAJUKAN_ULANG"] as const;
const MUTABLE_ACTIVITY_STATUSES = ["DRAFT", "DITOLAK_SPV", "REVISI_TW"] as const;

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function ensurePerformanceReadRole(role: UserRole) {
  return ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"].includes(role);
}

async function getScopedTeamworkEmployees(role: UserRole, divisionId: string | null) {
  if (role === "SPV" && divisionId) {
    return db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        fullName: employees.fullName,
        divisionId: employees.divisionId,
        divisionName: divisions.name,
        employeeGroup: employees.employeeGroup,
        employmentStatus: employees.employmentStatus,
        isActive: employees.isActive,
      })
      .from(employees)
      .leftJoin(divisions, eq(employees.divisionId, divisions.id))
      .where(
        and(
          eq(employees.employeeGroup, "TEAMWORK"),
          eq(employees.isActive, true),
          eq(employees.divisionId, divisionId)
        )
      )
      .orderBy(asc(employees.fullName));
  }

  return db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      divisionId: employees.divisionId,
      divisionName: divisions.name,
      employeeGroup: employees.employeeGroup,
      employmentStatus: employees.employmentStatus,
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(and(eq(employees.employeeGroup, "TEAMWORK"), eq(employees.isActive, true)))
    .orderBy(asc(employees.fullName));
}

async function getScopedActivityEntries(role: UserRole, divisionId: string | null, employeeId?: string | null) {
  const entryDivision = aliasedTable(divisions, "entry_division");
  const employeeDivision = aliasedTable(divisions, "employee_division");

  const baseQuery = db
    .select({
      id: dailyActivityEntries.id,
      employeeId: dailyActivityEntries.employeeId,
      pointCatalogEntryId: dailyActivityEntries.pointCatalogEntryId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      employeeDivisionId: employees.divisionId,
      employeeDivisionName: employeeDivision.name,
      workDate: dailyActivityEntries.workDate,
      actualDivisionId: dailyActivityEntries.actualDivisionId,
      actualDivisionName: entryDivision.name,
      workNameSnapshot: dailyActivityEntries.workNameSnapshot,
      pointCatalogDivisionName: dailyActivityEntries.pointCatalogDivisionName,
      pointValueSnapshot: dailyActivityEntries.pointValueSnapshot,
      quantity: dailyActivityEntries.quantity,
      totalPoints: dailyActivityEntries.totalPoints,
      status: dailyActivityEntries.status,
      notes: dailyActivityEntries.notes,
      submittedAt: dailyActivityEntries.submittedAt,
      approvedAt: dailyActivityEntries.approvedAt,
      rejectedAt: dailyActivityEntries.rejectedAt,
      createdAt: dailyActivityEntries.createdAt,
    })
    .from(dailyActivityEntries)
    .leftJoin(employees, eq(dailyActivityEntries.employeeId, employees.id))
    .leftJoin(entryDivision, eq(dailyActivityEntries.actualDivisionId, entryDivision.id))
    .leftJoin(employeeDivision, eq(employees.divisionId, employeeDivision.id));

  if (role === "SPV" && divisionId) {
    return baseQuery
      .where(eq(employees.divisionId, divisionId))
      .orderBy(desc(dailyActivityEntries.workDate), desc(dailyActivityEntries.createdAt));
  }

  if (PERFORMANCE_SELF_SERVICE_ROLES.includes(role) && employeeId) {
    return baseQuery
      .where(eq(dailyActivityEntries.employeeId, employeeId))
      .orderBy(desc(dailyActivityEntries.workDate), desc(dailyActivityEntries.createdAt));
  }

  return baseQuery.orderBy(desc(dailyActivityEntries.workDate), desc(dailyActivityEntries.createdAt));
}

async function getScopedMonthlyPerformance(role: UserRole, divisionId: string | null, employeeId?: string | null) {
  const employeeDivision = aliasedTable(divisions, "employee_division");
  const baseQuery = db
    .select({
      id: monthlyPointPerformances.id,
      employeeId: monthlyPointPerformances.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      employeeDivisionId: employees.divisionId,
      employeeDivisionName: employeeDivision.name,
      periodStartDate: monthlyPointPerformances.periodStartDate,
      periodEndDate: monthlyPointPerformances.periodEndDate,
      divisionSnapshotName: monthlyPointPerformances.divisionSnapshotName,
      targetDailyPoints: monthlyPointPerformances.targetDailyPoints,
      targetDays: monthlyPointPerformances.targetDays,
      totalTargetPoints: monthlyPointPerformances.totalTargetPoints,
      totalApprovedPoints: monthlyPointPerformances.totalApprovedPoints,
      performancePercent: monthlyPointPerformances.performancePercent,
      status: monthlyPointPerformances.status,
      calculatedAt: monthlyPointPerformances.calculatedAt,
    })
    .from(monthlyPointPerformances)
    .leftJoin(employees, eq(monthlyPointPerformances.employeeId, employees.id))
    .leftJoin(employeeDivision, eq(employees.divisionId, employeeDivision.id));

  if (role === "SPV" && divisionId) {
    return baseQuery
      .where(eq(employees.divisionId, divisionId))
      .orderBy(desc(monthlyPointPerformances.periodStartDate), asc(employees.fullName));
  }

  if (PERFORMANCE_SELF_SERVICE_ROLES.includes(role) && employeeId) {
    return baseQuery
      .where(eq(monthlyPointPerformances.employeeId, employeeId))
      .orderBy(desc(monthlyPointPerformances.periodStartDate), asc(employees.fullName));
  }

  return baseQuery.orderBy(desc(monthlyPointPerformances.periodStartDate), asc(employees.fullName));
}

async function assertActivityScope(role: UserRole, divisionId: string | null, employeeId: string) {
  if (role !== "SPV") return true;
  if (!divisionId) return false;

  const [employeeRow] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return employeeRow?.divisionId === divisionId;
}

async function resolveDivisionSnapshotForPeriod(employeeId: string, periodStartDate: Date) {
  const divisionAlias = aliasedTable(divisions, "snapshot_division");
  const [historyRow] = await db
    .select({
      divisionId: employeeDivisionHistories.newDivisionId,
      divisionName: divisionAlias.name,
    })
    .from(employeeDivisionHistories)
    .leftJoin(divisionAlias, eq(employeeDivisionHistories.newDivisionId, divisionAlias.id))
    .where(
      and(
        eq(employeeDivisionHistories.employeeId, employeeId),
        lte(employeeDivisionHistories.effectiveDate, periodStartDate)
      )
    )
    .orderBy(desc(employeeDivisionHistories.effectiveDate))
    .limit(1);

  if (historyRow) {
    return {
      divisionSnapshotId: historyRow.divisionId,
      divisionSnapshotName: historyRow.divisionName ?? "UNKNOWN",
    };
  }

  const [employeeRow] = await db
    .select({
      divisionId: employees.divisionId,
      divisionName: divisions.name,
    })
    .from(employees)
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(eq(employees.id, employeeId))
    .limit(1);

  return {
    divisionSnapshotId: employeeRow?.divisionId ?? null,
    divisionSnapshotName: employeeRow?.divisionName ?? "UNKNOWN",
  };
}

async function resolveTargetDaysForPeriod(employeeId: string, periodStartDate: Date, periodEndDate: Date) {
  const assignmentRows = await db
    .select({
      effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
      effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
      scheduleId: employeeScheduleAssignments.scheduleId,
    })
    .from(employeeScheduleAssignments)
    .where(
      and(
        eq(employeeScheduleAssignments.employeeId, employeeId),
        lte(employeeScheduleAssignments.effectiveStartDate, periodEndDate),
        or(
          gte(employeeScheduleAssignments.effectiveEndDate, periodStartDate),
          eq(employeeScheduleAssignments.effectiveEndDate, null as unknown as Date)
        )
      )
    )
    .orderBy(asc(employeeScheduleAssignments.effectiveStartDate));

  if (!assignmentRows.length) {
    return 0;
  }

  const scheduleIds = [...new Set(assignmentRows.map((row) => row.scheduleId))];
  const scheduleDayRows = await db
    .select({
      scheduleId: workScheduleDays.scheduleId,
      dayOfWeek: workScheduleDays.dayOfWeek,
      isWorkingDay: workScheduleDays.isWorkingDay,
    })
    .from(workScheduleDays)
    .where(inArray(workScheduleDays.scheduleId, scheduleIds));

  const workingDayMap = new Map<string, number[]>();
  for (const row of scheduleDayRows) {
    if (!row.isWorkingDay) continue;
    const current = workingDayMap.get(row.scheduleId) ?? [];
    current.push(row.dayOfWeek);
    workingDayMap.set(row.scheduleId, current);
  }

  return countTargetDaysForPeriod({
    periodStartDate,
    periodEndDate,
    assignments: assignmentRows.map((row) => ({
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
      workingDays: workingDayMap.get(row.scheduleId) ?? [],
    })),
  });
}

export async function getPerformanceWorkspace() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!ensurePerformanceReadRole(role)) {
    return {
      role,
      canManageActivities: false,
      canGenerateMonthly: false,
      activeVersion: null,
      employeeOptions: [],
      divisionOptions: [],
      catalogEntries: [],
      activityEntries: [],
      monthlyPerformances: [],
    };
  }

  const isSelfService = PERFORMANCE_SELF_SERVICE_ROLES.includes(role);

  // TEAMWORK tanpa employeeId tidak bisa melihat apapun
  if (isSelfService && !roleRow.employeeId) {
    return {
      role,
      canManageActivities: false,
      canGenerateMonthly: false,
      activeVersion: null,
      employeeOptions: [],
      divisionOptions: [],
      catalogEntries: [],
      activityEntries: [],
      monthlyPerformances: [],
    };
  }

  const activeVersion = await getActivePointCatalogVersion();
  const [employeeOptions, divisionOptions, activityEntries, monthlyPerformances, catalogEntries] =
    await Promise.all([
      // TEAMWORK tidak butuh dropdown karyawan lain — hanya diri sendiri
      isSelfService
        ? Promise.resolve([])
        : getScopedTeamworkEmployees(role, roleRow.divisionId ?? null),
      // TEAMWORK ambil divisi aktual dari data employee mereka sendiri
      isSelfService
        ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.isActive, true)).orderBy(asc(divisions.name))
        : role === "SPV" && roleRow.divisionId
          ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.id, roleRow.divisionId))
          : db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.isActive, true)).orderBy(asc(divisions.name)),
      getScopedActivityEntries(role, roleRow.divisionId ?? null, roleRow.employeeId),
      getScopedMonthlyPerformance(role, roleRow.divisionId ?? null, roleRow.employeeId),
      activeVersion ? getPointCatalogEntriesByVersion(activeVersion.id) : Promise.resolve([]),
    ]);

  return {
    role,
    canManageActivities: PERFORMANCE_ACTIVITY_ROLES.includes(role),
    canGenerateMonthly: PERFORMANCE_GENERATE_ROLES.includes(role),
    activeVersion,
    employeeOptions,
    divisionOptions,
    catalogEntries,
    activityEntries,
    monthlyPerformances,
  };
}

export async function saveDailyActivityEntry(input: unknown) {
  const authError = await checkRole([...PERFORMANCE_ACTIVITY_ROLES, ...PERFORMANCE_SELF_SERVICE_ROLES]);
  if (authError) return authError;

  const parsed = dailyActivityEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input aktivitas tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  // TEAMWORK/MANAGERIAL hanya boleh input untuk diri sendiri
  if (PERFORMANCE_SELF_SERVICE_ROLES.includes(role)) {
    if (!roleRow.employeeId) return { error: "Akun Anda belum terhubung ke data karyawan. Hubungi HRD." };
    parsed.data.employeeId = roleRow.employeeId;
  }

  const inScope = await assertActivityScope(role, roleRow.divisionId ?? null, parsed.data.employeeId);
  if (!inScope) {
    return { error: "Akses ditolak untuk karyawan di luar scope divisi Anda." };
  }

  const activeVersion = await getActivePointCatalogVersion();
  if (!activeVersion) {
    return { error: "Belum ada versi katalog poin aktif." };
  }

  const [catalogEntry, actualDivision] = await Promise.all([
    db
      .select()
      .from(pointCatalogEntries)
      .where(
        and(
          eq(pointCatalogEntries.id, parsed.data.pointCatalogEntryId),
          eq(pointCatalogEntries.versionId, activeVersion.id),
          eq(pointCatalogEntries.isActive, true)
        )
      )
      .limit(1),
    db
      .select({ id: divisions.id, name: divisions.name })
      .from(divisions)
      .where(eq(divisions.id, parsed.data.actualDivisionId))
      .limit(1),
  ]);

  const entry = catalogEntry[0];
  const division = actualDivision[0];
  if (!entry || !division) {
    return { error: "Pekerjaan poin atau divisi aktual tidak ditemukan." };
  }
  if (entry.divisionName.toUpperCase() !== division.name.toUpperCase()) {
    return { error: "Pekerjaan poin harus sesuai dengan divisi aktual harian." };
  }

  const pointValue = toNumber(entry.pointValue);
  const totalPoints = Number((pointValue * parsed.data.quantity).toFixed(2));
  const values = {
    employeeId: parsed.data.employeeId,
    workDate: parsed.data.workDate,
    actualDivisionId: parsed.data.actualDivisionId,
    pointCatalogEntryId: entry.id,
    pointCatalogVersionId: activeVersion.id,
    pointCatalogDivisionName: entry.divisionName,
    workNameSnapshot: entry.workName,
    unitDescriptionSnapshot: entry.unitDescription,
    pointValueSnapshot: pointValue.toFixed(2),
    quantity: parsed.data.quantity.toFixed(2),
    totalPoints: totalPoints.toFixed(2),
    notes: parsed.data.notes,
    updatedByUserId: user?.id ?? null,
  };

  try {
    if (parsed.data.id) {
      const [existingEntry] = await db
        .select()
        .from(dailyActivityEntries)
        .where(eq(dailyActivityEntries.id, parsed.data.id))
        .limit(1);

      if (!existingEntry) return { error: "Aktivitas tidak ditemukan." };
      if (!MUTABLE_ACTIVITY_STATUSES.includes(existingEntry.status as (typeof MUTABLE_ACTIVITY_STATUSES)[number])) {
        return { error: "Aktivitas yang sudah diajukan atau disetujui tidak bisa diedit." };
      }

      await db
        .update(dailyActivityEntries)
        .set({
          ...values,
          status: existingEntry.status === "DRAFT" ? "DRAFT" : "REVISI_TW",
          updatedAt: new Date(),
        })
        .where(eq(dailyActivityEntries.id, parsed.data.id));
    } else {
      await db.insert(dailyActivityEntries).values({
        ...values,
        createdByUserId: user?.id ?? parsed.data.employeeId,
        status: "DRAFT",
      });
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23503") return { error: "Relasi aktivitas tidak valid." };
    throw error;
  }

  revalidatePath("/performance");
  return { success: true };
}

export async function submitDailyActivityEntry(input: unknown) {
  const authError = await checkRole([...PERFORMANCE_ACTIVITY_ROLES, ...PERFORMANCE_SELF_SERVICE_ROLES]);
  if (authError) return authError;

  const parsed = dailyActivityDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Aktivitas tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const [existingEntry] = await db
    .select()
    .from(dailyActivityEntries)
    .where(eq(dailyActivityEntries.id, parsed.data.activityEntryId))
    .limit(1);

  if (!existingEntry) return { error: "Aktivitas tidak ditemukan." };

  // TEAMWORK hanya boleh submit entry milik sendiri
  if (PERFORMANCE_SELF_SERVICE_ROLES.includes(role)) {
    if (!roleRow.employeeId || existingEntry.employeeId !== roleRow.employeeId) {
      return { error: "Anda hanya dapat mengajukan aktivitas milik sendiri." };
    }
  } else {
    const inScope = await assertActivityScope(role, roleRow.divisionId ?? null, existingEntry.employeeId);
    if (!inScope) return { error: "Akses ditolak untuk aktivitas di luar scope divisi Anda." };
  }

  if (!MUTABLE_ACTIVITY_STATUSES.includes(existingEntry.status as (typeof MUTABLE_ACTIVITY_STATUSES)[number])) {
    return { error: "Aktivitas tidak berada pada status yang dapat diajukan." };
  }

  const nextStatus = existingEntry.status === "DRAFT" ? "DIAJUKAN" : "DIAJUKAN_ULANG";
  const logAction = existingEntry.status === "DRAFT" ? "SUBMIT" : "RESUBMIT";

  await db.transaction(async (tx) => {
    await tx
      .update(dailyActivityEntries)
      .set({
        status: nextStatus,
        submittedAt: new Date(),
        updatedByUserId: user?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(dailyActivityEntries.id, parsed.data.activityEntryId));

    await tx.insert(dailyActivityApprovalLogs).values({
      activityEntryId: parsed.data.activityEntryId,
      action: logAction,
      actorUserId: user?.id ?? existingEntry.employeeId,
      actorRole: role,
      notes: parsed.data.notes,
    });
  });

  revalidatePath("/performance");
  return { success: true };
}

export async function approveDailyActivityEntry(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "SPV"]);
  if (authError) return authError;

  const parsed = dailyActivityDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Aktivitas tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const [existingEntry] = await db
    .select()
    .from(dailyActivityEntries)
    .where(eq(dailyActivityEntries.id, parsed.data.activityEntryId))
    .limit(1);

  if (!existingEntry) return { error: "Aktivitas tidak ditemukan." };
  if (!APPROVABLE_STATUSES.includes(existingEntry.status as (typeof APPROVABLE_STATUSES)[number])) {
    return { error: "Aktivitas tidak berada pada status yang dapat disetujui." };
  }
  const inScope = await assertActivityScope(role, roleRow.divisionId ?? null, existingEntry.employeeId);
  if (!inScope) return { error: "Akses ditolak untuk aktivitas di luar scope divisi Anda." };

  const nextStatus = role === "SPV" ? "DISETUJUI_SPV" : "OVERRIDE_HRD";
  const logAction = role === "SPV" ? "APPROVE_SPV" : "OVERRIDE_HRD";

  await db.transaction(async (tx) => {
    await tx
      .update(dailyActivityEntries)
      .set({
        status: nextStatus,
        approvedAt: new Date(),
        updatedByUserId: user?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(dailyActivityEntries.id, parsed.data.activityEntryId));

    await tx.insert(dailyActivityApprovalLogs).values({
      activityEntryId: parsed.data.activityEntryId,
      action: logAction,
      actorUserId: user?.id ?? existingEntry.employeeId,
      actorRole: role,
      notes: parsed.data.notes,
    });
  });

  revalidatePath("/performance");
  return { success: true };
}

export async function rejectDailyActivityEntry(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "SPV"]);
  if (authError) return authError;

  const parsed = dailyActivityDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Aktivitas tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const [existingEntry] = await db
    .select()
    .from(dailyActivityEntries)
    .where(eq(dailyActivityEntries.id, parsed.data.activityEntryId))
    .limit(1);

  if (!existingEntry) return { error: "Aktivitas tidak ditemukan." };
  if (!APPROVABLE_STATUSES.includes(existingEntry.status as (typeof APPROVABLE_STATUSES)[number])) {
    return { error: "Aktivitas tidak berada pada status yang dapat ditolak." };
  }
  const inScope = await assertActivityScope(role, roleRow.divisionId ?? null, existingEntry.employeeId);
  if (!inScope) return { error: "Akses ditolak untuk aktivitas di luar scope divisi Anda." };

  await db.transaction(async (tx) => {
    await tx
      .update(dailyActivityEntries)
      .set({
        status: "DITOLAK_SPV",
        rejectedAt: new Date(),
        updatedByUserId: user?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(dailyActivityEntries.id, parsed.data.activityEntryId));

    await tx.insert(dailyActivityApprovalLogs).values({
      activityEntryId: parsed.data.activityEntryId,
      action: "REJECT_SPV",
      actorUserId: user?.id ?? existingEntry.employeeId,
      actorRole: role,
      notes: parsed.data.notes,
    });
  });

  revalidatePath("/performance");
  return { success: true };
}

export async function generateMonthlyPerformance(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return authError;

  const parsed = monthlyPerformanceGenerationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input periode tidak valid." };
  }

  const targetEmployees = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      employeeCode: employees.employeeCode,
    })
    .from(employees)
    .where(and(eq(employees.employeeGroup, "TEAMWORK"), eq(employees.isActive, true)))
    .orderBy(asc(employees.fullName));

  const periodStartDate = parsed.data.periodStartDate;
  const periodEndDate = parsed.data.periodEndDate;

  const activities = await db
    .select({
      employeeId: dailyActivityEntries.employeeId,
      totalPoints: dailyActivityEntries.totalPoints,
      status: dailyActivityEntries.status,
    })
    .from(dailyActivityEntries)
    .where(
      and(
        inArray(dailyActivityEntries.employeeId, targetEmployees.map((employee) => employee.id)),
        gte(dailyActivityEntries.workDate, periodStartDate),
        lte(dailyActivityEntries.workDate, periodEndDate)
      )
    );

  const summaryByEmployee = new Map<string, number>();
  for (const activity of activities) {
    if (!["DISETUJUI_SPV", "OVERRIDE_HRD", "DIKUNCI_PAYROLL"].includes(activity.status)) {
      continue;
    }
    const current = summaryByEmployee.get(activity.employeeId) ?? 0;
    summaryByEmployee.set(activity.employeeId, current + toNumber(activity.totalPoints));
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(monthlyPointPerformances)
      .where(
        and(
          eq(monthlyPointPerformances.periodStartDate, periodStartDate),
          eq(monthlyPointPerformances.periodEndDate, periodEndDate)
        )
      );

    for (const employee of targetEmployees) {
      const divisionSnapshot = await resolveDivisionSnapshotForPeriod(employee.id, periodStartDate);
      const targetDays = await resolveTargetDaysForPeriod(employee.id, periodStartDate, periodEndDate);
      const totalApprovedPoints = Number((summaryByEmployee.get(employee.id) ?? 0).toFixed(2));
      const calculated = calculateMonthlyPointPerformance({
        divisionName: divisionSnapshot.divisionSnapshotName,
        targetDays,
        totalApprovedPoints,
      });

      await tx.insert(monthlyPointPerformances).values({
        employeeId: employee.id,
        periodStartDate,
        periodEndDate,
        divisionSnapshotId: divisionSnapshot.divisionSnapshotId,
        divisionSnapshotName: divisionSnapshot.divisionSnapshotName,
        targetDailyPoints: calculated.targetDailyPoints,
        targetDays: calculated.targetDays,
        totalTargetPoints: calculated.totalTargetPoints,
        totalApprovedPoints: calculated.totalApprovedPoints.toFixed(2),
        performancePercent: calculated.performancePercent.toFixed(2),
        status: "FINALIZED",
      });
    }
  });

  revalidatePath("/performance");
  return { success: true, generatedEmployees: targetEmployees.length };
}

export async function deleteActivityEntry(activityEntryId: string) {
  const authError = await checkRole([...PERFORMANCE_ACTIVITY_ROLES, ...PERFORMANCE_SELF_SERVICE_ROLES]);
  if (authError) return authError;

  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const [existingEntry] = await db
    .select()
    .from(dailyActivityEntries)
    .where(eq(dailyActivityEntries.id, activityEntryId))
    .limit(1);

  if (!existingEntry) return { error: "Aktivitas tidak ditemukan." };
  if (existingEntry.status !== "DRAFT") {
    return { error: "Hanya aktivitas berstatus DRAFT yang dapat dihapus." };
  }

  if (PERFORMANCE_SELF_SERVICE_ROLES.includes(role)) {
    if (!roleRow.employeeId || existingEntry.employeeId !== roleRow.employeeId) {
      return { error: "Anda hanya dapat menghapus aktivitas milik sendiri." };
    }
  } else {
    const inScope = await assertActivityScope(role, roleRow.divisionId ?? null, existingEntry.employeeId);
    if (!inScope) return { error: "Akses ditolak untuk aktivitas di luar scope divisi Anda." };
  }

  await db.delete(dailyActivityEntries).where(eq(dailyActivityEntries.id, activityEntryId));

  revalidatePath("/performance");
  return { success: true };
}
