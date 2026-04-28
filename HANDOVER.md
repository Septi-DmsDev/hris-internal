# HRD Dashboard — Handover Document

**Tanggal:** 2026-04-28  
**Branch aktif:** `feat/phase1a-auth-master-data`  
**Remote:** `https://github.com/Septi-DmsDev/hris-internal.git`  
**Commit terakhir:** `fbe8cc8` — feat: complete Phase 2 — HR modules

---

## Ringkasan Proyek

Dashboard HRD internal untuk mengelola karyawan, poin kinerja harian, review, ticketing izin/sakit/cuti, training evaluation, dan (Phase 3) payroll. Dibangun dengan Next.js 16 App Router + Supabase Auth + Drizzle ORM + PostgreSQL.

---

## Status Phase

| Phase | Nama | Status |
|---|---|---|
| Phase 1 | Profiling Karyawan & Master Data Foundation | ✅ Selesai |
| Phase 2 | Performance Management Engine | ✅ Selesai |
| Phase 3 | Payroll System & Finance Closing | ✅ Selesai |

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | Next.js 16.2.4 (App Router, React 19) |
| Auth | Supabase Auth + `@supabase/ssr` 0.10.2 |
| ORM | Drizzle ORM 0.45.2 + `postgres` 3.4.9 |
| Database | PostgreSQL (hosted di Supabase) |
| UI | shadcn/ui (slate theme), Tailwind CSS v4, Radix UI primitives |
| Table | TanStack Table v8 (`@tanstack/react-table`) |
| Validation | Zod v4 (gunakan `.issues`, bukan `.errors`) |
| Dates | `date-fns` v4 |
| Testing | Vitest v4 + `@testing-library/react` |
| Linting | ESLint + Prettier + Husky + lint-staged |

---

## Struktur Folder Penting

```
src/
├── app/
│   ├── (auth)/                    # Login page
│   └── (dashboard)/
│       ├── layout.tsx             # Sidebar + header wrapper
│       ├── dashboard/page.tsx     # Dashboard HRD (stat cards, pending alerts, division performance)
│       ├── employees/             # Daftar + detail karyawan
│       ├── master/                # Branches, Divisions, Positions, Grades, Work Schedules
│       ├── performance/           # Aktivitas harian + performa bulanan + katalog poin
│       │   └── training/          # Training evaluation per trainee
│       ├── tickets/               # Ticketing izin/sakit/cuti
│       └── reviews/               # Review karyawan + incident log
├── components/
│   ├── tables/DataTable.tsx       # TanStack Table wrapper reusable
│   └── ui/                        # shadcn components (badge, button, dialog, tabs, input, dll)
├── config/
│   └── constants.ts               # POINT_TARGET_HARIAN, DIVISION_POINT_TARGET_OVERRIDES, dll
├── lib/
│   ├── auth/session.ts            # getUser, requireAuth, checkRole, getCurrentUserRoleRow, getCurrentUserRole
│   ├── db/
│   │   ├── index.ts               # Drizzle client
│   │   └── schema/
│   │       ├── auth.ts            # userRoleEnum, userRoles
│   │       ├── master.ts          # branches, divisions, positions, grades, work schedules
│   │       ├── employee.ts        # employees + status/position/grade/division/supervisor histories
│   │       ├── point.ts           # point catalog, daily activity entries, monthly performances
│   │       ├── hr.ts              # attendance tickets, leave quotas, employee reviews, incident logs
│   │       └── index.ts           # re-export semua schema
│   └── validations/
│       ├── hr.ts                  # createTicketSchema, ticketDecisionSchema, createReviewSchema, createIncidentSchema
│       └── point.ts               # validasi untuk point catalog
└── server/actions/
    ├── dashboard.ts               # getDashboardStats (aggregasi HRD)
    ├── reviews.ts                 # getReviews, createReview, validateReview, createIncident
    ├── tickets.ts                 # getTickets, createTicket, approveTicket, rejectTicket, cancelTicket, generateLeaveQuota
    ├── training.ts                # getTrainingEvaluations, graduateTrainee, failTrainee
    ├── performance.ts             # getScopedActivityEntries, createActivityEntry, updateActivityEntry, deleteActivityEntry, approveActivity, rejectActivity, generateMonthlyPerformance
    └── point-catalog.ts           # getPointCatalogVersions, importPointCatalog, dll
```

---

## Database Schema (Drizzle)

### Schema: `auth.ts`
```
userRoles: id, userId (unique), role (enum), divisionId (null = semua divisi)
```
**Roles:** `SUPER_ADMIN | HRD | FINANCE | SPV | TEAMWORK | MANAGERIAL | PAYROLL_VIEWER`

### Schema: `master.ts`
```
branches:   id, name, address, isActive
divisions:  id, name, code (unique), branchId, trainingPassPercent (default 80), isActive
positions:  id, name, code (unique), employeeGroup (MANAGERIAL|TEAMWORK), isActive
grades:     id, name, code (unique), description, isActive
workSchedules + workScheduleDays + employeeScheduleAssignments
```

### Schema: `employee.ts`
```
employees: id, employeeCode (unique), fullName, startDate, branchId, divisionId,
           positionId, gradeId, employeeGroup, employmentStatus, payrollStatus,
           supervisorEmployeeId, trainingGraduationDate, isActive

employmentStatus enum: TRAINING | REGULER | DIALIHKAN_TRAINING | TIDAK_LOLOS | NONAKTIF | RESIGN
payrollStatus enum:    TRAINING | REGULER | FINAL_PAYROLL | NONAKTIF

+ history tables: division, position, grade, supervisor, status histories
```

### Schema: `point.ts`
```
pointCatalogVersions:   versioning master poin (DRAFT | ACTIVE | ARCHIVED)
pointCatalogEntries:    daftar pekerjaan + poin satuan per divisi per versi
divisionPointTargetRules: target poin harian per divisi per versi
dailyActivityEntries:   input aktivitas harian TW (dengan snapshot poin)
dailyActivityApprovalLogs: audit trail approval
monthlyPointPerformances: rekap performa bulanan per karyawan

activityStatus enum: DRAFT | DIAJUKAN | DITOLAK_SPV | REVISI_TW | DIAJUKAN_ULANG |
                     DISETUJUI_SPV | OVERRIDE_HRD | DIKUNCI_PAYROLL
```

### Schema: `hr.ts`
```
attendanceTickets:  ticketing izin/sakit/cuti (CUTI|SAKIT|IZIN|EMERGENCY|SETENGAH_HARI)
  status: DRAFT|SUBMITTED|AUTO_APPROVED|AUTO_REJECTED|NEED_REVIEW|
          APPROVED_SPV|APPROVED_HRD|REJECTED|CANCELLED|LOCKED
  payrollImpact: UNPAID|PAID_QUOTA_MONTHLY|PAID_QUOTA_ANNUAL

leaveQuotas:        kuota cuti per karyawan per tahun
  monthlyQuotaTotal (default 12), monthlyQuotaUsed
  annualQuotaTotal (default 3), annualQuotaUsed

employeeReviews:    review kualitas kerja 5 aspek (skor 1-5 masing-masing)
  status: DRAFT|SUBMITTED|VALIDATED|LOCKED

incidentLogs:       log kejadian (KOMPLAIN|MISS_PROSES|TELAT|AREA_KOTOR|PELANGGARAN|SP1|SP2|PENGHARGAAN)
  impact: REVIEW_ONLY|PAYROLL_POTENTIAL|NONE
```

---

## Business Rules Kritis

### Poin Kinerja TEAMWORK
- Target harian default: **13.000 poin**
- Target harian divisi Offset: **39.000 poin**
- Target bulanan = target harian × jumlah hari masuk target
- Persentase = total poin approved / target bulanan × 100%
- Hari Cuti/Sakit/Izin **approved** → tidak masuk target (target = 0, poin = 0)
- Hari Alpa → masuk target tapi poin = 0
- TW input max H+1, SPV approve max H+2, revisi TW max H+1, SPV approve ulang max H+1

### Bonus Kinerja
| Persentase | Bonus Kinerja | Bonus Prestasi |
|---|---|---|
| < 80% | 0 | 0 |
| 80–89.99% | bonus 80% | 0 |
| 90–99.99% | bonus 90% | 0 |
| 100–139.99% | bonus 100% | 0 |
| 140–164.99% | bonus 100% | prestasi 140% |
| ≥ 165% | bonus 100% | prestasi 165% saja (bukan 140%+165%) |

### Training Evaluation
- Standar lulus per divisi diambil dari `divisions.trainingPassPercent` (default 80)
- Kategori: `LULUS` (avg ≥ pass%), `MENDEKATI` (avg ≥ pass% × 0.8), `BELUM_LULUS`
- Lulus training: set `employmentStatus = REGULER`, `payrollStatus = REGULER`, `trainingGraduationDate`
- Status reguler efektif mulai periode payroll **berikutnya**

### Leave Quota Auto-Consume
- Karyawan masa kerja > 12 bulan → eligible leave quota
- Saat ticket disetujui: cek `monthlyQuotaUsed < monthlyQuotaTotal` → `PAID_QUOTA_MONTHLY`
- Jika monthly habis: cek `annualQuotaUsed < annualQuotaTotal` → `PAID_QUOTA_ANNUAL`
- Jika keduanya habis atau belum eligible → `UNPAID`

### Review Scoring (5 Aspek)
```
total = (sopQuality×0.25 + instruction×0.15 + attendanceDiscipline×0.20
        + initiativeTeamwork×0.20 + processMiss×0.20) / 5 × 100

Kategori:
≥90  → Sangat Baik
≥80  → Baik
≥70  → Cukup
≥60  → Kurang
<60  → Buruk
```

### Periode Payroll
- Tanggal 26 bulan sebelumnya s.d. tanggal 25 bulan berjalan
- Payroll wajib menggunakan **snapshot** awal periode (divisi, jabatan, grade, gaji, status)

### Role Scoping
- `SPV`: hanya melihat/mengakses data divisinya sendiri (`roleRow.divisionId`)
- `HRD` dan `SUPER_ADMIN`: akses semua divisi (`divisionId = null`)
- Pattern di semua query: `isSPV ? eq(employees.divisionId, roleRow.divisionId!) : undefined`

---

## Auth & Session Pattern

```typescript
// src/lib/auth/session.ts — semua ini tersedia
await requireAuth()               // throw jika tidak login
await checkRole(["HRD","SPV"])    // return { error } jika role tidak sesuai
await getCurrentUserRoleRow()     // { id, userId, role, divisionId }
await getCurrentUserRole()        // "HRD" | "SPV" | dll
await getUser()                   // Supabase user object
```

Server actions wajib mulai dengan `requireAuth()` atau `checkRole(...)`.

---

## Komponen UI Reusable

```typescript
// DataTable — wrapper TanStack Table
<DataTable data={rows} columns={columns} searchKey="employeeName" searchPlaceholder="Cari..." />

// Tabs (shadcn/ui — @radix-ui/react-tabs)
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Badge, Button, Dialog, Input — shadcn/ui standar
```

---

## Cara Jalankan Lokal

```bash
pnpm install
pnpm dev          # Next.js dev server
pnpm vitest run   # Run tests (22 tests, 6 files)
pnpm tsc --noEmit # Type check (butuh pnpm dev/build dulu agar .next/types ada)
pnpm drizzle-kit push  # Push schema ke Supabase
```

> **Catatan:** `pnpm tsc --noEmit` mungkin error `ERR_MODULE_NOT_FOUND` untuk `.next/types/routes.d.ts` jika belum pernah dijalankan `pnpm dev` atau `pnpm build`. Ini normal — jalankan `pnpm dev` sekali, lalu type check akan bersih.

---

## Halaman yang Sudah Ada

| URL | File | Deskripsi |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | Stat cards karyawan, pending alerts, performa divisi, aktivitas by status, incident summary |
| `/employees` | `employees/page.tsx` | DataTable semua karyawan + link ke detail |
| `/employees/[id]` | `employees/[id]/page.tsx` | Detail profil, histori status, jadwal |
| `/master/branches` | `master/branches/page.tsx` | CRUD cabang |
| `/master/divisions` | `master/divisions/page.tsx` | CRUD divisi |
| `/master/positions` | `master/positions/page.tsx` | CRUD jabatan |
| `/master/grades` | `master/grades/page.tsx` | CRUD grade |
| `/master/work-schedules` | `master/work-schedules/page.tsx` | CRUD jadwal kerja |
| `/performance` | `performance/page.tsx` | Tabs: Aktivitas Harian + Performa Bulanan + Katalog Poin |
| `/performance/training` | `performance/training/page.tsx` | Evaluasi per trainee dengan progress bar |
| `/tickets` | `tickets/page.tsx` | Ticketing izin/sakit/cuti dengan approval workflow |
| `/reviews` | `reviews/page.tsx` | Tabs: Review Karyawan + Incident Log |

---

## Yang Perlu Dibangun: Phase 3 — Payroll System

### Scope Phase 3

**3.1 Payroll Calculation Engine (server-side only)**
- Schema: `payroll_periods`, `payroll_snapshots`, `payroll_components`, `payroll_adjustments`, `payroll_results`
- Input: data dari `monthlyPointPerformances` (poin + %), `attendanceTickets` (izin/sakit/cuti), `employeeReviews`, `incidentLogs` (potongan), gaji pokok dari grade/status
- Output: `payroll_results` per karyawan per periode dengan breakdown komponen

**Komponen gaji yang perlu dihitung:**
- Gaji pokok (training: Rp1.000.000, reguler: Rp1.200.000 atau sesuai grade)
- Prorate untuk training masuk tengah periode (berdasar hari aktif)
- Bonus kinerja (berdasarkan tabel % di atas)
- Bonus prestasi (hanya jika ≥ 140%)
- Potongan gaji (izin/sakit/cuti UNPAID)
- Potongan incident (`incidentLogs.payrollDeduction`)
- SP penalty (`SP_MULTIPLIER` dari constants.ts)
- Adjustment manual (tambah/potong) dengan alasan wajib

**3.2 Payroll Period Management**
- Generate periode payroll (26 s/d 25)
- Snapshot data karyawan di awal periode (divisi, jabatan, grade, status, gaji)
- Locking periode setelah closing

**3.3 Payroll UI Pages**
- `/payroll` — daftar periode payroll
- `/payroll/[periodId]` — breakdown per karyawan
- `/payroll/[periodId]/[employeeId]` — detail slip gaji
- Export slip gaji (PDF atau Excel)

**3.4 Finance Dashboard**
- Total cost payroll per periode
- Breakdown per divisi
- History dan tren

### Konstanta yang Sudah Tersedia di `constants.ts`
```typescript
POINT_TARGET_HARIAN = 13_000
DIVISION_POINT_TARGET_OVERRIDES = { OFFSET: 39_000 }
BONUS_KINERJA_LEVEL  // tabel level bonus
STANDAR_LULUS_TRAINING  // per divisi (sudah dipindah ke DB: divisions.trainingPassPercent)
SP_MULTIPLIER
GAJI_POKOK_REGULER_DEFAULT = 1_200_000
GAJI_TRAINING_DEFAULT = 1_000_000
```

### Aturan Penting untuk Phase 3
1. **Jangan pernah hitung payroll di client component** — semua di server actions / services.
2. Gunakan **PostgreSQL transactions** untuk payroll closing, kuota cuti, dan adjustment.
3. Payroll wajib memakai **snapshot** — jangan query live data karyawan saat hitung payroll.
4. Setelah periode di-lock, perubahan hanya lewat **adjustment** (bukan edit langsung).
5. Buat **audit log** untuk setiap aksi closing, adjustment, dan override.

---

## Risiko dan Catatan Teknis

| Risiko | Detail |
|---|---|
| Schema belum di-migrate | `hr.ts` schema (tickets, leaveQuotas, reviews, incidents) sudah ditulis tapi perlu `pnpm drizzle-kit push` ke Supabase |
| Leave quota belum auto-generate | `generateLeaveQuota` ada di `tickets.ts` tapi UI-nya belum ada — perlu halaman admin atau trigger otomatis saat karyawan ulang tahun kerja |
| Training max 3 bulan | Business rule ada di docs tapi belum ada enforcement di code |
| Payroll snapshot belum ada | Phase 3 butuh tabel snapshot yang belum dibuat |
| Testing | 22 vitest tests untuk point engine. Phase 3 butuh test untuk payroll calculation engine |

---

## Referensi File Penting

| File | Isi |
|---|---|
| `references/business-rules.md` | Aturan bisnis lengkap (poin, bonus, training, ticketing, review, payroll) |
| `references/project-concept-3-phase.md` | Konsep 3 phase proyek lengkap dengan scope dan aktor |
| `references/tech-stack.md` | Pilihan teknologi dan reasoning |
| `references/implementation-playbook.md` | Panduan implementasi |
| `CLAUDE.md` | Instruksi khusus untuk AI agent yang bekerja di repo ini |

---

## Commit History Phase 1 & 2

```
fbe8cc8  feat: complete Phase 2 — HR modules (ticketing, reviews, incidents, training eval, dashboard)
873bc5f  feat: improve phase 2 performance UI with tabs and UX fixes
2bfd4c8  feat: add phase 2 performance management engine
78a01a9  feat: add phase 2 point catalog foundation
6eff3de  docs: redefine phase 2 point target rules
a9dc229  feat: add phase 1 employee profiling and work schedules
6b29cc0  feat: add CRUD dialogs for positions and grades master pages
97179df  feat: add CRUD dialogs for branches and divisions master pages
ac75a2b  feat: add master data pages for positions and grades
abbb546  feat: add master data pages for branches and divisions
```

---

*Dokumen ini dibuat otomatis pada 2026-04-28. Untuk melanjutkan ke Phase 3, mulai dengan membaca `references/business-rules.md` (seksi Payroll) dan `references/project-concept-3-phase.md` (Phase 3 detail).*
