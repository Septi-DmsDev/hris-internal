# HRIS Checklist Phase 1-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift employee master data to the new 4-category grouping, strengthen employee identity and resign flow, and prepare the phase 2 attendance/discipline/leave updates without touching phase 3 payroll work.

**Architecture:** Keep role access unchanged, but move employee grouping into a dedicated helper so UI, validations, server actions, and docs can share one source of truth. Preserve backward compatibility where possible for existing rows while new input flows use the new categories.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Drizzle ORM, PostgreSQL migrations, Vitest, server actions.

---

### Task 1: Employee group foundation

**Files:**
- Modify: `src/lib/db/schema/master.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/validations/master.ts`
- Modify: `src/lib/validations/employee.ts`
- Modify: `src/app/(dashboard)/employees/EmployeesTable.tsx`
- Modify: `src/app/(dashboard)/positioning/DivisionManagementTable.tsx`
- Modify: `src/app/(dashboard)/master/positions/PositionsTable.tsx`
- Test: `src/lib/employee-groups.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test to verify it fails**
- [ ] **Step 3: Implement the minimal employee-group helper and schema updates**
- [ ] **Step 4: Run the test to verify it passes**

### Task 2: Employee code and profile foundation

**Files:**
- Modify: `src/server/actions/employees.ts`
- Modify: `src/lib/auth/profile-completion.ts`
- Modify: `src/app/(dashboard)/employees/EmployeesTable.tsx`
- Modify: `src/app/(dashboard)/employees/[id]/page.tsx`
- Modify: `src/app/(dashboard)/me/profile/page.tsx`
- Modify: `src/app/(dashboard)/me/profile/MyPersonalProfileForm.tsx`
- Test: `src/server/actions/employees.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test to verify it fails**
- [ ] **Step 3: Implement branch-based employee codes and HRD default login behavior**
- [ ] **Step 4: Run the test to verify it passes**

### Task 3: Resign and phase 2 readiness

**Files:**
- Modify: `src/server/actions/tickets.ts`
- Modify: `src/server/actions/training.ts`
- Modify: `src/server/actions/performance.ts`
- Modify: `src/server/actions/alpha.ts`
- Modify: `src/app/(dashboard)/ticketingapproval/TicketApprovalClient.tsx`
- Modify: `src/app/(dashboard)/performance/*`
- Modify: `references/business-rules.md`
- Modify: `docs/codebase-curriculum/00-overview.md`
- Modify: `docs/codebase-curriculum/03-database-schema.md`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test to verify it fails**
- [ ] **Step 3: Update the phase 2 business helpers and docs**
- [ ] **Step 4: Run the test to verify it passes**

