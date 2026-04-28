# HRD Dashboard — Handover Document

**Tanggal update:** 2026-04-28  
**Branch aktif:** `audit/predeploy-20260428`  
**Remote:** `https://github.com/Septi-DmsDev/hris-internal.git`  
**Status saat ini:** QA / Staging — database connected, user pertama aktif, master data siap diisi

---

## Ringkasan Proyek

Dashboard HRD internal untuk mengelola karyawan, poin kinerja harian, review, ticketing izin/sakit/cuti, training evaluation, dan (Phase 3) payroll. Dibangun dengan Next.js 16 App Router + Supabase Auth + Drizzle ORM + PostgreSQL.

---

## Status Phase

| Phase | Nama | Status |
|---|---|---|
| Phase 1 | Profiling Karyawan & Master Data Foundation | ✅ Selesai |
| Phase 2 | Performance Management Engine | ✅ Selesai |
| Phase 2.5 | Frontend Redesign (UI/UX) | ✅ Selesai |
| Phase 3 | Payroll System & Finance Closing | ⬜ Belum dimulai |

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | Next.js 16.2.4 (App Router, React 19) |
| Auth | Supabase Auth + `@supabase/ssr` 0.10.2 |
| ORM | Drizzle ORM 0.45.2 + `postgres` 3.4.9 |
| Database | PostgreSQL (Supabase self-hosted di VPS `103.240.110.218`) |
| UI | shadcn/ui, Tailwind CSS v4, Radix UI primitives |
| Font | Plus Jakarta Sans (via `next/font/google`) — menggantikan Geist |
| Table | TanStack Table v8 (`@tanstack/react-table`) |
| Validation | Zod v4 (gunakan `.issues`, bukan `.errors`) |
| Dates | `date-fns` v4 |
| Testing | Vitest v4 + `@testing-library/react` |
| Linting | ESLint + Prettier + Husky + lint-staged |

---

## Design System — "Ink & Teal"

Design direction yang sudah diimplementasi (2026-04-28):

| Token | Value | Keterangan |
|---|---|---|
| Primary | `#0d9488` (teal-600) | Buttons, active states, focus ring, avatar |
| Background | `#f7f8f9` | Main content area |
| Sidebar | `#0f172a` | Deep navy |
| Card | `#ffffff` | White cards dengan subtle shadow |
| Font | Plus Jakarta Sans | 400/500/600/700/800 weights |

**File yang berubah saat redesign:**
- `src/app/layout.tsx` — font Plus Jakarta Sans
- `src/app/globals.css` — full CSS variable system (shadcn-compatible)
- `src/components/layout/Sidebar.tsx` — grouped nav, teal active states, role badge
- `src/components/layout/Header.tsx` — avatar initials, role badge berwarna per role, logout icon
- `src/app/(auth)/login/page.tsx` — two-panel layout (dark kiri + form kanan)
- `src/app/(dashboard)/dashboard/page.tsx` — improved stat cards + alert cards
- `src/components/tables/DataTable.tsx` — search icon, pagination chevron, empty state

**CSS Variables (globals.css):**
```css
--color-primary: #0d9488
--color-primary-foreground: #ffffff
--color-background: #f7f8f9
--color-ring: #0d9488
/* ... lihat src/app/globals.css untuk lengkapnya */
```

---

## Setup Lokal (Development)

### Prerequisites
- Node.js, pnpm
- Akses SSH ke VPS `103.240.110.218` (user: `teknos`)

### `.env.local` yang dibutuhkan
```bash
NEXT_PUBLIC_SUPABASE_URL=https://hris-supa.it-teknos.site
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # anon key dari Supabase dashboard
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # service_role key (BUKAN anon key)
DATABASE_URL=postgresql://postgres:[PASSWORD]@localhost:5433/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### SSH Tunnel (wajib sebelum `pnpm dev`)

Database di VPS tidak expose port 5432 ke publik. Jalankan tunnel dulu di terminal terpisah:

```bash
# Terminal 1 — SSH tunnel (biarkan jalan terus)
ssh -L 5433:10.0.4.6:5432 teknos@103.240.110.218 -N
# 10.0.4.6 = IP internal Docker container supabase-db-p9i3yb8b01vhwyamnzunf1fv

# Terminal 2 — Dev server
pnpm dev
```

**Catatan:** Port 5433 (bukan 5432) karena port 5432 sudah dipakai PostgreSQL lokal di laptop.

### Jalankan Lokal
```bash
pnpm install
pnpm dev          # Next.js dev server di localhost:3000
pnpm vitest run   # Run tests
pnpm build        # Production build check
```

### Deployment (Coolify — belum dilakukan)
Saat deploy ke VPS yang sama dengan Supabase, gunakan:
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@localhost:5432/postgres
```
Tidak perlu SSH tunnel — `localhost:5432` langsung ke container Docker.

---

## User Pertama (SUPER_ADMIN)

User pertama dibuat saat session 2026-04-28:

```
Email    : admin@hris.internal
Password : Admin@12345  ← segera ganti setelah login
UUID     : c612c73b-631a-4d14-b584-440a2c49fed6
Role     : SUPER_ADMIN
```

Untuk membuat user tambahan, gunakan seed script:
```bash
SEED_EMAIL=user@hris.internal SEED_PASSWORD=Password123! \
  npx tsx --env-file=.env.local scripts/seed-admin.ts
```

Atau manual via Supabase SQL Editor:
```sql
-- Setelah buat user di Supabase Auth dashboard
INSERT INTO user_roles (user_id, role)
VALUES ('[auth-uuid]', 'HRD');
```

---

## Struktur Folder Penting

```
src/
├── app/
│   ├── (auth)/login/              # Login page (two-panel dark/light)
│   │   ├── page.tsx
│   │   └── LoginForm.tsx
│   └── (dashboard)/
│       ├── layout.tsx             # Auth check + Sidebar + Header
│       ├── dashboard/page.tsx     # Stat cards, pending alerts, performa divisi
│       ├── employees/             # Daftar + detail karyawan
│       ├── master/                # Branches, Divisions, Positions, Grades, Work Schedules
│       ├── performance/           # Aktivitas harian + performa bulanan + katalog poin
│       │   └── training/          # Training evaluation per trainee
│       ├── tickets/               # Ticketing izin/sakit/cuti
│       ├── reviews/               # Review karyawan + incident log
│       ├── payroll/               # (Phase 3) Payroll management
│       └── finance/               # (Phase 3) Finance dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Grouped nav, teal active states, role badge
│   │   └── Header.tsx             # Avatar initials, role badge berwarna, logout
│   ├── tables/DataTable.tsx       # TanStack Table wrapper reusable
│   └── ui/                        # shadcn components
├── lib/
│   ├── auth/session.ts            # getUser, requireAuth, checkRole, getCurrentUserRoleRow
│   ├── db/
│   │   ├── index.ts               # Drizzle client (postgres-js)
│   │   └── schema/
│   │       ├── auth.ts            # userRoles
│   │       ├── master.ts          # branches, divisions, positions, grades, workSchedules
│   │       ├── employee.ts        # employees + history tables
│   │       ├── point.ts           # point catalog, daily activity, monthly performance
│   │       ├── hr.ts              # tickets, leaveQuotas, reviews, incidents
│   │       └── payroll.ts         # (Phase 3) payroll tables
│   └── validations/               # Zod schemas
├── server/actions/                # Server actions (SATU-SATUNYA mutation path)
│   ├── auth.ts                    # loginAction, logoutAction
│   ├── branches.ts                # CRUD branches
│   ├── divisions.ts               # CRUD divisions
│   ├── positions.ts               # CRUD positions
│   ├── grades.ts                  # CRUD grades
│   ├── dashboard.ts               # getDashboardStats
│   ├── tickets.ts                 # getTickets, createTicket, approve/reject/cancel
│   ├── reviews.ts                 # getReviews, createReview, validateReview, createIncident
│   ├── training.ts                # getTrainingEvaluations, graduateTrainee, failTrainee
│   ├── performance.ts             # aktivitas harian + performa bulanan
│   └── point-catalog.ts           # point catalog versions + entries
└── scripts/
    └── seed-admin.ts              # Buat user SUPER_ADMIN pertama
```

---

## Database Schema (Drizzle)

### Schema: `auth.ts`
```
userRoles: id, userId (unique), role (enum), divisionId (null = semua divisi), createdAt, updatedAt
```
**Roles:** `SUPER_ADMIN | HRD | FINANCE | SPV | TEAMWORK | MANAGERIAL | PAYROLL_VIEWER`

### Schema: `master.ts`
```
branches:   id, name, address, isActive
divisions:  id, name, code (unique), branchId (FK→branches), trainingPassPercent (default 80), isActive
positions:  id, name, code (unique), employeeGroup (MANAGERIAL|TEAMWORK), isActive
grades:     id, name, code (unique), description, isActive
workSchedules + workScheduleDays + employeeScheduleAssignments
```

### Schema: `employee.ts`
```
employees: id, employeeCode (unique), fullName, startDate, branchId, divisionId,
           positionId, gradeId, employeeGroup, employmentStatus, payrollStatus,
           supervisorEmployeeId, trainingGraduationDate, isActive

employmentStatus: TRAINING | REGULER | DIALIHKAN_TRAINING | TIDAK_LOLOS | NONAKTIF | RESIGN
payrollStatus:    TRAINING | REGULER | FINAL_PAYROLL | NONAKTIF

+ history tables: divisionHistory, positionHistory, gradeHistory, supervisorHistory, statusHistory
```

### Schema: `point.ts`
```
pointCatalogVersions:     versioning master poin (DRAFT|ACTIVE|ARCHIVED)
pointCatalogEntries:      daftar pekerjaan + poin satuan per divisi per versi
divisionPointTargetRules: target poin harian per divisi per versi
dailyActivityEntries:     input aktivitas harian TW (dengan snapshot poin)
dailyActivityApprovalLogs: audit trail approval
monthlyPointPerformances: rekap performa bulanan per karyawan

activityStatus: DRAFT|DIAJUKAN|DITOLAK_SPV|REVISI_TW|DIAJUKAN_ULANG|DISETUJUI_SPV|OVERRIDE_HRD|DIKUNCI_PAYROLL
```

### Schema: `hr.ts`
```
attendanceTickets:  ticketing izin/sakit/cuti (CUTI|SAKIT|IZIN|EMERGENCY|SETENGAH_HARI)
  status: DRAFT|SUBMITTED|AUTO_APPROVED|AUTO_REJECTED|NEED_REVIEW|APPROVED_SPV|APPROVED_HRD|REJECTED|CANCELLED|LOCKED
  payrollImpact: UNPAID|PAID_QUOTA_MONTHLY|PAID_QUOTA_ANNUAL

leaveQuotas:        kuota cuti per karyawan per tahun
  monthlyQuotaTotal (default 12), annualQuotaTotal (default 3)

employeeReviews:    review kualitas kerja 5 aspek (skor 1-5)
  status: DRAFT|SUBMITTED|VALIDATED|LOCKED

incidentLogs:       log kejadian
  type: KOMPLAIN|MISS_PROSES|TELAT|AREA_KOTOR|PELANGGARAN|SP1|SP2|PENGHARGAAN
  impact: REVIEW_ONLY|PAYROLL_POTENTIAL|NONE
```

---

## Auth & Session Pattern

```typescript
// src/lib/auth/session.ts
await requireAuth()                    // redirect ke /login jika tidak login
await checkRole(["HRD","SUPER_ADMIN"]) // return { error } jika role tidak sesuai
await getCurrentUserRoleRow()          // { id, userId, role, divisionId }
await getCurrentUserRole()             // "HRD" | "SPV" | dll
await getUser()                        // Supabase user object
```

**Wajib:** Semua server actions mulai dengan `requireAuth()` atau `checkRole(...)`.

---

## Business Rules Kritis

### Poin Kinerja TEAMWORK
- Target harian default: **13.000 poin**
- Target harian divisi Offset: **39.000 poin**
- Target bulanan = target harian × jumlah hari masuk target
- Persentase = total poin approved / target bulanan × 100%
- Hari Cuti/Sakit/Izin **approved** → tidak masuk target (target = 0, poin = 0)
- Hari Alpa → masuk target tapi poin = 0
- TW input max H+1, SPV approve max H+2

### Bonus Kinerja
| Persentase | Bonus Kinerja | Bonus Prestasi |
|---|---|---|
| < 80% | 0 | 0 |
| 80–89.99% | bonus 80% | 0 |
| 90–99.99% | bonus 90% | 0 |
| 100–139.99% | bonus 100% | 0 |
| 140–164.99% | bonus 100% | prestasi 140% |
| ≥ 165% | bonus 100% | prestasi 165% saja |

### Training Evaluation
- Standar lulus dari `divisions.trainingPassPercent` (default 80)
- Lulus: set `employmentStatus = REGULER`, `payrollStatus = REGULER`, `trainingGraduationDate`
- Efektif mulai periode payroll **berikutnya**

### Leave Quota
- Karyawan masa kerja > 12 bulan → eligible
- Priority: monthly quota → annual quota → UNPAID

### Review Scoring
```
total = (sopQuality×0.25 + instruction×0.15 + attendanceDiscipline×0.20
        + initiativeTeamwork×0.20 + processMiss×0.20) / 5 × 100
≥90 Sangat Baik | ≥80 Baik | ≥70 Cukup | ≥60 Kurang | <60 Buruk
```

### Periode Payroll
- Tanggal 26 bulan sebelumnya s.d. tanggal 25 bulan berjalan
- Wajib pakai **snapshot** awal periode

### Role Scoping
- `SPV`: hanya divisinya → `eq(employees.divisionId, roleRow.divisionId!)`
- `HRD`/`SUPER_ADMIN`: semua divisi → `divisionId = null`

---

## Halaman yang Sudah Ada

| URL | Status | Deskripsi |
|---|---|---|
| `/login` | ✅ | Two-panel login (dark brand + form) |
| `/dashboard` | ✅ | Stat cards, pending alerts, performa divisi |
| `/employees` | ✅ | DataTable karyawan + link ke detail |
| `/employees/[id]` | ✅ | Detail profil, histori status |
| `/master/branches` | ✅ | CRUD cabang |
| `/master/divisions` | ✅ | CRUD divisi |
| `/master/positions` | ✅ | CRUD jabatan |
| `/master/grades` | ✅ | CRUD grade |
| `/master/work-schedules` | ✅ | CRUD jadwal kerja |
| `/performance` | ✅ | Tabs: Aktivitas Harian + Performa Bulanan + Katalog Poin |
| `/performance/training` | ✅ | Evaluasi trainee |
| `/tickets` | ✅ | Ticketing izin/sakit/cuti dengan approval workflow |
| `/reviews` | ✅ | Review karyawan + incident log |
| `/payroll` | 🚧 | Phase 3 — belum selesai |
| `/finance` | 🚧 | Phase 3 — belum selesai |

---

## Yang Perlu Dibangun: Phase 3 — Payroll System

### Scope
1. **Payroll Engine** — server-side only, PostgreSQL transactions
2. **Payroll Period Management** — generate periode, snapshot, locking
3. **Payroll UI** — `/payroll`, `/payroll/[periodId]`, slip gaji
4. **Finance Dashboard** — total cost, breakdown per divisi, tren

### Komponen Gaji
- Gaji pokok (training: Rp1.000.000, reguler: Rp1.200.000 atau dari grade)
- Prorate training (berdasar hari aktif)
- Bonus kinerja + bonus prestasi
- Potongan UNPAID (izin/sakit tidak eligible quota)
- Potongan incident (`payrollDeduction`)
- SP penalty (`SP_MULTIPLIER`)
- Adjustment manual (wajib alasan)

### Konstanta (`config/constants.ts`)
```typescript
POINT_TARGET_HARIAN = 13_000
DIVISION_POINT_TARGET_OVERRIDES = { OFFSET: 39_000 }
BONUS_KINERJA_LEVEL   // tabel level bonus
SP_MULTIPLIER
GAJI_POKOK_REGULER_DEFAULT = 1_200_000
GAJI_TRAINING_DEFAULT = 1_000_000
```

### Aturan Wajib Phase 3
1. **Jangan hitung payroll di client component** — server actions only
2. Gunakan **PostgreSQL transactions** untuk closing, kuota, adjustment
3. Wajib pakai **snapshot** — jangan query live data saat hitung payroll
4. Setelah periode di-lock → perubahan hanya lewat **adjustment**
5. Buat **audit log** untuk setiap aksi closing, adjustment, override

---

## Risiko & Catatan Teknis

| Item | Detail |
|---|---|
| SSH tunnel wajib untuk dev lokal | `ssh -L 5433:10.0.4.6:5432 teknos@103.240.110.218 -N` sebelum `pnpm dev` |
| Port 5432 lokal terpakai | Laptop sudah punya PostgreSQL lokal → pakai port 5433 |
| Supabase subdomain tidak expose SSH | SSH hanya via IP langsung: `103.240.110.218` |
| Leave quota belum auto-generate | `generateLeaveQuota` ada di code, UI admin belum dibuat |
| Training max 3 bulan | Business rule ada di docs, belum enforcement di code |
| Payroll snapshot belum ada | Phase 3 butuh tabel snapshot baru |

---

## Referensi File Penting

| File | Isi |
|---|---|
| `references/business-rules.md` | Aturan bisnis lengkap |
| `references/project-concept-3-phase.md` | Konsep 3 phase + scope + aktor |
| `references/tech-stack.md` | Pilihan teknologi dan reasoning |
| `CLAUDE.md` | Instruksi untuk AI agent di repo ini |
| `scripts/seed-admin.ts` | Script buat user SUPER_ADMIN pertama |

---

## Commit History Penting

```
01b3b62  update dashboard (redesign UI)
9ed3fde  fix: suppress body hydration warning
7573615  fix: migrate middleware.ts → proxy.ts (Next.js 16)
30ad2e9  audit: harden access controls
67d2b54  Merge feat/phase1a-auth-master-data → main
fbe8cc8  feat: complete Phase 2 — HR modules
```

---

*Update terakhir: 2026-04-28. Status: QA/Staging. Untuk Phase 3, mulai dengan `references/business-rules.md` seksi Payroll.*
