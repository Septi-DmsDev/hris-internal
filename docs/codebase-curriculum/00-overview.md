# Overview

## 1. Tujuan Dokumen

Dokumen ini memberi gambaran besar project sebelum masuk ke level file. Fokusnya adalah menjawab:

- sistem ini mengerjakan apa,
- modul apa saja yang benar-benar ada di code,
- modul mana yang masih parsial,
- bagaimana hubungan antar modul.

## 2. Identitas Project

Project ini adalah dashboard internal HRD yang dibangun dengan:

- Next.js `16.2.4` App Router
- React `19.2.4`
- TypeScript
- Supabase Auth + `@supabase/ssr`
- Drizzle ORM + PostgreSQL
- Tailwind CSS v4
- shadcn/ui + Radix UI
- TanStack Table
- Zod v4
- date-fns
- Vitest

Fungsi bisnis yang sudah muncul di code:

- login dan session Supabase,
- master data cabang/divisi/jabatan/grade/jadwal kerja,
- profiling karyawan dan histori perubahan,
- katalog poin dan import workbook,
- aktivitas harian TEAMWORK,
- approval aktivitas,
- generate performa bulanan,
- ticketing izin/sakit/cuti,
- leave quota,
- review karyawan,
- incident log,
- evaluasi training,
- payroll period, preview, finalisasi, paid, lock,
- export Excel payroll,
- payslip PDF,
- finance dashboard berbasis payroll result.

## 3. Arsitektur Singkat

```text
User Browser
→ Next.js App Router page / client component
→ server action / route handler
→ validation Zod
→ auth + role check
→ Drizzle query / transaction
→ rule engine / helper service
→ PostgreSQL
→ response ke UI
```

## 4. Entry Point Utama

| Area | File | Peran |
|---|---|---|
| Auth gate request | `src/proxy.ts` | redirect user ke `/login` atau `/dashboard` berdasarkan session Supabase |
| Auth helper server-side | `src/lib/auth/session.ts` | `getUser`, `requireAuth`, `checkRole`, `getCurrentUserRoleRow`, `getCurrentUserRole` |
| Koneksi database | `src/lib/db/index.ts` | inisialisasi Drizzle ke `DATABASE_URL` |
| Definisi tabel | `src/lib/db/schema/*` | sumber kebenaran model data |
| Boundary business logic | `src/server/actions/*` | query dan mutation yang dipanggil UI |
| Rule engine | `src/server/point-engine/*`, `src/server/payroll-engine/*` | kalkulasi yang dipisahkan dari UI |
| Dashboard UI | `src/app/(dashboard)/*` | halaman internal setelah login |

## 5. Peta Relasi Modul

```text
Master Data
  ↓
Profiling Karyawan
  ↓
Jadwal Kerja + Divisi Snapshot + Status Kerja
  ↓
Performance Point / Ticketing / Review / Incident / Training
  ↓
Monthly Point Performance + Managerial KPI + Approved Ticket + Incident
  ↓
Payroll Snapshot
  ↓
Payroll Result + Payslip + Finance Dashboard
```

## 6. Status Implementasi Aktual

| Modul | Status | Catatan |
|---|---|---|
| Auth & session | ada | role check server-side ada, tetapi RLS policy tidak terlihat di repo |
| Master data | ada | CRUD lengkap untuk branch, division, position, grade, work schedule |
| Employee profiling | ada | create, update, delete, histori, detail page |
| Performance point | ada, parsial | katalognya versioned, approval ada, tetapi self-service TEAMWORK belum ada dan deadline H+1/H+2 belum dienforce |
| Ticketing leave | ada, parsial | approval dan quota ada, tetapi self-service diblokir karena belum ada mapping `auth user -> employee` |
| Review & incident | ada | review score 5 aspek, validate review, create incident |
| Training evaluation | ada, parsial | evaluasi ada, keputusan lulus/tidak lolos ada, tetapi rule “efektif payroll berikutnya” belum diwujudkan |
| Payroll | ada, parsial tapi cukup besar | period, snapshot, preview, finalize, paid, lock, export Excel, payslip PDF sudah ada |
| Finance dashboard | ada | membaca payroll result dan summary per divisi |
| Settings | belum ada | folder ada, belum ada page |
| `src/app/api` | belum ada API custom | hanya `.gitkeep` |
| `src/server/review-engine` dan `src/server/ticketing-engine` | belum terpakai | folder placeholder saja |

## 7. Inkonsistensi Dokumen vs Code

| Sumber dokumen | Catatan inkonsistensi |
|---|---|
| `HANDOVER.md` | masih menyebut Phase 3 “belum dimulai”, padahal code aktual sudah punya schema payroll, action payroll, payslip PDF, export Excel, finance page |
| `docs/onboarding-curriculum.md` | masih menyebut `src/middleware.ts`, padahal repo sekarang memakai `src/proxy.ts` |
| `README.md` root | masih default Create Next App, belum mewakili project HRD Dashboard |
| `references/business-rules.md` vs code training | dokumen meminta status reguler efektif periode payroll berikutnya, tetapi `graduateTrainee()` langsung mengubah status karyawan saat action dipanggil |
| `references/business-rules.md` vs code performance | dokumen meminta TW input H+1 dan SPV approve H+2, tetapi `performance.ts` belum menegakkan batas waktu itu |
| `references/business-rules.md` vs code ticketing | dokumen mendesain self-service karyawan, tetapi `createTicket()` menolak role `TEAMWORK` dan `MANAGERIAL` karena mapping auth ke employee belum tersedia |

## 8. Risiko Teknis Paling Penting

- Repo tidak menunjukkan migration/policy RLS.
- Mapping `auth user -> employee` belum ada, sehingga self-access TEAMWORK/MANAGERIAL belum kuat.
- Beberapa field payroll seperti `dailyAllowanceAmount` dan `overtimeRateAmount` ada di schema/UI, tetapi preview payroll saat ini masih mengisi nominal dibayar `0`.
- Payroll read scope tidak dibatasi per divisi. Semua role payroll yang lolos check dapat melihat seluruh data payroll.

## 9. Cara Memakai Kurikulum Ini

Jika baru mulai memahami codebase:

1. baca auth dan structure;
2. baca schema;
3. pilih satu modul;
4. ikuti alur: page → client component → server action → schema/engine;
5. cocokkan dengan dokumen business rules;
6. catat gap yang muncul.
