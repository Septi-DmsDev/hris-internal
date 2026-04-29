# Role System Foundation — Design Spec

**Date:** 2026-04-29  
**Sub-project:** 1 of 4 (Role System Foundation)  
**Status:** Approved

---

## Goal

Introduce the `KABAG` (Kepala Bagian) role and multi-division scoping via a junction table, correct ticket approval authority (SPV removed), and establish the "all roles = karyawan" principle so every non-SUPER_ADMIN user has self-service HRD features.

---

## Context

Current problems this design solves:

1. SPV is scoped to one division via `userRoles.divisionId` — no path to multi-division.
2. No `KABAG` role exists; mid-level managers who oversee multiple divisions have no representation.
3. SPV is listed in `APPROVER_ROLES` for tickets — business rule says SPV only *notifies*, HRD decides.
4. FINANCE and PAYROLL_VIEWER cannot submit their own leave/absence tickets despite being karyawan.
5. `userRoles.divisionId` is a scalar — cannot represent multi-division assignments.

---

## Architecture

### Approach Selected: Approach 1 — Junction Table for All Division Scoping

Replace the scalar `userRoles.divisionId` with a `user_role_divisions` many-to-many junction table. Both SPV (single division) and KABAG (multiple divisions) use the same table. The old column is kept as `nullable` for zero-downtime migration and deprecated immediately.

---

## Section 1: Schema

### 1.1 — Add KABAG to `userRoleEnum`

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'KABAG';
```

The new enum order (UI display order):
```
SUPER_ADMIN → HRD → KABAG → SPV → MANAGERIAL → FINANCE → TEAMWORK → PAYROLL_VIEWER
```

Drizzle schema update in `src/lib/db/schema/auth.ts`:
```ts
export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "HRD",
  "KABAG",
  "SPV",
  "MANAGERIAL",
  "FINANCE",
  "TEAMWORK",
  "PAYROLL_VIEWER",
]);
```

### 1.2 — New `user_role_divisions` Junction Table

```ts
export const userRoleDivisions = pgTable(
  "user_role_divisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userRoleId: uuid("user_role_id")
      .notNull()
      .references(() => userRoles.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ uniq: unique().on(t.userRoleId, t.divisionId) })
);
```

SQL equivalent:
```sql
CREATE TABLE user_role_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, division_id)
);

-- Migrate existing SPV divisionId records
INSERT INTO user_role_divisions (user_role_id, division_id)
SELECT id, division_id
FROM user_roles
WHERE role = 'SPV' AND division_id IS NOT NULL;
```

### 1.3 — Deprecate `userRoles.divisionId`

The column is kept in the DB as `nullable` but marked deprecated in code. It is no longer written to for new assignments. All scoping reads use `user_role_divisions` instead.

```ts
// DEPRECATED: use user_role_divisions join instead. Kept for zero-downtime migration.
divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
```

### 1.4 — Update `getCurrentUserRoleRow()`

Returns an array of division IDs from the junction table instead of a single scalar:

```ts
export async function getCurrentUserRoleRow() {
  // ... existing select from userRoles ...
  const divisionRows = await db
    .select({ divisionId: userRoleDivisions.divisionId })
    .from(userRoleDivisions)
    .where(eq(userRoleDivisions.userRoleId, roleRow.id));

  return {
    ...roleRow,
    divisionIds: divisionRows.map(r => r.divisionId),
  };
}
```

For SPV: `divisionIds` will have exactly one entry.  
For KABAG: `divisionIds` can have one or more.  
For HRD/SUPER_ADMIN/karyawan roles: `divisionIds` is empty (full access or own-data only).

---

## Section 2: Permission Matrix & Ticket Flow

### 2.1 — Role Hierarchy (top → bottom)

| Role | Scope | Division Access |
|------|-------|----------------|
| SUPER_ADMIN | System-wide, owner/operator | All (no divisionIds needed) |
| HRD | All employees, HR decisions | All |
| KABAG | Multiple divisions, manager | 1–N divisions via junction |
| SPV | Single division, supervisor | 1 division via junction |
| MANAGERIAL | Self-service + reports | Own data |
| FINANCE | Self-service + payroll read | Own data |
| TEAMWORK | Self-service | Own data |
| PAYROLL_VIEWER | Self-service + payroll read | Own data |

**SUPER_ADMIN has no `employeeId`** — it's an operator account, not a karyawan.

### 2.2 — "All Roles = Karyawan" Principle

Every role except SUPER_ADMIN is a karyawan. All non-SUPER_ADMIN users:
- Can submit their own tiket (cuti/izin/sakit/setengah hari)
- Can view their own reviews and incidents
- Can view their own performance data
- Can view their own profile

This is enforced by:
```ts
const KARYAWAN_ROLES: UserRole[] = [
  "HRD", "KABAG", "SPV", "MANAGERIAL", "FINANCE", "TEAMWORK", "PAYROLL_VIEWER"
];
```

### 2.3 — KABAG Permission Set

| Feature | KABAG Access |
|---------|-------------|
| Master data | Read only |
| Employees | Read (scoped to their divisions) |
| Performance | Approve/read (scoped to their divisions) |
| Reviews | Read + write (scoped to their divisions) |
| Tickets | Read only — **notify, not approve** |
| Payroll | Read only |
| Self-service | All karyawan features (own data) |

### 2.4 — Ticket Approval Authority (Corrected)

**Before (wrong):**
```ts
const APPROVER_ROLES = ["SUPER_ADMIN", "HRD", "SPV"];
```

**After (correct):**
```ts
const APPROVER_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD"];
const TICKET_NOTIFY_ROLES: UserRole[] = ["SPV", "KABAG"];
```

Business rule: SPV and KABAG are *informed* when a ticket is submitted from their division, but the decision (approve/reject) belongs to HRD or SUPER_ADMIN.

The `TICKET_NOTIFY_ROLES` array is reserved for future notification features (email, in-app). It does not grant mutation rights today.

### 2.5 — Self-Service Ticket Roles (Updated)

```ts
const SELF_SERVICE_TICKET_ROLES: UserRole[] = [
  "KABAG", "SPV", "MANAGERIAL", "FINANCE", "TEAMWORK", "PAYROLL_VIEWER"
];
```

All karyawan roles except HRD can submit tiket for themselves. When `SELF_SERVICE_TICKET_ROLES.includes(role)`, the action auto-overrides `employeeId` with `roleRow.employeeId` (prevents submitting on behalf of others).

HRD and SUPER_ADMIN are **not** in this list because they need to submit tickets *for* other employees (admin function). They supply `employeeId` manually and it is not overridden.

---

## Section 3: Data Access Scoping Pattern

### For SPV (single division)

```ts
// divisionIds[0] is the one division
inArray(employees.divisionId, roleRow.divisionIds)
// or for backwards compat: eq(employees.divisionId, roleRow.divisionIds[0])
```

### For KABAG (multi-division)

```ts
inArray(employees.divisionId, roleRow.divisionIds)
```

### Unified pattern (works for both)

All server actions that scope by division will switch from:
```ts
// Old: scalar
eq(employees.divisionId, roleRow.divisionId)

// New: array via junction
inArray(employees.divisionId, roleRow.divisionIds)
```

When `divisionIds` is empty (HRD/SUPER_ADMIN), no `where` clause is added → full access.

---

## Section 4: Leave Quota Auto-Generation (Quarter Rule)

**Business rule:** A karyawan is eligible for leave quota after 1 year of service. The effective date rounds up to the end of the quarter containing month 12.

Quarter boundaries:
- Q1 (Jan–Mar) → effective March 31
- Q2 (Apr–Jun) → effective June 30
- Q3 (Jul–Sep) → effective September 30
- Q4 (Oct–Dec) → effective December 31

Example:
- Joined January 15, 2025 → 1 year = January 15, 2026 → Q1 2026 → effective March 31, 2026
- Joined February 28, 2025 → 1 year = February 28, 2026 → Q1 2026 → effective March 31, 2026
- Joined July 10, 2025 → 1 year = July 10, 2026 → Q3 2026 → effective September 30, 2026

**Auto-generation trigger:** A cron or background job checks daily for employees whose `startDate + 12 months` falls within the current quarter, and generates the quota record if it doesn't exist yet.

For manual HRD trigger, `generateLeaveQuota()` will also enforce this rule and reject if the employee hasn't reached 12 months by end of the current quarter.

---

## Migration Plan

Run these in Supabase SQL editor in order:

```sql
-- Step 1: Add KABAG enum value
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'KABAG';

-- Step 2: Create junction table
CREATE TABLE IF NOT EXISTS user_role_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, division_id)
);

-- Step 3: Migrate existing SPV records
INSERT INTO user_role_divisions (user_role_id, division_id)
SELECT id, division_id
FROM user_roles
WHERE role = 'SPV' AND division_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

The `userRoles.divisionId` column is **not dropped** — zero-downtime migration. It can be dropped in a follow-up after all reads are confirmed to use the junction table.

---

## What This Does NOT Change

- Supabase Auth schema (no changes to `auth.users`)
- The `employeeId` column on `userRoles` (already added in previous session)
- Existing employee, division, performance, payroll schemas
- SUPER_ADMIN behavior (no `employeeId`, no division scoping)

---

## Open Decisions

None — all design questions resolved during brainstorming session.

---

## Sub-projects Remaining After This

| # | Topic |
|---|-------|
| 2 | Karyawan Features (SPV self-service tiket, FINANCE tiket, all-roles profile page) |
| 3 | Business Logic Fixes (LOCKED guard, quarter leave quota, reviewerEmployeeId auto-fill) |
| 4 | Personal Dashboard & Profile page for all users |
