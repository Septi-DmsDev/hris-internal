# AGENTS.md - HRD Dashboard Project

Use this file as the root instruction for Codex or any coding agent working on this repository.

## Project Identity

This is an HRD Dashboard project using Next.js, TypeScript, Supabase, and PostgreSQL. The system covers employee profiling, performance points, employee review, ticketing for leave/sick/permission, training evaluation, payroll, and finance closing.

## Required Reading

Before modifying code, read:

1. `references/business-rules.md`
2. `references/implementation-playbook.md`
3. `references/tech-stack.md`
4. `references/project-concept-3-phase.md` when architecture or roadmap context is needed

## Non-Negotiable Rules

- Do not calculate payroll in the browser.
- Do not expose Supabase service role key to client code.
- Use server actions, route handlers, PostgreSQL functions, or server-side services for sensitive mutation.
- Use snapshot for payroll and master points.
- Use audit logs for approval, override, payroll finalization, and adjustment.
- Keep payroll finalization idempotent.
- Use RLS and server-side permission checks.
- Do not change business rules silently.

## Tech Stack

- Next.js latest App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime where useful
- Zod + React Hook Form
- TanStack Table
- Recharts

## Preferred Implementation Flow

1. Understand the business rule.
2. Design schema or migration.
3. Implement server service/rule engine.
4. Expose through server action/route handler.
5. Build UI.
6. Add audit log.
7. Add validation/test.
8. Summarize changes.

## Response Format

When done, respond with:

- Summary
- Files changed
- Business rules applied
- Tests/validation run
- Risks or follow-up decisions
