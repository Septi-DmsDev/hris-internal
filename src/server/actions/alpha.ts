"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, lte, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getCurrentUserRoleRow, getUser, requireAuth, checkRole } from "@/lib/auth/session";
import { employeeScheduleAssignments, employees, workScheduleDays, workSchedules } from "@/lib/db/schema/employee";
import { attendanceAlphaEvents, attendanceTickets, employeeAlerts, employeeAttendanceRecords, incidentLogs } from "@/lib/db/schema/hr";
import { divisions } from "@/lib/db/schema/master";
import { alphaActionSchema } from "@/lib/validations/hr";
import type { UserRole } from "@/types";

const ALPHA_MANAGE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTargetDate(targetDate?: string): Date {
  if (!targetDate) return new Date();
  const d = new Date(targetDate);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function getJakartaTimeHHmm(now = new Date()): string {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return hhmm;
}

function isApprovedPermissionStatus(status: string): boolean {
  return ["APPROVED_HRD", "AUTO_APPROVED", "APPROVED_SPV"].includes(status);
}

export async function detectAlphaAbsences(targetDateInput?: string) {
  const authError = await checkRole(ALPHA_MANAGE_ROLES);
  if (authError) return authError;

  const targetDate = parseTargetDate(targetDateInput);
  const targetYmd = toYmd(targetDate);
  const dayOfWeek = targetDate.getDay();
  const nowHHmm = getJakartaTimeHHmm();

  const assignmentRows = await db
    .select({
      employeeId: employees.id,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      scheduleId: employeeScheduleAssignments.scheduleId,
      scheduleName: workSchedules.name,
      endTime: workScheduleDays.endTime,
      dayStatus: workScheduleDays.dayStatus,
      isWorkingDay: workScheduleDays.isWorkingDay,
    })
    .from(employees)
    .innerJoin(employeeScheduleAssignments, eq(employeeScheduleAssignments.employeeId, employees.id))
    .innerJoin(workSchedules, eq(employeeScheduleAssignments.scheduleId, workSchedules.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(
      workScheduleDays,
      and(
        eq(workScheduleDays.scheduleId, workSchedules.id),
        eq(workScheduleDays.dayOfWeek, dayOfWeek)
      )
    )
    .where(
      and(
        eq(employees.isActive, true),
        eq(employees.employeeGroup, "TEAMWORK"),
        lte(employeeScheduleAssignments.effectiveStartDate, targetDate),
        sql`${employeeScheduleAssignments.effectiveEndDate} is null or ${employeeScheduleAssignments.effectiveEndDate} >= ${targetDate}`
      )
    )
    .orderBy(asc(employees.fullName));

  const attendanceRows = await db
    .select({ employeeId: employeeAttendanceRecords.employeeId, attendanceStatus: employeeAttendanceRecords.attendanceStatus })
    .from(employeeAttendanceRecords)
    .where(eq(employeeAttendanceRecords.attendanceDate, targetDate));

  const approvedTicketRows = await db
    .select({ employeeId: attendanceTickets.employeeId, status: attendanceTickets.status })
    .from(attendanceTickets)
    .where(
      and(
        inArray(attendanceTickets.status, ["APPROVED_HRD", "AUTO_APPROVED", "APPROVED_SPV"] as const),
        lte(attendanceTickets.startDate, targetDate),
        gte(attendanceTickets.endDate, targetDate)
      )
    );

  const attendanceMap = new Map<string, string>();
  for (const row of attendanceRows) attendanceMap.set(row.employeeId, row.attendanceStatus);

  const ticketSet = new Set<string>();
  for (const row of approvedTicketRows) {
    if (isApprovedPermissionStatus(row.status)) ticketSet.add(row.employeeId);
  }

  let created = 0;
  let skippedBeforeShiftEnd = 0;
  let skippedHasAttendanceOrTicket = 0;

  for (const row of assignmentRows) {
    const isWorkDay = row.isWorkingDay && row.dayStatus === "KERJA";
    if (!isWorkDay || !row.endTime) continue;
    if (targetYmd === toYmd(new Date()) && nowHHmm < row.endTime) {
      skippedBeforeShiftEnd += 1;
      continue;
    }

    const attendanceStatus = attendanceMap.get(row.employeeId);
    if (attendanceStatus === "HADIR" || ticketSet.has(row.employeeId)) {
      skippedHasAttendanceOrTicket += 1;
      continue;
    }

    const [existing] = await db
      .select({ id: attendanceAlphaEvents.id })
      .from(attendanceAlphaEvents)
      .where(and(eq(attendanceAlphaEvents.employeeId, row.employeeId), eq(attendanceAlphaEvents.alphaDate, targetDate)))
      .limit(1);

    if (existing) continue;

    const [lastAlpha] = await db
      .select({ alphaCount: attendanceAlphaEvents.alphaCount })
      .from(attendanceAlphaEvents)
      .where(eq(attendanceAlphaEvents.employeeId, row.employeeId))
      .orderBy(desc(attendanceAlphaEvents.alphaDate))
      .limit(1);

    await db.insert(attendanceAlphaEvents).values({
      employeeId: row.employeeId,
      alphaDate: targetDate,
      alphaCount: (lastAlpha?.alphaCount ?? 0) + 1,
      status: "PENDING",
      notes: "Auto-detected: tidak ada ceklok HADIR dan tidak ada izin disetujui.",
    });
    created += 1;
  }

  revalidatePath("/dashboard");
  revalidatePath("/ticketingapproval");

  return {
    success: true,
    created,
    skippedBeforeShiftEnd,
    skippedHasAttendanceOrTicket,
    date: targetYmd,
  };
}

export async function getAlphaMonitoringWorkspace() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  if (!["SUPER_ADMIN", "HRD", "SPV", "KABAG"].includes(role)) {
    return { role, alphaEvents: [], pendingCount: 0 };
  }

  const rows = await db
    .select({
      id: attendanceAlphaEvents.id,
      employeeId: attendanceAlphaEvents.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: divisions.name,
      alphaDate: attendanceAlphaEvents.alphaDate,
      alphaCount: attendanceAlphaEvents.alphaCount,
      status: attendanceAlphaEvents.status,
      callSentAt: attendanceAlphaEvents.callSentAt,
      sp1IssuedAt: attendanceAlphaEvents.sp1IssuedAt,
      notes: attendanceAlphaEvents.notes,
      createdAt: attendanceAlphaEvents.createdAt,
    })
    .from(attendanceAlphaEvents)
    .innerJoin(employees, eq(attendanceAlphaEvents.employeeId, employees.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .where(eq(employees.isActive, true))
    .orderBy(desc(attendanceAlphaEvents.alphaDate), desc(attendanceAlphaEvents.createdAt));

  return {
    role,
    alphaEvents: rows,
    pendingCount: rows.filter((r) => r.status !== "SP1_ISSUED").length,
  };
}

export async function sendAlphaCall(input: unknown) {
  const authError = await checkRole(ALPHA_MANAGE_ROLES);
  if (authError) return authError;

  const parsed = alphaActionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  const user = await getUser();
  const [event] = await db
    .select()
    .from(attendanceAlphaEvents)
    .where(eq(attendanceAlphaEvents.id, parsed.data.alphaEventId))
    .limit(1);

  if (!event) return { error: "Event ALPHA tidak ditemukan." };

  await db.transaction(async (tx) => {
    await tx
      .update(attendanceAlphaEvents)
      .set({
        status: "CALL_SENT",
        callSentAt: new Date(),
        callSentByUserId: user?.id ?? null,
        notes: parsed.data.notes ?? event.notes,
        updatedAt: new Date(),
      })
      .where(eq(attendanceAlphaEvents.id, event.id));

    await tx.insert(employeeAlerts).values({
      employeeId: event.employeeId,
      alertType: "ALPHA_CALL",
      title: "Pemanggilan HRD - ALPHA",
      message: `Anda tercatat ALPHA (${event.alphaCount}x) pada ${toYmd(event.alphaDate)}. Silakan konfirmasi ke HRD.`,
      refDate: event.alphaDate,
      sourceRefId: event.id,
      sentByUserId: user?.id ?? null,
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/ticketingapproval");
  return { success: true };
}

export async function issueAlphaSp1(input: unknown) {
  const authError = await checkRole(ALPHA_MANAGE_ROLES);
  if (authError) return authError;

  const parsed = alphaActionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };

  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const user = await getUser();

  const [event] = await db
    .select({
      id: attendanceAlphaEvents.id,
      employeeId: attendanceAlphaEvents.employeeId,
      alphaCount: attendanceAlphaEvents.alphaCount,
      alphaDate: attendanceAlphaEvents.alphaDate,
      status: attendanceAlphaEvents.status,
    })
    .from(attendanceAlphaEvents)
    .where(eq(attendanceAlphaEvents.id, parsed.data.alphaEventId))
    .limit(1);

  if (!event) return { error: "Event ALPHA tidak ditemukan." };
  if (event.alphaCount < 2) return { error: "SP1 hanya bisa diberikan untuk ALPHA minimal 2x." };

  await db.transaction(async (tx) => {
    await tx
      .update(attendanceAlphaEvents)
      .set({
        status: "SP1_ISSUED",
        sp1IssuedAt: new Date(),
        sp1IssuedByUserId: user?.id ?? null,
        notes: parsed.data.notes ?? "SP1 karena ALPHA >= 2x",
        updatedAt: new Date(),
      })
      .where(eq(attendanceAlphaEvents.id, event.id));

    await tx.insert(incidentLogs).values({
      employeeId: event.employeeId,
      incidentType: "SP1",
      incidentDate: event.alphaDate,
      description: `SP1 otomatis dari monitoring ALPHA (${event.alphaCount}x).`,
      impact: "REVIEW_ONLY",
      recordedByUserId: user?.id ?? roleRow.userId,
      recordedByRole: role,
      notes: parsed.data.notes ?? "Keputusan SP1 dari antrian ALPHA.",
    });

    await tx.insert(employeeAlerts).values({
      employeeId: event.employeeId,
      alertType: "ALPHA_SP1",
      title: "Keputusan HRD - SP1",
      message: `Anda menerima SP1 karena ALPHA ${event.alphaCount}x. Silakan temui HRD untuk tindak lanjut.`,
      refDate: event.alphaDate,
      sourceRefId: event.id,
      sentByUserId: user?.id ?? null,
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/ticketingapproval");
  revalidatePath("/employees");
  return { success: true };
}
