# Personal Dashboard & Profile Design

**Date:** 2026-04-29
**Sub-project:** 4 of 4 (Personal Dashboard & Profile)
**Status:** Approved

---

## Goal

Provide a safe self-service area for all employee-linked roles using `/me` and `/me/profile`, separate from the admin-oriented `/dashboard` and `/employees/[id]` flows.

## Routes

- `/me`
  - personal dashboard for all non-`SUPER_ADMIN` employee-linked users
  - primary entry point for `TEAMWORK`
- `/me/profile`
  - read-only profile page for the logged-in employee

If `SUPER_ADMIN` has no `employeeId`, redirect `/me` and `/me/profile` to `/dashboard`.

## Data Rules

### `/me`

Show only personal data:
- employee identity and org placement
- active work schedule
- supervisor
- latest ticket summary
- latest review summary
- active incident summary
- latest monthly performance for `TEAMWORK`
- latest payroll summary if available
- role-based quick actions

### `/me/profile`

Show only self profile:
- personal information
- employment information
- active schedule
- compact history blocks (division, position, grade, status)

Do not expose admin editing controls.
Do not expose other employees.
Do not calculate payroll in the browser.

## Role Behavior

- `TEAMWORK`: `/me` is the personal home; quick action to `/performance`
- `SPV` / `KABAG`: personal view remains self-only, operational division scope stays in existing modules
- `HRD` / `FINANCE` / `MANAGERIAL` / `PAYROLL_VIEWER`: personal shortcuts depend on permission scope
- `SUPER_ADMIN`: redirect to `/dashboard` if not employee-linked

## Implementation Notes

- Add new server action file `src/server/actions/me.ts`
- Add read-model queries dedicated to self-service pages; do not reuse admin payloads directly
- Add sidebar navigation item `Saya` for employee-linked roles
- Reuse existing card/badge UI patterns
- Prefer server components; avoid client components unless interaction is needed

## Output

- all employee-linked roles can open `/me`
- all employee-linked roles can open `/me/profile`
- `TEAMWORK` has a clear path to daily performance input
- personal pages stay isolated from admin pages
