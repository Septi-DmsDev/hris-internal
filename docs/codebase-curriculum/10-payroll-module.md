# Payroll Module

## Status

`status: tersedia, tetapi belum lengkap`

File ditemukan:

- `src/lib/db/schema/payroll.ts`
- `src/lib/validations/payroll.ts`
- `src/server/actions/payroll.ts`
- `src/server/payroll-engine/*`
- `src/app/(dashboard)/payroll/*`
- `src/app/(dashboard)/finance/*`

Gap yang perlu dibangun:

- overtime dan uang harian masih ada di schema/UI tetapi belum dihitung di preview,
- belum ada additions/deductions terpisah selain `payroll_adjustments`,
- rule “koreksi setelah paid masuk periode berikutnya” belum dibantu alur UI khusus,
- belum ada scope payroll per divisi,
- belum terlihat snapshot khusus review/attendance selain ticket/incident/performance.

## 1. Tujuan Modul

Modul payroll mengubah data final dari modul lain menjadi hasil gaji yang bisa diaudit. Modul ini sudah mencakup:

- pembuatan periode payroll,
- salary config per karyawan,
- KPI managerial,
- preview payroll,
- snapshot data employee,
- finalisasi,
- status paid,
- lock periode,
- adjustment manual,
- detail payroll,
- export Excel,
- payslip PDF,
- finance summary.

## 2. File dan Folder Terkait

| File/Folder | Fungsi | Dipakai Oleh | Catatan |
|---|---|---|---|
| `src/lib/db/schema/payroll.ts` | semua tabel payroll | payroll, finance | schema utama |
| `src/lib/validations/payroll.ts` | validasi periode, adjustment, KPI, salary config | action payroll | pakai Zod |
| `src/server/actions/payroll.ts` | workspace dan mutation payroll | UI payroll, route export, finance | action paling kompleks |
| `src/server/payroll-engine/resolve-payroll-period.ts` | resolver anchor `YYYY-MM` ke periode 26-25 | create period | pure |
| `src/server/payroll-engine/resolve-bonus-level.ts` | tabel level bonus | calculator payroll | pure |
| `src/server/payroll-engine/calculate-teamwork-payroll.ts` | payroll TEAMWORK | preview payroll | pure |
| `src/server/payroll-engine/calculate-managerial-payroll.ts` | payroll MANAGERIAL | preview payroll | pure |
| `src/server/payroll-engine/resolve-payroll-status-transition.ts` | aturan paid/lock | mark paid, lock | pure |
| `src/server/payroll-engine/build-payroll-export-rows.ts` | baris export Excel | route export | pure |
| `src/server/payroll-engine/build-payslip-breakdown.ts` | grouping addition/deduction | detail page, PDF | pure |
| `src/server/payroll-engine/summarize-payroll-results.ts` | summary finance global dan per divisi | payroll page, finance page | pure |
| `src/server/payroll-engine/render-payslip-pdf.tsx` | render PDF ke buffer | route payslip | menggunakan React PDF |
| `src/server/payroll-engine/PayslipPdfDocument.tsx` | template slip gaji | render PDF | tampilan final PDF |
| `src/app/(dashboard)/payroll/page.tsx` | workspace payroll | user payroll | merakit data untuk client |
| `src/app/(dashboard)/payroll/PayrollClient.tsx` | UI period, results, adjustment, KPI, salary config | HRD/Finance/Admin | client besar |
| `src/app/(dashboard)/payroll/[periodId]/[employeeId]/page.tsx` | detail payroll per karyawan | payroll reader | breakdown lengkap |
| `src/app/(dashboard)/payroll/[periodId]/export.xlsx/route.ts` | export Excel payroll | browser | node runtime |
| `src/app/(dashboard)/payroll/[periodId]/[employeeId]/payslip.pdf/route.ts` | export PDF payslip | browser | node runtime |
| `src/app/(dashboard)/finance/page.tsx` | finance dashboard | HRD/Finance/Viewer | membaca workspace payroll |
| `src/app/(dashboard)/finance/FinanceDashboardClient.tsx` | summary finance per periode | HRD/Finance/Viewer | read-only |

## 3. Alur Kerja Modul

```text
Buat periode payroll
→ createPayrollPeriod()
→ validate createPayrollPeriodSchema
→ resolvePayrollPeriod("YYYY-MM")
→ insert payroll_periods status OPEN
→ insert payroll_audit_logs action CREATE_PERIOD
```

```text
Siapkan data payroll
→ upsertEmployeeSalaryConfig()
→ upsertManagerialKpiSummary() untuk MANAGERIAL
→ addPayrollAdjustment() bila perlu
```

```text
Generate preview
→ generatePayrollPreview(periodId)
→ ambil employee aktif dengan payrollStatus terkait
→ ambil snapshot divisi/jabatan/grade per awal periode
→ hitung scheduledWorkDays
→ ambil monthly performance atau managerial KPI
→ ambil ticket approved, incident aktif, adjustment
→ hitung payroll per employee dengan engine
→ replace payroll_employee_snapshots
→ replace payroll_results
→ update payroll_periods status DRAFT
→ insert payroll_audit_logs action GENERATE_PREVIEW
```

```text
Finalisasi
→ finalizePayroll(periodId)
→ pastikan preview ada
→ ubah payroll_results status FINALIZED
→ ubah payroll_periods status FINALIZED
→ lock monthly_point_performances periode itu
→ lock activity DISETUJUI_SPV/OVERRIDE_HRD menjadi DIKUNCI_PAYROLL
→ insert daily_activity_approval_logs action LOCK_PAYROLL
→ insert payroll_audit_logs action FINALIZE
```

## 4. Penjelasan File-by-File

### `src/lib/db/schema/payroll.ts`

Fungsi utama:
menyimpan konfigurasi nominal, snapshot, hasil payroll, adjustment, dan audit.

Logika penting:

- snapshot menyimpan branch/division/position/grade/status/salary yang dibaca saat preview,
- `payroll_results.breakdown` menyimpan metadata tambahan seperti eligibility dan source performa,
- `payroll_audit_logs` sudah ada untuk aksi payroll utama.

### `src/server/actions/payroll.ts`

Fungsi utama:
orchestrator seluruh proses payroll.

Export utama:

- `getPayrollWorkspace()`
- `getPayrollEmployeeDetail()`
- `upsertEmployeeSalaryConfig()`
- `upsertManagerialKpiSummary()`
- `createPayrollPeriod()`
- `addPayrollAdjustment()`
- `generatePayrollPreview()`
- `finalizePayroll()`
- `markPayrollPaid()`
- `lockPayrollPeriod()`

Logika penting:

- akses baca payroll:
  `SUPER_ADMIN`, `HRD`, `FINANCE`, `PAYROLL_VIEWER`
- akses write payroll:
  `SUPER_ADMIN`, `HRD`, `FINANCE`
- `generatePayrollPreview()`:
  - hanya employee aktif dengan payroll status `TRAINING`, `REGULER`, `FINAL_PAYROLL`,
  - gaji pokok default:
    - training `1.000.000`
    - lainnya `1.200.000`
  - mengambil `monthlyPointPerformances` untuk TEAMWORK,
  - mengambil `managerialKpiSummaries` untuk MANAGERIAL,
  - membaca ticket approved hanya dari status `AUTO_APPROVED`, `APPROVED_SPV`, `APPROVED_HRD`,
  - membaca incident aktif dalam periode,
  - menghitung SP penalty dari incident type `SP1` dan `SP2`,
  - menyatukan adjustment manual positif/negatif.
- `finalizePayroll()`:
  - mengunci result dan monthly performance,
  - mengubah activity approved menjadi `DIKUNCI_PAYROLL`.
- `markPayrollPaid()` dan `lockPayrollPeriod()`:
  - memakai engine transisi status.

### `src/server/payroll-engine/resolve-payroll-period.ts`

Fungsi utama:
menerjemahkan anchor `YYYY-MM` menjadi periode `26` bulan sebelumnya sampai `25` bulan berjalan.

### `src/server/payroll-engine/resolve-bonus-level.ts`

Fungsi utama:
memilih level bonus dari persentase performa tanpa pembulatan level.

### `src/server/payroll-engine/calculate-teamwork-payroll.ts`

Fungsi utama:
rumus TEAMWORK.

Logika penting:

- training tidak mendapat bonus performa/fulltime/disiplin/team,
- gaji pokok diprorata menurut `activeEmploymentDays / periodDayCount`,
- unpaid leave memotong gaji berdasar `scheduledWorkDays`,
- penalty SP hanya mengurangi bonus melalui multiplier.

### `src/server/payroll-engine/calculate-managerial-payroll.ts`

Fungsi utama:
rumus MANAGERIAL.

Logika penting:

- memakai KPI sebagai `performancePercent`,
- tidak punya bonus prestasi,
- penalty SP juga hanya mengurangi bonus.

### `src/server/payroll-engine/resolve-payroll-status-transition.ts`

Fungsi utama:
aturan status:

- `FINALIZED` → `PAID`
- `PAID` → `LOCKED`

### `src/app/(dashboard)/payroll/PayrollClient.tsx`

Fungsi utama:
workspace utama payroll.

Logika penting:

- period picker di sisi kiri,
- action utama:
  `Buat Periode`, `Generate Preview`, `Finalisasi Payroll`, `Tandai PAID`, `Kunci Periode`, `Export Excel`,
- tabel:
  hasil payroll, summary divisi, adjustment, KPI managerial, salary config,
- dialog:
  create period, add adjustment, edit salary config, input KPI.

### `src/app/(dashboard)/payroll/[periodId]/[employeeId]/page.tsx`

Fungsi utama:
menjelaskan hasil payroll per karyawan secara detail.

Logika penting:

- membaca `breakdown` JSON dari payroll result,
- membangun addition/deduction dengan `buildPayslipBreakdown()`,
- menampilkan ticket approved dan incident yang menjadi sumber perhitungan.

### Route export Excel dan PDF

Fungsi utama:
memberi keluaran dokumen yang bisa dibagikan atau diaudit.

Catatan:

- route export membaca ulang `getPayrollWorkspace()` atau `getPayrollEmployeeDetail()`,
- artinya akses route tetap tunduk pada server-side auth check.

## 5. Business Rules yang Diterapkan

- periode payroll anchor `YYYY-MM` selalu berarti `26 bulan sebelumnya` sampai `25 bulan berjalan`.
- payroll read role terbatas.
- payroll write role terbatas.
- TEAMWORK training tidak mendapat bonus performa.
- default gaji pokok:
  - training `Rp1.000.000`
  - reguler `Rp1.200.000`
- bonus level memakai persentase raw, bukan persentase yang dibulatkan di UI.
- unpaid leave memotong gaji pokok dibayar.
- SP penalty diterapkan ke bonus melalui multiplier.
- finalisasi mengunci monthly performance dan activity yang relevan.
- period status transisi:
  `DRAFT/FINALIZED` → `PAID` → `LOCKED`

## 6. Data yang Dibaca dan Ditulis

| Tabel Database | Dibaca | Ditulis | Fungsi |
|---|---|---|---|
| `payroll_periods` | ya | ya | periode payroll |
| `employee_salary_configs` | ya | ya | nominal dasar per employee |
| `managerial_kpi_summaries` | ya | ya | KPI managerial |
| `payroll_employee_snapshots` | ya | ya | snapshot data payroll |
| `payroll_results` | ya | ya | hasil payroll per employee |
| `payroll_adjustments` | ya | ya | koreksi manual |
| `payroll_audit_logs` | ya | ya | audit payroll |
| `employees` | ya | tidak langsung | sumber profil aktif |
| `employee_division_histories` | ya | tidak | snapshot divisi |
| `employee_position_histories` | ya | tidak | snapshot jabatan |
| `employee_grade_histories` | ya | tidak | snapshot grade |
| `employee_schedule_assignments` | ya | tidak | scheduled work days |
| `work_schedule_days` | ya | tidak | scheduled work days |
| `monthly_point_performances` | ya | di-lock | sumber performa TEAMWORK |
| `attendance_tickets` | ya | tidak | unpaid/paid leave days |
| `incident_logs` | ya | tidak | potongan dan SP penalty |
| `daily_activity_entries` | ya | di-lock saat finalize | mengunci aktivitas yang sudah masuk payroll |
| `daily_activity_approval_logs` | ya | ya | log `LOCK_PAYROLL` |

## 7. Edge Case

- employee yang baru mulai setelah akhir periode tidak ikut preview.
- MANAGERIAL tanpa KPI validated akan menggagalkan generate preview.
- preview periode `PAID` atau `LOCKED` tidak bisa digenerate ulang.
- finalize tanpa preview akan ditolak.
- lock hanya boleh setelah status `PAID`.

## 8. Hal yang Perlu Diperhatikan Developer

- `dailyAllowanceAmount` dan `overtimeRateAmount` sudah ada di salary config, tetapi preview saat ini tetap menyimpan `dailyAllowancePaid = 0` dan `overtimeAmount = 0`.
- adjustment masih satu-satunya penambah/pengurang manual.
- payroll saat ini belum menerapkan scope divisi; aksesnya global sesuai role payroll.
- rule “jangan hitung payroll di browser” dipatuhi: semua kalkulasi ada di server action/engine.

## 9. Contoh Alur Nyata

```text
Finance membuat periode 2026-04
→ resolvePayrollPeriod() menghasilkan 2026-03-26 s.d. 2026-04-25
→ HRD mengisi salary config dan KPI managerial
→ Finance generate preview
→ sistem membuat snapshot employee dan payroll result
→ HRD review hasil, bila perlu tambah adjustment
→ Finance finalisasi payroll
→ sistem lock monthly performance dan activity yang sudah approved
→ Finance tandai PAID
→ Finance kunci periode
→ user payroll dapat export Excel dan slip gaji PDF
```
