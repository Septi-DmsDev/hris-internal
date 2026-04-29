# Role System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the new `KABAG` role and `user_role_divisions` junction table into the application layer so all division scoping uses `divisionIds[]` instead of the deprecated `divisionId` scalar, and ticket approval authority is corrected to HRD-only.

**Architecture:** The foundation change is in `session.ts` — `getCurrentUserRoleRow()` now returns `divisionIds: string[]` fetched from the junction table. Every server action and page that previously checked `roleRow.divisionId` is updated to use `inArray(employees.divisionId, roleRow.divisionIds)` and a `isDivScoped` boolean guard. KABAG is added to all role arrays that currently include SPV for division-scoped reads; SPV is removed from ticket approver arrays.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM (PostgreSQL), TypeScript, Zod, server actions (`"use server"`)

---

## File Map

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `"KABAG"` to `USER_ROLES` |
| `src/lib/auth/session.ts` | Return `divisionIds[]` from junction table; drop scalar `divisionId` |
| `src/server/actions/tickets.ts` | Remove SPV from APPROVER_ROLES; add KABAG to role lists; use `divisionIds` |
| `src/server/actions/reviews.ts` | Add KABAG; use `divisionIds` + `inArray` |
| `src/server/actions/performance.ts` | Add KABAG to 4 scoping functions + role arrays; use `divisionIds` |
| `src/server/actions/employees.ts` | Add KABAG to read roles; use `divisionIds` |
| `src/server/actions/dashboard.ts` | Replace `isSPV` with `isDivScoped`; use `divisionIds` |
| `src/server/actions/training.ts` | Use `divisionIds` + `inArray` |
| `src/app/(dashboard)/tickets/page.tsx` | Add KABAG; use `divisionIds` + `inArray` |
| `src/app/(dashboard)/reviews/page.tsx` | Add KABAG; use `divisionIds` + `inArray` |
| `src/app/(dashboard)/performance/PerformanceCatalogClient.tsx` | Add KABAG to approve-button visibility check |

---

## Task 1: Foundation — UserRole type + session divisionIds

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/auth/session.ts`

This task is the prerequisite for everything else. After it, TypeScript will flag every caller that still reads `roleRow.divisionId` — those are exactly the sites the remaining tasks fix.

- [ ] **Step 1: Add KABAG to USER_ROLES in types**

Replace the `USER_ROLES` array in `src/types/index.ts`:

```typescript
export const USER_ROLES = [
  "SUPER_ADMIN",
  "HRD",
  "KABAG",
  "SPV",
  "MANAGERIAL",
  "FINANCE",
  "TEAMWORK",
  "PAYROLL_VIEWER",
] as const;
```

- [ ] **Step 2: Update `getCurrentUserRoleRow()` to return `divisionIds[]`**

Replace the entire content of `src/lib/auth/session.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { userRoles, userRoleDivisions } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function checkRole(allowed: UserRole[]): Promise<{ error: string } | null> {
  const roleRow = await getCurrentUserRoleRow();
  if (!allowed.includes(roleRow.role as UserRole)) {
    return { error: "Akses ditolak. Hanya HRD dan Super Admin yang dapat melakukan tindakan ini." };
  }
  return null;
}

export async function getCurrentUserRoleRow() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [roleRow] = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      role: userRoles.role,
      employeeId: userRoles.employeeId,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  if (!roleRow) redirect("/login");

  const divisionRows = await db
    .select({ divisionId: userRoleDivisions.divisionId })
    .from(userRoleDivisions)
    .where(eq(userRoleDivisions.userRoleId, roleRow.id));

  return {
    ...roleRow,
    divisionIds: divisionRows.map((r) => r.divisionId),
  };
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const roleRow = await getCurrentUserRoleRow();
  return roleRow.role as UserRole;
}
```

- [ ] **Step 3: Verify TypeScript sees the breakage**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | head -60
```

Expected: many errors about `roleRow.divisionId` not existing — this is correct. Tasks 2–8 fix them all.

- [ ] **Step 4: Commit foundation**

```bash
git add src/types/index.ts src/lib/auth/session.ts
git commit -m "feat(auth): return divisionIds[] from junction table, add KABAG type"
```

---

## Task 2: Fix tickets.ts

**Files:**
- Modify: `src/server/actions/tickets.ts`

Key changes: SPV removed from `APPROVER_ROLES`; KABAG added to `SELF_SERVICE_TICKET_ROLES` and `TICKET_READ_ROLES`; all `roleRow.divisionId` → `roleRow.divisionIds`.

- [ ] **Step 1: Replace tickets.ts**

Write the complete file `src/server/actions/tickets.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { attendanceTickets, leaveQuotas } from "@/lib/db/schema/hr";
import { checkRole, getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { createTicketSchema, ticketDecisionSchema } from "@/lib/validations/hr";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";
import { divisions } from "@/lib/db/schema/master";

// HRD and SUPER_ADMIN decide. SPV and KABAG are notified only.
const APPROVER_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
// All non-SUPER_ADMIN roles are karyawan — they can submit their own tickets.
// HRD excluded because they may submit for others (no employeeId override).
const SELF_SERVICE_TICKET_ROLES: UserRole[] = ["KABAG", "SPV", "MANAGERIAL", "FINANCE", "TEAMWORK", "PAYROLL_VIEWER"];
const TICKET_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV", "TEAMWORK", "MANAGERIAL", "FINANCE", "PAYROLL_VIEWER"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];

function diffDays(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

async function getEmployeeLeaveQuota(employeeId: string, year: number) {
  const [quota] = await db
    .select()
    .from(leaveQuotas)
    .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.year, year)))
    .limit(1);
  return quota ?? null;
}

async function hasLeaveEligibility(employeeId: string) {
  const [emp] = await db
    .select({ startDate: employees.startDate })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp?.startDate) return false;
  const months = Math.floor(
    (Date.now() - new Date(emp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  return months >= 12;
}

async function getEmployeeDivisionId(employeeId: string) {
  const [row] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  return row?.divisionId ?? null;
}

export async function getTickets() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const user = await getUser();

  if (!TICKET_READ_ROLES.includes(role)) {
    return { role, tickets: [] };
  }

  const employeeDivision = divisions;
  const isDivScoped = DIV_SCOPED_ROLES.includes(role) && roleRow.divisionIds.length > 0;

  const baseQuery = db
    .select({
      id: attendanceTickets.id,
      employeeId: attendanceTickets.employeeId,
      employeeName: employees.fullName,
      employeeCode: employees.employeeCode,
      divisionName: employeeDivision.name,
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      endDate: attendanceTickets.endDate,
      daysCount: attendanceTickets.daysCount,
      reason: attendanceTickets.reason,
      status: attendanceTickets.status,
      payrollImpact: attendanceTickets.payrollImpact,
      reviewNotes: attendanceTickets.reviewNotes,
      rejectionReason: attendanceTickets.rejectionReason,
      createdAt: attendanceTickets.createdAt,
    })
    .from(attendanceTickets)
    .leftJoin(employees, eq(attendanceTickets.employeeId, employees.id))
    .leftJoin(employeeDivision, eq(employees.divisionId, employeeDivision.id));

  const rows = isDivScoped
    ? await baseQuery
        .where(inArray(employees.divisionId, roleRow.divisionIds))
        .orderBy(desc(attendanceTickets.createdAt))
    : SELF_SERVICE_TICKET_ROLES.includes(role) && user
      ? await baseQuery
          .where(eq(attendanceTickets.createdByUserId, user.id))
          .orderBy(desc(attendanceTickets.createdAt))
      : await baseQuery.orderBy(desc(attendanceTickets.createdAt));

  return { role, tickets: rows };
}

export async function createTicket(input: unknown) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "KABAG", "SPV", "TEAMWORK", "MANAGERIAL", "FINANCE", "PAYROLL_VIEWER"]);
  if (authError) return authError;

  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tiket tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (SELF_SERVICE_TICKET_ROLES.includes(role)) {
    if (!roleRow.employeeId) {
      return { error: "Akun Anda belum terhubung ke data karyawan. Hubungi HRD." };
    }
    parsed.data.employeeId = roleRow.employeeId;
  }

  if (DIV_SCOPED_ROLES.includes(role)) {
    if (roleRow.divisionIds.length === 0) {
      return { error: "Akun Anda belum terhubung ke divisi. Hubungi HRD." };
    }
    const employeeDivisionId = await getEmployeeDivisionId(parsed.data.employeeId);
    if (!employeeDivisionId || !roleRow.divisionIds.includes(employeeDivisionId)) {
      return { error: "Anda hanya boleh membuat tiket untuk karyawan di divisi Anda." };
    }
  }

  const { startDate, endDate } = parsed.data;
  const daysCount = diffDays(startDate, endDate);

  try {
    await db.insert(attendanceTickets).values({
      employeeId: parsed.data.employeeId,
      ticketType: parsed.data.ticketType,
      startDate,
      endDate,
      daysCount,
      reason: parsed.data.reason,
      attachmentUrl: parsed.data.attachmentUrl || null,
      status: "SUBMITTED",
      createdByUserId: user?.id ?? parsed.data.employeeId,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23503") return { error: "Karyawan tidak ditemukan." };
    throw e;
  }

  revalidatePath("/tickets");
  return { success: true };
}

export async function approveTicket(input: unknown) {
  const authError = await checkRole(APPROVER_ROLES);
  if (authError) return authError;

  const parsed = ticketDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const user = await getUser();

  const [ticket] = await db
    .select({
      id: attendanceTickets.id,
      employeeId: attendanceTickets.employeeId,
      ticketType: attendanceTickets.ticketType,
      startDate: attendanceTickets.startDate,
      status: attendanceTickets.status,
    })
    .from(attendanceTickets)
    .where(eq(attendanceTickets.id, parsed.data.ticketId))
    .limit(1);

  if (!ticket) return { error: "Tiket tidak ditemukan." };
  if (!["SUBMITTED", "NEED_REVIEW"].includes(ticket.status)) {
    return { error: "Tiket tidak dalam status yang dapat disetujui." };
  }

  await db.transaction(async (tx) => {
    let payrollImpact = parsed.data.payrollImpact ?? "UNPAID";

    if (!parsed.data.payrollImpact && ticket.ticketType !== "SETENGAH_HARI") {
      const year = new Date(ticket.startDate).getFullYear();
      const eligible = await hasLeaveEligibility(ticket.employeeId);

      if (eligible) {
        const quota = await getEmployeeLeaveQuota(ticket.employeeId, year);
        if (quota) {
          const [monthlyUpdated] = await tx
            .update(leaveQuotas)
            .set({
              monthlyQuotaUsed: sql`${leaveQuotas.monthlyQuotaUsed} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(leaveQuotas.id, quota.id),
                sql`${leaveQuotas.monthlyQuotaUsed} < ${leaveQuotas.monthlyQuotaTotal}`
              )
            )
            .returning({ id: leaveQuotas.id });

          if (monthlyUpdated) {
            payrollImpact = "PAID_QUOTA_MONTHLY";
          } else {
            const [annualUpdated] = await tx
              .update(leaveQuotas)
              .set({
                annualQuotaUsed: sql`${leaveQuotas.annualQuotaUsed} + 1`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(leaveQuotas.id, quota.id),
                  sql`${leaveQuotas.annualQuotaUsed} < ${leaveQuotas.annualQuotaTotal}`
                )
              )
              .returning({ id: leaveQuotas.id });

            if (annualUpdated) {
              payrollImpact = "PAID_QUOTA_ANNUAL";
            }
          }
        }
      }
    }

    await tx
      .update(attendanceTickets)
      .set({
        status: "APPROVED_HRD",
        payrollImpact,
        reviewNotes: parsed.data.notes,
        approvedByUserId: user?.id ?? null,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(attendanceTickets.id, parsed.data.ticketId));
  });

  revalidatePath("/tickets");
  return { success: true };
}

export async function rejectTicket(input: unknown) {
  const authError = await checkRole(APPROVER_ROLES);
  if (authError) return authError;

  const parsed = ticketDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  if (!parsed.data.rejectionReason?.trim()) {
    return { error: "Alasan penolakan wajib diisi." };
  }

  const user = await getUser();

  const [ticket] = await db
    .select({
      id: attendanceTickets.id,
      employeeId: attendanceTickets.employeeId,
      status: attendanceTickets.status,
    })
    .from(attendanceTickets)
    .where(eq(attendanceTickets.id, parsed.data.ticketId))
    .limit(1);

  if (!ticket) return { error: "Tiket tidak ditemukan." };
  if (!["SUBMITTED", "NEED_REVIEW"].includes(ticket.status)) {
    return { error: "Tiket tidak dalam status yang dapat ditolak." };
  }

  await db
    .update(attendanceTickets)
    .set({
      status: "REJECTED",
      rejectionReason: parsed.data.rejectionReason,
      rejectedByUserId: user?.id ?? null,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendanceTickets.id, parsed.data.ticketId));

  revalidatePath("/tickets");
  return { success: true };
}

export async function cancelTicket(ticketId: string) {
  const user = await getUser();
  if (!user) return { error: "Sesi tidak valid." };
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const [ticket] = await db
    .select()
    .from(attendanceTickets)
    .where(eq(attendanceTickets.id, ticketId))
    .limit(1);

  if (!ticket) return { error: "Tiket tidak ditemukan." };
  if (!["DRAFT", "SUBMITTED"].includes(ticket.status)) {
    return { error: "Tiket yang sudah diproses tidak bisa dibatalkan." };
  }
  if (ticket.createdByUserId !== user.id && !["SUPER_ADMIN", "HRD"].includes(role)) {
    return { error: "Hanya pembuat tiket atau HRD/Super Admin yang dapat membatalkan tiket ini." };
  }

  await db
    .update(attendanceTickets)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(attendanceTickets.id, ticketId));

  revalidatePath("/tickets");
  return { success: true };
}

export async function generateLeaveQuota(employeeId: string, year: number) {
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return authError;

  const eligible = await hasLeaveEligibility(employeeId);
  if (!eligible) return { error: "Karyawan belum memenuhi syarat kuota cuti (minimal 1 tahun kerja)." };

  const existing = await getEmployeeLeaveQuota(employeeId, year);
  if (existing) return { error: `Kuota cuti tahun ${year} sudah ada untuk karyawan ini.` };

  await db.insert(leaveQuotas).values({
    employeeId,
    year,
    monthlyQuotaTotal: 12,
    monthlyQuotaUsed: 0,
    annualQuotaTotal: 3,
    annualQuotaUsed: 0,
  });

  revalidatePath("/tickets");
  return { success: true };
}
```

- [ ] **Step 2: Check TypeScript for this file**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | grep "tickets"
```

Expected: no errors mentioning `tickets.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/tickets.ts
git commit -m "feat(tickets): remove SPV approver, add KABAG, use divisionIds[]"
```

---

## Task 3: Fix reviews.ts

**Files:**
- Modify: `src/server/actions/reviews.ts`

- [ ] **Step 1: Replace reviews.ts**

```typescript
"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import { employeeReviews, incidentLogs } from "@/lib/db/schema/hr";
import { checkRole, getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { createReviewSchema, createIncidentSchema } from "@/lib/validations/hr";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

const REVIEW_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];
const SELF_SERVICE_REVIEW_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];

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

async function assertReviewScope(role: UserRole, divisionIds: string[], employeeId: string) {
  if (!DIV_SCOPED_ROLES.includes(role)) return true;
  if (divisionIds.length === 0) return false;

  const [employeeRow] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return divisionIds.includes(employeeRow?.divisionId ?? "");
}

export async function getReviews() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  const isSelfService = SELF_SERVICE_REVIEW_ROLES.includes(role);
  const isDivScoped = DIV_SCOPED_ROLES.includes(role) && roleRow.divisionIds.length > 0;

  if (isSelfService && !roleRow.employeeId) {
    return { role, reviews: [], incidents: [] };
  }

  if (!REVIEW_ROLES.includes(role) && !isSelfService) {
    return { role, reviews: [], incidents: [] };
  }

  function reviewWhereClause() {
    if (isSelfService) return eq(employeeReviews.employeeId, roleRow.employeeId!);
    if (isDivScoped) return inArray(employees.divisionId, roleRow.divisionIds);
    return undefined;
  }

  function incidentWhereClause() {
    if (isSelfService) return eq(incidentLogs.employeeId, roleRow.employeeId!);
    if (isDivScoped) return inArray(employees.divisionId, roleRow.divisionIds);
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
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "KABAG", "SPV"]);
  if (authError) return authError;

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input review tidak valid." };
  }

  const roleRow = await getCurrentUserRoleRow();
  const inScope = await assertReviewScope(roleRow.role as UserRole, roleRow.divisionIds, parsed.data.employeeId);
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
  const authError = await checkRole(["SUPER_ADMIN", "HRD", "KABAG", "SPV"]);
  if (authError) return authError;

  const parsed = createIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input incident tidak valid." };
  }

  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  const inScope = await assertReviewScope(role, roleRow.divisionIds, parsed.data.employeeId);
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
```

- [ ] **Step 2: Check TypeScript for this file**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | grep "reviews"
```

Expected: no errors mentioning `reviews.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/reviews.ts
git commit -m "feat(reviews): add KABAG scope, use divisionIds[]"
```

---

## Task 4: Fix performance.ts — 6 targeted edits

**Files:**
- Modify: `src/server/actions/performance.ts`

This file is large (~800 lines). Apply 6 surgical edits in order. Do NOT rewrite the whole file.

- [ ] **Step 1: Update role constants (lines 48–50)**

Find:
```typescript
const PERFORMANCE_ACTIVITY_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV"];
const PERFORMANCE_SELF_SERVICE_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL"];
const PERFORMANCE_GENERATE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
```

Replace with:
```typescript
const PERFORMANCE_ACTIVITY_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];
const PERFORMANCE_SELF_SERVICE_ROLES: UserRole[] = ["TEAMWORK", "MANAGERIAL"];
const PERFORMANCE_GENERATE_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];
```

- [ ] **Step 2: Update `ensurePerformanceReadRole` (line ~61)**

Find:
```typescript
function ensurePerformanceReadRole(role: UserRole) {
  return ["SUPER_ADMIN", "HRD", "SPV", "TEAMWORK", "MANAGERIAL"].includes(role);
}
```

Replace with:
```typescript
function ensurePerformanceReadRole(role: UserRole) {
  return ["SUPER_ADMIN", "HRD", "KABAG", "SPV", "TEAMWORK", "MANAGERIAL"].includes(role);
}
```

- [ ] **Step 3: Update `getScopedTeamworkEmployees` signature + body (lines ~64–103)**

Find:
```typescript
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
```

Replace with:
```typescript
async function getScopedTeamworkEmployees(role: UserRole, divisionIds: string[]) {
  if (DIV_SCOPED_ROLES.includes(role) && divisionIds.length > 0) {
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
          inArray(employees.divisionId, divisionIds)
        )
      )
      .orderBy(asc(employees.fullName));
  }
```

- [ ] **Step 4: Update `getScopedActivityEntries` signature + SPV block (lines ~106–143)**

Find:
```typescript
async function getScopedActivityEntries(role: UserRole, divisionId: string | null, employeeId?: string | null) {
```
and the SPV block inside it:
```typescript
  if (role === "SPV" && divisionId) {
    return baseQuery
      .where(eq(employees.divisionId, divisionId))
      .orderBy(desc(dailyActivityEntries.workDate), desc(dailyActivityEntries.createdAt));
  }
```

Replace function signature and SPV block:
```typescript
async function getScopedActivityEntries(role: UserRole, divisionIds: string[], employeeId?: string | null) {
```
```typescript
  if (DIV_SCOPED_ROLES.includes(role) && divisionIds.length > 0) {
    return baseQuery
      .where(inArray(employees.divisionId, divisionIds))
      .orderBy(desc(dailyActivityEntries.workDate), desc(dailyActivityEntries.createdAt));
  }
```

- [ ] **Step 5: Update `getScopedMonthlyPerformance` signature + SPV block (lines ~154–192)**

Find:
```typescript
async function getScopedMonthlyPerformance(role: UserRole, divisionId: string | null, employeeId?: string | null) {
```
and:
```typescript
  if (role === "SPV" && divisionId) {
    return baseQuery
      .where(eq(employees.divisionId, divisionId))
      .orderBy(desc(monthlyPointPerformances.periodStartDate), asc(employees.fullName));
  }
```

Replace with:
```typescript
async function getScopedMonthlyPerformance(role: UserRole, divisionIds: string[], employeeId?: string | null) {
```
```typescript
  if (DIV_SCOPED_ROLES.includes(role) && divisionIds.length > 0) {
    return baseQuery
      .where(inArray(employees.divisionId, divisionIds))
      .orderBy(desc(monthlyPointPerformances.periodStartDate), asc(employees.fullName));
  }
```

- [ ] **Step 6: Update `assertActivityScope` signature + body (lines ~194–205)**

Find:
```typescript
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
```

Replace with:
```typescript
async function assertActivityScope(role: UserRole, divisionIds: string[], employeeId: string) {
  if (!DIV_SCOPED_ROLES.includes(role)) return true;
  if (divisionIds.length === 0) return false;

  const [employeeRow] = await db
    .select({ divisionId: employees.divisionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return divisionIds.includes(employeeRow?.divisionId ?? "");
}
```

- [ ] **Step 7: Update all 8 call sites in `getPerformanceWorkspace` and mutations**

In `getPerformanceWorkspace` (lines ~343–351), find:
```typescript
        : getScopedTeamworkEmployees(role, roleRow.divisionId ?? null),
      // TEAMWORK ambil divisi aktual dari data employee mereka sendiri
      isSelfService
        ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.isActive, true)).orderBy(asc(divisions.name))
        : role === "SPV" && roleRow.divisionId
          ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.id, roleRow.divisionId))
          : db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.isActive, true)).orderBy(asc(divisions.name)),
      getScopedActivityEntries(role, roleRow.divisionId ?? null, roleRow.employeeId),
      getScopedMonthlyPerformance(role, roleRow.divisionId ?? null, roleRow.employeeId),
```

Replace with:
```typescript
        : getScopedTeamworkEmployees(role, roleRow.divisionIds),
      // TEAMWORK ambil divisi aktual dari data employee mereka sendiri
      isSelfService
        ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.isActive, true)).orderBy(asc(divisions.name))
        : DIV_SCOPED_ROLES.includes(role) && roleRow.divisionIds.length > 0
          ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(inArray(divisions.id, roleRow.divisionIds)).orderBy(asc(divisions.name))
          : db.select({ id: divisions.id, name: divisions.name }).from(divisions).where(eq(divisions.isActive, true)).orderBy(asc(divisions.name)),
      getScopedActivityEntries(role, roleRow.divisionIds, roleRow.employeeId),
      getScopedMonthlyPerformance(role, roleRow.divisionIds, roleRow.employeeId),
```

Then find all 5 occurrences of `assertActivityScope(role, roleRow.divisionId ?? null,` in the mutation functions and replace each with `assertActivityScope(role, roleRow.divisionIds,`.

Also find:
```typescript
  const logAction = role === "SPV" ? "APPROVE_SPV" : "OVERRIDE_HRD";
```
Replace with:
```typescript
  const logAction = DIV_SCOPED_ROLES.includes(role) ? "APPROVE_SPV" : "OVERRIDE_HRD";
```

- [ ] **Step 8: Check TypeScript for this file**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | grep "performance"
```

Expected: no errors mentioning `performance.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/server/actions/performance.ts
git commit -m "feat(performance): add KABAG, use divisionIds[] for scoping"
```

---

## Task 5: Fix employees.ts + training.ts

**Files:**
- Modify: `src/server/actions/employees.ts`
- Modify: `src/server/actions/training.ts`

- [ ] **Step 1: Update employees.ts — add KABAG and use `divisionIds`**

In `src/server/actions/employees.ts`, make these 3 targeted changes:

**Change 1** — add `inArray` to imports. Find:
```typescript
import { aliasedTable, asc, desc, eq } from "drizzle-orm";
```
Replace with:
```typescript
import { aliasedTable, asc, desc, eq, inArray } from "drizzle-orm";
```

**Change 2** — add KABAG to read roles and fix list query. Find:
```typescript
const EMPLOYEE_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "SPV", "FINANCE"];
```
Replace with:
```typescript
const EMPLOYEE_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV", "FINANCE"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];
```

**Change 3** — fix SPV block in list employees. Find:
```typescript
  if (role === "SPV") {
    if (!roleRow.divisionId) return [];
    return (await baseQuery
      .where(eq(employees.divisionId, roleRow.divisionId))
      .orderBy(asc(employees.fullName))) as EmployeeListRow[];
  }
```
Replace with:
```typescript
  if (DIV_SCOPED_ROLES.includes(role)) {
    if (roleRow.divisionIds.length === 0) return [];
    return (await baseQuery
      .where(inArray(employees.divisionId, roleRow.divisionIds))
      .orderBy(asc(employees.fullName))) as EmployeeListRow[];
  }
```

**Change 4** — fix SPV check in getEmployee detail. Find:
```typescript
  if (role === "SPV" && !roleRow.divisionId) {
    return null;
  }
```
Replace with:
```typescript
  if (DIV_SCOPED_ROLES.includes(role) && roleRow.divisionIds.length === 0) {
    return null;
  }
```

**Change 5** — fix SPV division guard in getEmployee detail. Find:
```typescript
  if (role === "SPV" && roleRow.divisionId && employeeRow.divisionId !== roleRow.divisionId) {
    return null;
  }
```
Replace with:
```typescript
  if (DIV_SCOPED_ROLES.includes(role) && !roleRow.divisionIds.includes(employeeRow.divisionId ?? "")) {
    return null;
  }
```

- [ ] **Step 2: Update training.ts — use divisionIds**

In `src/server/actions/training.ts`:

**Change 1** — add `inArray` to drizzle import. Find the existing drizzle import line and add `inArray` to it.

**Change 2** — Find:
```typescript
        role === "SPV" && roleRow.divisionId
          ? eq(employees.divisionId, roleRow.divisionId)
          : undefined,
```
Replace with:
```typescript
        ["SPV", "KABAG"].includes(role) && roleRow.divisionIds.length > 0
          ? inArray(employees.divisionId, roleRow.divisionIds)
          : undefined,
```

- [ ] **Step 3: Check TypeScript**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | grep -E "employees\.ts|training\.ts"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/actions/employees.ts src/server/actions/training.ts
git commit -m "feat(employees,training): add KABAG scope, use divisionIds[]"
```

---

## Task 6: Fix dashboard.ts

**Files:**
- Modify: `src/server/actions/dashboard.ts`

- [ ] **Step 1: Replace dashboard.ts**

```typescript
"use server";

import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { dailyActivityEntries, monthlyPointPerformances } from "@/lib/db/schema/point";
import { attendanceTickets, employeeReviews, incidentLogs } from "@/lib/db/schema/hr";
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

  let totalAktif = 0, training = 0, reguler = 0;
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
```

- [ ] **Step 2: Check TypeScript**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | grep "dashboard"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/dashboard.ts
git commit -m "feat(dashboard): replace isSPV with isDivScoped, add KABAG"
```

---

## Task 7: Fix page components

**Files:**
- Modify: `src/app/(dashboard)/tickets/page.tsx`
- Modify: `src/app/(dashboard)/reviews/page.tsx`

- [ ] **Step 1: Fix tickets/page.tsx**

In `src/app/(dashboard)/tickets/page.tsx`:

**Change 1** — add `inArray` to drizzle import. Find:
```typescript
import { and, asc, eq } from "drizzle-orm";
```
Replace with:
```typescript
import { and, asc, eq, inArray } from "drizzle-orm";
```

**Change 2** — add KABAG and fix division scoping. Find:
```typescript
  const canManageEmployeeOptions = ["SUPER_ADMIN", "HRD", "SPV"].includes(role);

  const employeeRows = canManageEmployeeOptions
    ? await db
        .select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          divisionId: employees.divisionId,
          divisionName: divisions.name,
        })
        .from(employees)
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(
          and(
            eq(employees.isActive, true),
            role === "SPV" && roleRow.divisionId
              ? eq(employees.divisionId, roleRow.divisionId)
              : undefined,
          )
        )
        .orderBy(asc(employees.fullName))
    : [];
```

Replace with:
```typescript
  const canManageEmployeeOptions = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"].includes(role);
  const isDivScoped = ["SPV", "KABAG"].includes(role) && roleRow.divisionIds.length > 0;

  const employeeRows = canManageEmployeeOptions
    ? await db
        .select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          divisionId: employees.divisionId,
          divisionName: divisions.name,
        })
        .from(employees)
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(
          and(
            eq(employees.isActive, true),
            isDivScoped ? inArray(employees.divisionId, roleRow.divisionIds) : undefined,
          )
        )
        .orderBy(asc(employees.fullName))
    : [];
```

- [ ] **Step 2: Fix reviews/page.tsx**

In `src/app/(dashboard)/reviews/page.tsx`, apply the same pattern:

**Change 1** — add `inArray` to drizzle import.

**Change 2** — Find:
```typescript
  const canManageEmployeeOptions = ["SUPER_ADMIN", "HRD", "SPV"].includes(role);

  const employeeRows = canManageEmployeeOptions
    ? await db
        .select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          divisionName: divisions.name,
        })
        .from(employees)
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(
          and(
            eq(employees.isActive, true),
            role === "SPV" && roleRow.divisionId
              ? eq(employees.divisionId, roleRow.divisionId)
              : undefined,
          )
        )
        .orderBy(asc(employees.fullName))
    : [];
```

Replace with:
```typescript
  const canManageEmployeeOptions = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"].includes(role);
  const isDivScoped = ["SPV", "KABAG"].includes(role) && roleRow.divisionIds.length > 0;

  const employeeRows = canManageEmployeeOptions
    ? await db
        .select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          divisionName: divisions.name,
        })
        .from(employees)
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(
          and(
            eq(employees.isActive, true),
            isDivScoped ? inArray(employees.divisionId, roleRow.divisionIds) : undefined,
          )
        )
        .orderBy(asc(employees.fullName))
    : [];
```

- [ ] **Step 3: Check TypeScript**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1 | grep -E "tickets/page|reviews/page"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/tickets/page.tsx src/app/(dashboard)/reviews/page.tsx
git commit -m "feat(pages): add KABAG scope in tickets and reviews pages"
```

---

## Task 8: Fix PerformanceCatalogClient.tsx + final TypeScript clean pass

**Files:**
- Modify: `src/app/(dashboard)/performance/PerformanceCatalogClient.tsx`

- [ ] **Step 1: Add KABAG to approval button visibility check**

In `src/app/(dashboard)/performance/PerformanceCatalogClient.tsx`, find:
```typescript
            role === "SPV" || role === "HRD" || role === "SUPER_ADMIN";
```
Replace with:
```typescript
            role === "SPV" || role === "KABAG" || role === "HRD" || role === "SUPER_ADMIN";
```

Also find:
```typescript
                        title: role === "SPV" ? "Setujui Aktivitas" : "Override HRD",
```
Replace with:
```typescript
                        title: role === "SPV" || role === "KABAG" ? "Setujui Aktivitas" : "Override HRD",
```

And:
```typescript
                    {role === "SPV" ? "Setujui" : "Override"}
```
Replace with:
```typescript
                    {role === "SPV" || role === "KABAG" ? "Setujui" : "Override"}
```

- [ ] **Step 2: Final clean TypeScript check — must be zero errors**

```bash
cd c:/NEXT/hrd-dashboard && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors). If any errors remain, fix them before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/performance/PerformanceCatalogClient.tsx
git commit -m "feat(performance-ui): add KABAG to approval button visibility"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run Next.js build lint check**

```bash
cd c:/NEXT/hrd-dashboard && npx next build 2>&1 | tail -30
```

Expected: build completes without type errors. Linting warnings about unused imports are acceptable; type errors are not.

- [ ] **Step 2: Commit if any lint-driven fixes were made**

```bash
git add -p
git commit -m "fix: lint cleanup after KABAG role system foundation"
```

- [ ] **Step 3: Verify KABAG is available in user management**

Check that `KABAG` appears in any UI dropdown for setting user roles (admin/user-roles page if it exists). If roles are hard-coded in a UI constant, update it to include `KABAG`.

```bash
cd c:/NEXT/hrd-dashboard && grep -rn "SUPER_ADMIN.*HRD.*SPV\|userRoleEnum\|USER_ROLES" src/app --include="*.tsx" --include="*.ts" | grep -v ".next"
```

Review output and add KABAG wherever the list of roles is displayed in UI.
