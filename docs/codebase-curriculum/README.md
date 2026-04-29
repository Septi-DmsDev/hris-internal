# HRD Dashboard Codebase Curriculum

## Tujuan

Folder ini adalah kurikulum belajar codebase untuk project HRD Dashboard internal. Isinya dibuat dari code aktual repo per 28 April 2026, bukan dari asumsi, sehingga bisa dipakai untuk:

- onboarding developer baru,
- menyamakan pemahaman owner/project lead,
- memberi konteks ke AI agent berikutnya,
- membantu maintenance harian dan pengembangan fitur baru.

## Cara Membaca

Urutan baca yang direkomendasikan:

1. `00-overview.md`
2. `01-project-structure.md`
3. `02-auth-and-role-access.md`
4. `03-database-schema.md`
5. Dokumen modul:
   `04-master-data-module.md` sampai `10-payroll-module.md`
6. `11-ui-components.md`
7. `12-server-actions-and-business-logic.md`
8. `13-data-flow-and-user-flow.md`
9. `14-testing-and-validation.md`
10. `15-developer-learning-path.md`
11. `16-maintenance-checklist.md`

## Daftar Dokumen

| File | Fokus | Status |
|---|---|---|
| `README.md` | Peta baca kurikulum | lengkap |
| `00-overview.md` | Ringkasan sistem, status implementasi, relasi modul | lengkap |
| `01-project-structure.md` | Struktur repo, boundary folder, file inti | lengkap |
| `02-auth-and-role-access.md` | Auth, session, role, scope akses | sebagian |
| `03-database-schema.md` | Semua schema Drizzle dan relasi bisnis | lengkap |
| `04-master-data-module.md` | Cabang, divisi, jabatan, grade, jadwal kerja | lengkap |
| `05-employee-profiling-module.md` | Profil karyawan, histori, detail page | lengkap |
| `06-performance-point-module.md` | Katalog poin, aktivitas harian, performa bulanan | sebagian |
| `07-ticketing-leave-module.md` | Izin/sakit/cuti dan leave quota | sebagian |
| `08-review-and-incident-module.md` | Review kualitas kerja dan incident | lengkap |
| `09-training-evaluation-module.md` | Evaluasi training berbasis performa | sebagian |
| `10-payroll-module.md` | Period, preview, finalisasi, payslip, finance basis | sebagian |
| `11-ui-components.md` | Layout, reusable UI, table, tabs, dialog | lengkap |
| `12-server-actions-and-business-logic.md` | Ringkasan semua server action | lengkap |
| `13-data-flow-and-user-flow.md` | Alur data dan alur user per modul | lengkap |
| `14-testing-and-validation.md` | Test yang ada, command, gap test | lengkap |
| `15-developer-learning-path.md` | Rencana belajar 12 hari | lengkap |
| `16-maintenance-checklist.md` | Checklist maintenance dan hotspot | lengkap |

## Quick Start untuk Developer Baru

1. Install dependency:
   `pnpm install`
2. Siapkan `.env.local` sesuai `HANDOVER.md`.
3. Jika develop lokal memakai database VPS, aktifkan SSH tunnel lebih dulu.
4. Jalankan dev server:
   `pnpm dev`
5. Pahami auth terlebih dahulu:
   `src/proxy.ts`, `src/lib/auth/session.ts`, `src/lib/permissions/index.ts`
6. Lanjut ke schema:
   `src/lib/db/schema/*`
7. Lanjut ke server actions:
   `src/server/actions/*`
8. Baru masuk ke UI:
   `src/app/(dashboard)/*`

## Status Dokumentasi

- `lengkap`: struktur repo, schema, master data, employee profiling, review, UI reusable, testing, learning path.
- `sebagian`: auth/access, performance, ticketing, training, payroll.
  Alasannya: modul ada dan berjalan, tetapi implementasinya belum sepenuhnya memenuhi semua business rules di dokumen referensi.
- `perlu review lanjutan`: RLS policy database, mapping `auth user -> employee`, enforcement deadline H+1/H+2, rule training “efektif periode payroll berikutnya”, dan komponen payroll seperti overtime/uang harian yang sudah ada di schema/UI tetapi belum dihitung di preview.
