# CLAUDE.md - HRD Dashboard Project Instructions

You are working on an internal HRD Dashboard project. Follow the business rules and architecture in this package.

## Key Context

The system has three phases:

1. Profiling Karyawan & Master Data Foundation
2. Performance Management Engine
3. Payroll System & Finance Closing

Payroll depends on finalized data from profiling, performance, ticketing, review, attendance, and finance modules.

## Critical Rules

- Never calculate sensitive payroll values in client components.
- Keep business logic in server-side services/rule engines.
- Use PostgreSQL transactions for payroll closing, leave quota usage, and adjustments.
- Use snapshots for payroll periods and master points.
- Use audit logs for critical actions.
- Preserve business rules from `references/business-rules.md`.

## Coding Style

- Prefer small, focused changes.
- Use TypeScript strictly.
- Validate input using Zod.
- Use shadcn/ui and Tailwind for UI.
- Use clear status enums.
- Add tests for rule engines.
- Document assumptions in the final response.

## Before Each Task

Identify:

- module and phase;
- role affected;
- tables affected;
- source data and output data;
- business rules involved;
- security and audit impact.

## Final Response

Return:

1. What changed
2. Files changed
3. Business rules applied
4. Validation/tests
5. Remaining risks or decisions
