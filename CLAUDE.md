# CLAUDE.md - HRIS Internal Project Instructions

You are working on the internal HRIS/HRD Dashboard. Follow the business rules, current code flow, and documentation in this repository.

## Current Context

The product is implemented as three business phases, but the codebase already contains usable flows across all three:

1. Profiling Karyawan & Master Data Foundation
2. Performance Management Engine
3. Payroll System & Finance Closing

Payroll depends on finalized or snapshot data from employee profiling, performance, ticketing, review/incident, attendance/schedule, salary configuration, grade compensation, KPI summaries, and manual adjustments.

## Actual Architecture

```text
Page / Client Component
-> Server Action / Route Handler
-> Zod validation
-> requireAuth/checkRole/getCurrentUserRoleRow
-> Drizzle query or transaction
-> rule engine/helper
-> PostgreSQL
```

Key folders:

- `src/app/(dashboard)/*` for authenticated routes.
- `src/server/actions/*` for business entry points.
- `src/server/point-engine/*`, `src/server/payroll-engine/*`, `src/server/ticketing-engine/*`, and `src/server/review-engine/*` for testable rules/helpers.
- `src/lib/db/schema/*` for Drizzle schema.
- `src/lib/auth/session.ts` and `src/proxy.ts` for auth/session flow.

## Critical Rules

- Never calculate sensitive payroll values in client components.
- Keep business logic in server-side actions, services, route handlers, rule engines, database functions, or transactions.
- Use PostgreSQL/Drizzle transactions for payroll closing, leave quota usage, employee history updates, schedule assignment changes, and adjustments.
- Use snapshots for payroll periods and master point transactions.
- Use audit logs for critical actions. Payroll has `payroll_audit_logs`; performance activities have approval logs.
- Preserve business rules from `references/business-rules.md`.
- If code and business rules differ, mark the difference explicitly instead of silently changing the rule.

## Access Model

Current roles:

`SUPER_ADMIN`, `HRD`, `KABAG`, `SPV`, `MANAGERIAL`, `FINANCE`, `TEAMWORK`, `PAYROLL_VIEWER`.

Important details:

- `user_roles.employee_id` links a login account to an employee for self-service.
- `user_role_divisions` is the current division-scope table for SPV/KABAG.
- `user_roles.division_id` is deprecated compatibility data.
- Server-side scope checks are required even when UI navigation is hidden.

## Coding Style

- Prefer small, focused changes.
- Use TypeScript strictly.
- Validate input with Zod.
- Use shadcn/ui, Radix, Tailwind, and existing component patterns.
- Use clear status enums from `src/types/index.ts` and Drizzle schema enums.
- Add tests for rule engines/helpers when changing formulas or access helpers.
- Document assumptions in the final response.

## Before Each Task

Identify:

- module and phase;
- role and scope affected;
- tables affected;
- source data and output data;
- business rules involved;
- security, snapshot, idempotency, and audit impact;
- existing tests or missing tests.

## Final Response

Return:

1. Summary
2. Files changed
3. Business rules applied
4. Validation/tests
5. Remaining risks or follow-up decisions
