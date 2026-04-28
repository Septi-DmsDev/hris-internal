# Struktur Project

## 1. Gambaran Umum

Repo ini mengikuti pola Next.js App Router dengan pemisahan cukup jelas antara:

- `src/app` untuk UI dan route,
- `src/server/actions` untuk boundary bisnis,
- `src/server/*-engine` untuk kalkulasi,
- `src/lib/db/schema` untuk model data,
- `src/lib/validations` untuk kontrak input,
- `src/components` untuk reusable UI.

## 2. Struktur Root

| File/Folder | Fungsi nyata | Dipakai oleh | Catatan |
|---|---|---|---|
| `AGENTS.md` | aturan kerja agent pada repo ini | agent/developer | wajib dibaca sebelum mengubah code |
| `HANDOVER.md` | catatan status project dan setup environment | developer/project lead | ada beberapa bagian yang tertinggal dari code aktual |
| `CLAUDE.md` | instruksi AI tambahan | agent | sejalan dengan `AGENTS.md` |
| `references/` | dokumen business rule dan arsitektur | semua pihak | acuan bisnis utama |
| `src/` | seluruh source code aplikasi | Next.js runtime | pusat codebase |
| `supabase/migrations/` | migration SQL hasil Drizzle | database | tidak terlihat policy RLS |
| `scripts/seed-admin.ts` | seed user admin awal | setup admin | berguna untuk bootstrap role pertama |
| `components.json` | config shadcn/ui | generator component | base color `slate`, css variable aktif |
| `package.json` | dependency dan script | pnpm | script resmi hanya `dev`, `build`, `start`, `lint` |
| `drizzle.config.ts` | config output migration dan schema Drizzle | Drizzle Kit | schema di `src/lib/db/schema` |
| `vitest.config.ts` | alias dan environment test | Vitest | memakai environment `node` |
| `README.md` | README default template | repo consumer | belum diperbarui |

## 3. Struktur `src`

```text
src/
├── app/                  # halaman, layout, route handler
├── components/           # reusable UI dan layout
├── config/               # konstanta bisnis
├── lib/                  # auth, db, permissions, utils, validations
├── server/               # actions, engine, service
├── types/                # type union lintas modul
└── proxy.ts              # auth redirect layer untuk Next.js 16
```

## 4. Struktur `src/app`

| Path | Fungsi nyata | Catatan |
|---|---|---|
| `src/app/layout.tsx` | root layout, font Plus Jakarta Sans, metadata app | memuat `globals.css` |
| `src/app/page.tsx` | redirect root ke `/login` | tidak ada landing page publik |
| `src/app/globals.css` | token warna dan typography global | design system “Ink & Teal” |
| `src/app/(auth)/login/*` | halaman login dan form login | client form memanggil `loginAction()` |
| `src/app/(dashboard)/layout.tsx` | guard login + render sidebar dan header | membaca role dari `user_roles` |
| `src/app/(dashboard)/dashboard/*` | halaman ringkasan utama | membaca `getDashboardStats()` |
| `src/app/(dashboard)/employees/*` | list, form, detail profil karyawan | modul Phase 1 |
| `src/app/(dashboard)/master/*` | CRUD master data | branch, division, position, grade, work schedule |
| `src/app/(dashboard)/performance/*` | katalog poin, aktivitas, monthly performance | modul Phase 2 |
| `src/app/(dashboard)/performance/training/*` | evaluasi training | modul Phase 2 |
| `src/app/(dashboard)/tickets/*` | ticket izin/sakit/cuti | modul Phase 2 |
| `src/app/(dashboard)/reviews/*` | review + incident | modul Phase 2 |
| `src/app/(dashboard)/payroll/*` | workspace payroll, detail payroll, export, payslip | modul Phase 3 |
| `src/app/(dashboard)/finance/*` | finance dashboard | membaca hasil payroll |
| `src/app/(dashboard)/settings/.gitkeep` | placeholder menu settings | belum ada page |
| `src/app/api/.gitkeep` | placeholder API folder | belum dipakai |

## 5. Struktur `src/lib`

| Path | Fungsi nyata | Catatan |
|---|---|---|
| `src/lib/auth/session.ts` | session helper server-side | entry point auth di action |
| `src/lib/db/index.ts` | membuat singleton Drizzle client | aman dipakai di dev dan prod |
| `src/lib/db/schema/*` | definisi tabel/enum/type infer | sumber kebenaran model |
| `src/lib/supabase/server.ts` | server client Supabase berbasis cookie | dipakai login/logout/getUser |
| `src/lib/supabase/client.ts` | browser client Supabase | belum dominan dipakai |
| `src/lib/permissions/index.ts` | permission matrix per role | lebih bersifat helper/tes, bukan enforcement utama |
| `src/lib/validations/*` | schema Zod semua action penting | kontrak input nyata |
| `src/lib/utils/index.ts` | helper `cn()` | dipakai komponen UI |

## 6. Struktur `src/server`

| Path | Fungsi nyata | Catatan |
|---|---|---|
| `src/server/actions/*` | server action untuk query/mutation | inilah boundary paling penting |
| `src/server/point-engine/*` | kalkulasi target/performa dan parser workbook | testable, pure function |
| `src/server/payroll-engine/*` | periode, level bonus, kalkulator payroll, export, payslip | paling sensitif |
| `src/server/services/point-catalog-service.ts` | helper query katalog poin | dipakai action performance |
| `src/server/review-engine/.gitkeep` | placeholder | belum ada logic terpisah |
| `src/server/ticketing-engine/.gitkeep` | placeholder | belum ada logic terpisah |

## 7. Struktur `src/components`

| Path | Fungsi nyata | Catatan |
|---|---|---|
| `src/components/layout/Sidebar.tsx` | navigasi modul berdasarkan role | filtering role ada di sini |
| `src/components/layout/Header.tsx` | identitas user + logout | form action ke `logoutAction()` |
| `src/components/tables/DataTable.tsx` | wrapper TanStack Table + search + pagination | dipakai hampir semua modul |
| `src/components/ui/*` | wrapper shadcn/ui dan Radix | button, input, dialog, tabs, badge, table, dst |
| `src/components/forms/.gitkeep` | placeholder | belum dipakai |
| `src/components/charts/.gitkeep` | placeholder | chart khusus belum dibuat |

## 8. Boundary Penting yang Harus Diingat

```text
UI layer
→ src/app/(dashboard)/* dan src/components/*

Validation layer
→ src/lib/validations/*

Access control layer
→ src/proxy.ts + src/lib/auth/session.ts

Business action layer
→ src/server/actions/*

Rule engine layer
→ src/server/point-engine/* + src/server/payroll-engine/*

Persistence layer
→ src/lib/db/schema/* + src/lib/db/index.ts
```

## 9. Folder yang Sudah Disiapkan tapi Belum Aktif

| Folder/File | Status | Catatan |
|---|---|---|
| `src/app/(dashboard)/settings/.gitkeep` | belum tersedia | menu ada di sidebar hanya untuk `SUPER_ADMIN`, tetapi route page belum dibuat |
| `src/app/api/.gitkeep` | belum tersedia | saat ini route handler hanya ada di payroll detail/export |
| `src/server/review-engine/.gitkeep` | belum tersedia | review formula masih tinggal di `reviews.ts` |
| `src/server/ticketing-engine/.gitkeep` | belum tersedia | ticket logic masih tinggal di `tickets.ts` |
| `src/components/forms/.gitkeep` | belum tersedia | form besar masih langsung ditulis di client component |
| `src/components/charts/.gitkeep` | belum tersedia | dashboard belum memakai chart reusable |

## 10. Cara Cepat Mencari Alur Kode

Untuk memahami satu fitur:

1. cari page di `src/app/(dashboard)/.../page.tsx`,
2. lihat client component yang dipakai page itu,
3. cari action di `src/server/actions`,
4. lihat schema Zod yang dipakai,
5. lihat tabel di `src/lib/db/schema`,
6. jika ada kalkulasi, lihat engine terkait,
7. cek test file bila tersedia.
