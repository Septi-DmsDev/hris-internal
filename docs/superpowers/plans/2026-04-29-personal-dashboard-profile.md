# Personal Dashboard & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/me` and `/me/profile` as self-service pages for employee-linked roles, separate from admin dashboards.

**Architecture:** Add a dedicated self-service read model in `src/server/actions/me.ts` that resolves the current user, employee-linked profile, summaries, and quick actions. Render both routes as server components and keep admin payloads isolated from personal pages.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, server actions, shadcn/ui, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `docs/superpowers/specs/2026-04-29-personal-dashboard-profile-design.md` | Design spec for this sub-project |
| `docs/superpowers/plans/2026-04-29-personal-dashboard-profile.md` | Implementation plan |
| `src/server/actions/me.ts` | New self-service read model |
| `src/server/actions/me.test.ts` | Tests for pure quick-action helper behavior |
| `src/app/(dashboard)/me/page.tsx` | New personal dashboard route |
| `src/app/(dashboard)/me/profile/page.tsx` | New personal profile route |
| `src/app/(dashboard)/me/loading.tsx` | Loading state |
| `src/app/(dashboard)/me/profile/loading.tsx` | Loading state |
| `src/components/layout/Sidebar.tsx` | Add `Saya` navigation item |
| `src/components/layout/Header.tsx` | Add missing `KABAG` label/color consistency |

## Task 1: Add test-first helper coverage for personal quick actions

**Files:**
- Create: `src/server/actions/me.test.ts`
- Create: `src/server/actions/me.ts`

- [ ] **Step 1: Write failing tests for quick actions and access state**
- [ ] **Step 2: Run the tests to verify failure**
- [ ] **Step 3: Implement minimal pure helpers in `me.ts`**
- [ ] **Step 4: Run tests to verify pass**

## Task 2: Implement self-service read model

**Files:**
- Modify: `src/server/actions/me.ts`

- [ ] **Step 1: Add `getMyDashboard()`**
- [ ] **Step 2: Add `getMyProfile()`**
- [ ] **Step 3: Ensure SUPER_ADMIN without employee link redirects to `/dashboard`**
- [ ] **Step 4: Ensure employee-linked roles return safe empty states when employee record missing**

## Task 3: Build `/me` route

**Files:**
- Create: `src/app/(dashboard)/me/page.tsx`
- Create: `src/app/(dashboard)/me/loading.tsx`

- [ ] **Step 1: Render identity card and role-based quick actions**
- [ ] **Step 2: Render personal summary cards**
- [ ] **Step 3: Render graceful empty states**

## Task 4: Build `/me/profile` route

**Files:**
- Create: `src/app/(dashboard)/me/profile/page.tsx`
- Create: `src/app/(dashboard)/me/profile/loading.tsx`

- [ ] **Step 1: Render personal info and employment info**
- [ ] **Step 2: Render schedule and compact histories**
- [ ] **Step 3: Render missing-link empty state**

## Task 5: Navigation polish

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Add `Saya` nav item for employee-linked roles**
- [ ] **Step 2: Keep `SUPER_ADMIN` on admin dashboard flow**
- [ ] **Step 3: Add missing `KABAG` label/color in header**

## Task 6: Verification

**Files:**
- Modify only if verification finds issues

- [ ] **Step 1: Run `pnpm vitest run src/server/actions/me.test.ts`**
- [ ] **Step 2: Run `pnpm exec tsc --noEmit`**
- [ ] **Step 3: Run `pnpm lint`**
- [ ] **Step 4: Run `pnpm build`**
