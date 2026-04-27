# HRIS Internal — Initial Project Setup Design

**Date:** 2026-04-27
**Status:** Approved
**Approach:** Full Stack Foundation (Approach B)

## Summary

Scaffold proyek Next.js HRIS (Human Resource Information System) di `c:\SEPTI\NEXT\hrd-dashboard\` sebagai repo git independent, push ke GitHub private repo `hris-internal`.

## Decisions

| Item | Decision |
|---|---|
| Location | `c:\SEPTI\NEXT\hrd-dashboard\` |
| GitHub repo | `hris-internal` — private |
| Package manager | pnpm |
| Supabase | Self-hosted VPS, disambungkan belakangan |
| Approach | Full Stack Foundation (semua deps upfront, schema belum) |

## Dependencies

**Core:** next, react, react-dom, typescript, @supabase/supabase-js, @supabase/ssr

**UI:** tailwindcss, shadcn/ui, lucide-react, sonner, cmdk, class-variance-authority, tailwind-merge, clsx

**Form & Validation:** react-hook-form, @hookform/resolvers, zod

**Table / Chart / Date:** @tanstack/react-table, recharts, date-fns, react-day-picker

**Database:** drizzle-orm, drizzle-kit, postgres

**Export / PDF:** @react-pdf/renderer, xlsx, papaparse

**Testing:** vitest, @testing-library/react, @vitejs/plugin-react

**Quality:** eslint, prettier, husky, lint-staged

## Folder Structure

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── performance/
│   │   ├── reviews/
│   │   ├── tickets/
│   │   ├── payroll/
│   │   ├── master/
│   │   └── settings/
│   ├── api/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/         ← shadcn/ui
│   ├── tables/
│   ├── forms/
│   ├── charts/
│   └── layout/
├── features/
│   ├── employees/
│   ├── performance/
│   ├── reviews/
│   ├── ticketing/
│   ├── payroll/
│   └── auth/
├── server/         ← TIDAK boleh diimport client
│   ├── actions/
│   ├── services/
│   ├── point-engine/
│   ├── ticketing-engine/
│   ├── review-engine/
│   └── payroll-engine/
├── lib/
│   ├── supabase/
│   ├── db/
│   ├── auth/
│   ├── validations/
│   ├── permissions/
│   └── utils/
├── types/
└── config/
```

## Configuration

- **shadcn/ui:** style `default`, base color `slate`, CSS variables `true`
- **Drizzle:** configured, schema kosong (diisi saat Phase 1)
- **`.env.example`:** template untuk SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY, DATABASE_URL
- **Husky:** pre-commit = eslint + prettier + tsc --noEmit
- **tsconfig:** strict mode, path alias `@/*` → `./src/*`

## GitHub

- Repo: `hris-internal` (private)
- Description: HRIS (Human Resource Information System) — internal dashboard profiling karyawan, manajemen poin kinerja, dan payroll system
- Branch strategy: `main` (protected) → `develop` → `feat/*`

## Out of Scope

- Supabase schema / migration (dikerjakan di Phase 1)
- Koneksi database aktif
- Feature implementation
