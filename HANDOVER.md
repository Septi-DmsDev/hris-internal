# HRD Dashboard - Handover Document

**Tanggal update:** 2026-05-05  
**Branch aktif:** `main`  
**Remote:** `https://github.com/Septi-DmsDev/hris-internal.git`  
**Status saat ini:** repo sudah memiliki flow MVP lintas phase; dokumentasi utama disinkronkan ulang dengan alur code aktual pada 2026-05-04

---

## Ringkasan Proyek

HRD Dashboard internal berbasis Next.js App Router untuk mengelola:
- employee profiling dan master data
- performance point TEAMWORK
- training evaluation
- ticketing izin/sakit/cuti
- review dan incident
- payroll preview/finalize/paid/locked
- finance summary
- personal self-service pages (`/me`, `/me/profile`)

Arsitektur utama:
- Next.js 16 App Router
- Supabase Auth
- Drizzle ORM + PostgreSQL
- server actions untuk mutation sensitif
- snapshot untuk performance/payroll
- audit log untuk approval dan payroll lifecycle

---

## Status Phase

| Phase | Nama | Status |
|---|---|---|
| Phase 1 | Profiling Karyawan & Master Data Foundation | Selesai |
| Phase 2 | Performance Management Engine | Selesai |
| Phase 3 | Payroll System & Finance Closing | Implemented MVP-to-usable flow |
| QA | Functional review / hardening | Berikutnya |

Catatan phase 3 saat ini:
- payroll TEAMWORK dan MANAGERIAL sudah ada
- salary config, preview, finalize, paid, lock sudah ada
- finance dashboard sudah ada
- payslip PDF dan export Excel sudah ada
- personal self-service access ke slip gaji sudah ada
- input massal persentase managerial bulanan dari `/performance` sudah ada
- modul ini sudah usable, tetapi belum berarti semua hardening enterprise selesai

---

## Status Git Terbaru

Recent commits terpenting di `main`:
- `502ee30` `feat(self-service): enrich me dashboard and header`
- `1951833` `feat(self-service): add personal dashboard and profile`
- `d6c4a15` `fix(hr): add quarter leave quota and reviewer auto-fill`
- `aaf6827` `feat(auth): finish KABAG role system foundation`

Status kerja saat handover ini ditulis:
- dokumentasi root dan kurikulum codebase sudah diperbarui agar sesuai route/action/engine aktual
- cek `git status` sebelum melanjutkan karena sesi dokumentasi ini membuat perubahan file markdown

Update dokumentasi 2026-05-04:
- `AGENTS.md`, `CLAUDE.md`, dan `agent-startup-prompt.md` sudah mengikuti alur code aktual.
- `README.md` sudah diganti dari template Next.js menjadi README project.
- `docs/onboarding-curriculum.md` dan `docs/codebase-curriculum/*` inti sudah diperbarui untuk self-service, users, settings, schedule/scheduler, KABAG/SPV division scope, master shift, payroll PDF/XLSX, dan test aktual.
- `references/implementation-playbook.md` dan `references/tech-stack.md` diberi catatan penyelarasan code.

---

## Setup Lokal

### Prerequisites
- Node.js
- pnpm
- akses `.env.local` yang valid
- koneksi database PostgreSQL/Supabase yang sesuai environment aktif

### Command utama
```bash
pnpm install
pnpm dev
pnpm vitest run
pnpm lint
pnpm build
```

### Env penting
Project mengandalkan variabel berikut:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
```

Catatan:
- jangan expose `SUPABASE_SERVICE_ROLE_KEY` ke client
- payroll dan mutation sensitif tetap harus server-side
- detail koneksi VPS/tunnel lama dari handover sebelumnya jangan diasumsikan masih final; verifikasi lagi sesuai environment aktif jika perlu

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | Next.js 16.2.4 App Router |
| Auth | Supabase Auth + `@supabase/ssr` |
| ORM | Drizzle ORM + `postgres` |
| Database | PostgreSQL / Supabase |
| UI | Tailwind CSS + shadcn/ui + Radix |
| Table | TanStack Table |
| Validation | Zod |
| Dates | `date-fns` |
| Testing | Vitest |
| Charts | Recharts |

---

## Current UI Direction

Design system aktif tetap memakai arah "Ink & Teal":
- primary teal
- dark navy sidebar
- light neutral content background
- white cards
- Plus Jakarta Sans

Layout utama saat ini:
- sidebar grouped navigation
- role badge di sidebar/header
- dynamic header title per route
- self-service route `Saya` untuk user employee-linked

---

## Struktur Fitur Saat Ini

### Auth and Role System
Role aktif di repo:
- `SUPER_ADMIN`
- `HRD`
- `KABAG`
- `SPV`
- `MANAGERIAL`
- `FINANCE`
- `TEAMWORK`
- `PAYROLL_VIEWER`

Auth/session pattern utama:
- `requireAuth()`
- `checkRole([...])`
- `getCurrentUserRoleRow()`
- `getCurrentUserRole()`
- `getUser()`

Perubahan penting terbaru:
- `RoleRow` sekarang memakai `divisionIds: string[]`
- `user_roles.divisionId` masih ada sebagai deprecated field untuk compatibility
- scoping division aktif memakai junction table `user_role_divisions`
- `SPV` dan `KABAG` adalah role division-scoped
- `KABAG` sudah fully wired di app layer

### Employee and Master Data
Sudah ada:
- branches
- divisions
- positions
- grades
- work schedules
- employees
- employee detail
- employee history tables

### Performance Phase 2
Sudah ada:
- point catalog versioning
- import/sync workbook poin
- division point target rules
- daily activity entries
- SPV/KABAG approval flow
- HRD override flow
- monthly point performance
- input massal persentase managerial bulanan
- training evaluation

Rule target yang aktif:
- default target harian `13_000`
- divisi `OFFSET` target harian `39_000`
- target performa mengikuti divisi snapshot payroll/awal periode
- pilihan pekerjaan harian mengikuti divisi aktual harian
- payroll MANAGERIAL membaca managerial_kpi_summaries per periode

### Ticketing / Review
Sudah ada:
- ticket create / approve / reject / cancel
- leave quota logic
- quarter leave quota logic
- review create / validate
- incident log
- reviewer auto-fill jika reviewer linked ke employee

### Payroll / Finance
Sudah ada:
- payroll periods
- employee salary config
- managerial KPI summaries
- payroll auto-preview generation when `/payroll` opens editable periods
- payroll finalize
- mark paid
- lock period
- payroll detail per employee
- payslip structure
- payslip PDF route
- payroll Excel export route
- finance dashboard route

Server-side payroll entry points penting:
- `getPayrollWorkspace()`
- `getPayrollEmployeeDetail()`
- `createPayrollPeriod()`
- `/payroll/page.tsx` auto-calls `generatePayrollPreview()` for periods before `FINALIZED`
- `generatePayrollPreview()`
- `finalizePayroll()`
- `markPayrollPaid()`
- `lockPayrollPeriod()`

### Self-Service Personal Pages
Sudah ada:
- `/me`
- `/me/profile`

Fungsi utama:
- personal dashboard untuk semua role employee-linked
- profile read-only pribadi
- TEAMWORK melihat summary aktivitas pribadi 30 hari terakhir
- personal link ke slip gaji/detail payroll sendiri
- dynamic header title per route

---

## Route Status Saat Ini

| Route | Status | Catatan |
|---|---|---|
| `/login` | Active | Login |
| `/dashboard` | Active | Operational dashboard |
| `/employees` | Active | Employee list |
| `/employees/[id]` | Active | Employee admin detail |
| `/master/branches` | Active | CRUD |
| `/master/divisions` | Active | CRUD |
| `/master/positions` | Active | CRUD |
| `/master/grades` | Active | CRUD |
| `/master/work-schedules` | Active | CRUD |
| `/performance` | Active | Activity, monthly performance, point catalog |
| `/performance/training` | Active | Training evaluation |
| `/tickets` | Active | Ticketing |
| `/reviews` | Active | Review + incident |
| `/payroll` | Active | Payroll workspace |
| `/payroll/[periodId]/[employeeId]` | Active | Payroll detail / payslip structure |
| `/payroll/[periodId]/[employeeId]/payslip.pdf` | Active | Payslip PDF |
| `/payroll/[periodId]/export.xlsx` | Active | Payroll export |
| `/finance` | Active | Finance summary |
| `/me` | Active | Personal dashboard |
| `/me/profile` | Active | Personal profile |

---

## Database Notes

Schema penting:
- `auth.ts`
- `master.ts`
- `employee.ts`
- `point.ts`
- `hr.ts`
- `payroll.ts`

Perubahan auth penting:
- `user_role_divisions` dipakai untuk multi-division scoping
- `employeeId` di `user_roles` dipakai untuk self-service dan self-access

Perubahan payroll/performance penting:
- payroll memakai snapshot table, bukan baca live employee data saat hasil sudah dibentuk
- performance memakai snapshot point catalog dan division target rules
- activity approved bisa di-lock saat payroll finalized

---

## Business Rules Kritis

### TEAMWORK Performance
- target harian default: `13.000`
- target harian divisi `OFFSET`: `39.000`
- target performa mengikuti divisi snapshot periode
- aktivitas harian mengikuti divisi aktual harian
- TW input H+1
- SPV/KABAG approve scoped
- HRD bisa override

### Ticketing
- semua izin/sakit/cuti berbasis tiket
- approval ticket saat ini hanya oleh `HRD` dan `SUPER_ADMIN`
- `SPV`/`KABAG` scoped read/submit, bukan approver final ticket

### Review
- review dan incident sudah scoped sesuai role
- reviewer employee id bisa auto-fill bila akun reviewer linked ke employee

### Payroll
- periode payroll: 26 bulan sebelumnya s.d. 25 bulan berjalan
- payroll tidak boleh dihitung di browser
- gunakan snapshot
- finalisasi harus idempotent
- setelah `PAID`/`LOCKED`, koreksi via adjustment periode berikutnya
- payslip/detail payroll pribadi hanya boleh diakses owner atau payroll roles

### Self-Service
- `SUPER_ADMIN` tanpa employee link diarahkan ke `/dashboard`
- role employee-linked bisa membuka `/me` dan `/me/profile`
- non-payroll roles tidak otomatis dapat akses workspace payroll umum
- tetapi user bisa membaca detail payroll miliknya sendiri bila tersedia

---

## File Penting untuk Sesi Berikutnya

### Core auth / role
- `src/lib/auth/session.ts`
- `src/lib/db/schema/auth.ts`
- `src/lib/permissions/index.ts`

### Self-service
- `src/server/actions/me.ts`
- `src/server/actions/me.helpers.ts`
- `src/app/(dashboard)/me/page.tsx`
- `src/app/(dashboard)/me/profile/page.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/HeaderTitle.tsx`
- `src/components/layout/header-title.ts`

### Performance
- `src/server/actions/performance.ts`
- `src/server/actions/point-catalog.ts`
- `src/server/point-engine/*`

### Ticketing / review
- `src/server/actions/tickets.ts`
- `src/server/actions/reviews.ts`
- `src/server/actions/training.ts`

### Payroll / finance
- `src/server/actions/payroll.ts`
- `src/server/actions/payroll.helpers.ts`
- `src/server/payroll-engine/*`
- `src/app/(dashboard)/payroll/*`
- `src/app/(dashboard)/finance/page.tsx`

---

## Current Verification Baseline

State terakhir yang sudah terbukti hijau di repo:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm vitest run`
- `pnpm build`

Terakhir diverifikasi setelah batch:
- personal dashboard/profile
- TEAMWORK self-service enrichment
- personal payroll detail access
- dynamic header title

Jika sesi berikutnya mulai dari branch yang sama, baseline ini bisa dipakai sebagai acuan regresi.

---

## QA Focus Berikutnya

Prioritas QA yang paling masuk akal dari state sekarang:
1. role-based access QA
   - `KABAG`, `SPV`, `TEAMWORK`, `FINANCE`, `PAYROLL_VIEWER`, `SUPER_ADMIN`
2. self-service QA
   - `/me`, `/me/profile`, slip gaji personal
3. payroll lifecycle QA
   - preview -> finalize -> paid -> lock
4. point activity QA
   - draft -> submit -> approve/reject -> override -> monthly generation
5. ticket and leave quota QA
   - monthly/annual/quarter logic

---

## Known Follow-up Areas

Belum berarti bug, tapi area lanjutan yang masih mungkin dikerjakan setelah QA:
- hardening enterprise untuk payroll dan finance reporting
- route khusus self-service payslip bila ingin UX lebih eksplisit
- audit/reporting tambahan
- manual QA matrix per role
- penerapan migration ke target DB bila ada perubahan schema yang belum diaplikasikan di environment tertentu

---

## Practical Restart Advice

Jika melanjutkan dari nol di PC/sesi lain:
1. checkout `main`
2. pastikan `.env.local` valid
3. jalankan `pnpm install`
4. jalankan `pnpm exec tsc --noEmit`
5. jalankan `pnpm lint`
6. jalankan `pnpm vitest run`
7. jalankan `pnpm build`
8. mulai QA dari route `/login` -> `/dashboard` -> `/me` -> modul-modul utama

