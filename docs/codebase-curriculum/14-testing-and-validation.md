# Testing and Validation

## 1. Tujuan Dokumen

Menjelaskan:

- test yang sudah ada,
- cara menjalankan validasi repo,
- area yang belum tercakup test.

## 2. Command yang Perlu Diketahui

```bash
pnpm vitest run
pnpm lint
pnpm tsc --noEmit
pnpm build
```

Catatan:

- `package.json` hanya punya script `lint`, tetapi `pnpm vitest run` dan `pnpm tsc --noEmit` tetap bisa dijalankan langsung karena binary tersedia dari dependency.
- `tsconfig.json` memasukkan `.next/types/**/*.ts` dan `.next/dev/types/**/*.ts`.
  Jadi untuk `pnpm tsc --noEmit`, idealnya jalankan `pnpm dev` atau `pnpm build` dulu agar type file Next.js tersedia.

## 3. Konfigurasi Test Aktual

| File | Isi penting |
|---|---|
| `vitest.config.ts` | alias `@` ke `./src`, environment `node` |
| `tsconfig.json` | strict mode aktif, noEmit, paths `@/*` |

## 4. Test yang Sudah Ada

| File test | Fokus |
|---|---|
| `src/config/constants.test.ts` | resolver target poin divisi |
| `src/lib/permissions/index.test.ts` | permission matrix per role |
| `src/lib/validations/employee.test.ts` | validasi employee dan work schedule |
| `src/lib/validations/payroll.test.ts` | validasi salary config dan KPI managerial |
| `src/server/point-engine/parse-master-point-workbook.test.ts` | parser workbook poin |
| `src/server/point-engine/count-target-days-for-period.test.ts` | hitung target days |
| `src/server/point-engine/calculate-monthly-point-performance.test.ts` | hitung performa bulanan |
| `src/server/payroll-engine/resolve-payroll-period.test.ts` | periode payroll 26-25 |
| `src/server/payroll-engine/resolve-bonus-level.test.ts` | level bonus kinerja/prestasi |
| `src/server/payroll-engine/calculate-teamwork-payroll.test.ts` | payroll TEAMWORK |
| `src/server/payroll-engine/calculate-managerial-payroll.test.ts` | payroll MANAGERIAL |
| `src/server/payroll-engine/build-payroll-export-rows.test.ts` | format export Excel |
| `src/server/payroll-engine/build-payslip-breakdown.test.ts` | grouping addition/deduction slip |
| `src/server/payroll-engine/resolve-payroll-status-transition.test.ts` | aturan paid/lock |
| `src/server/payroll-engine/summarize-payroll-results.test.ts` | summary finance global dan per divisi |

## 5. Apa yang Sudah Dites

### Rule Engine Point

- target default `13.000`
- override `OFFSET`
- target day dari assignment tunggal dan assignment berganti
- persentase bulanan dari target vs approved point
- normalisasi workbook poin

### Rule Engine Payroll

- resolver periode anchor `YYYY-MM`
- level bonus tanpa menumpuk bonus prestasi
- payroll TEAMWORK training/reguler
- payroll MANAGERIAL berbasis KPI
- penalty SP ke bonus
- unpaid leave, incident deduction, manual adjustment
- status transition `FINALIZED → PAID → LOCKED`
- breakdown slip
- summary finance

### Validation

- supervisor wajib untuk employee `TEAMWORK`
- transform string tanggal menjadi `Date`
- jadwal kerja harus punya 7 hari unik
- nominal payroll tidak boleh negatif
- KPI managerial dibatasi 0–200

## 6. Test yang Masih Kurang

| Area | Gap |
|---|---|
| Server action auth | belum ada test login/logout |
| Server action master | belum ada test CRUD branch/division/position/grade/work schedule |
| Employee action | belum ada test histori create/update |
| Performance action | belum ada test workflow save/submit/approve/reject/generate |
| Ticketing action | belum ada test quota consume monthly/annual, cancel rule, scope SPV |
| Review action | belum ada test formula review di level action dan scope SPV |
| Training action | belum ada test kategori training dan keputusan lulus/gagal |
| Payroll action | belum ada integration test preview/finalize/paid/lock |
| Route handler | belum ada test export Excel dan payslip PDF |
| RLS | belum ada test policy |
| E2E | belum ada Playwright atau flow end-to-end |

## 7. Rekomendasi Test Tambahan

### Prioritas Tinggi

- test `tickets.ts`:
  - approve mengonsumsi monthly quota lebih dulu,
  - fallback ke annual quota,
  - fallback ke `UNPAID`,
  - SPV tidak bisa approve lintas divisi.
- test `employees.ts`:
  - update divisi/jabatan/grade/status/supervisor benar-benar menulis history,
  - pergantian schedule menutup assignment lama dengan benar.
- test `performance.ts`:
  - aktivitas beda divisi dengan katalog ditolak,
  - generate monthly memakai divisi snapshot,
  - only approved statuses dihitung.

### Prioritas Menengah

- test `payroll.ts`:
  - preview gagal bila KPI managerial belum lengkap,
  - finalize mengunci monthly performance dan activity,
  - period `PAID`/`LOCKED` tidak bisa digenerate ulang.
- test `training.ts`:
  - SPV hanya melihat trainee divisinya,
  - kategori evaluasi sesuai pass percent divisi.

## 8. Checklist Validasi Sebelum Merge

- `pnpm lint`
- `pnpm vitest run`
- `pnpm tsc --noEmit`
- `pnpm build`
- cek role affected
- cek table affected
- cek business rule affected

## 9. Perlu Review Lanjutan

- repo belum menunjukkan test untuk RLS.
- karena payroll adalah modul paling sensitif, integration test server action layak jadi investasi berikutnya.
