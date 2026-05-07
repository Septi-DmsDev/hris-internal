# Data Flow and User Flow

## 1. Tujuan Dokumen

Dokumen ini menjelaskan alur data antar modul dan alur user per role supaya pembaca tidak berhenti di level “file mana memanggil file mana”, tetapi juga paham kenapa data itu mengalir begitu.

## 2. Data Flow Utama

```text
Master Data
→ Employee Profile
→ Schedule Assignment + Division/Position/Grade History
→ Performance / Ticketing / Review / Training
→ Monthly Point Performance + Incident + Managerial KPI
→ Payroll Employee Snapshot
→ Payroll Result
→ Finance Dashboard / Payslip / Export
```

## 3. Alur Login dan Session

```text
User buka route private
→ src/proxy.ts cek session Supabase
→ jika belum login redirect /login
→ jika login lanjut ke route
→ page/action pakai requireAuth()
→ role dibaca dari user_roles
→ sidebar/header/akses modul dirender sesuai role
```

## 4. User Flow per Role

### SUPER_ADMIN

```text
Login
→ akses semua modul
→ kelola master data
→ kelola employee
→ approve performance/ticket/review bila perlu
→ ikut mengelola payroll
```

### HRD

```text
Login
→ kelola master data
→ kelola employee profiling
→ monitor dan override performance
→ kelola ticket
→ validasi review
→ putuskan training
→ baca payroll dan finance
```

### FINANCE

```text
Login
→ buka payroll
→ buat periode / buka payroll untuk auto-preview / finalize / mark paid / lock
→ buka finance dashboard
→ export Excel payroll
→ lihat detail payroll per karyawan
```

### SPV

```text
Login
→ hanya melihat karyawan divisinya
→ memproses aktivitas harian divisinya
→ memproses ticket divisinya
→ membuat review dan incident divisinya
→ melihat trainee divisinya
```

### TEAMWORK / MANAGERIAL

```text
Login
→ bisa masuk dashboard
→ pada matrix permission semestinya bisa input/submit tertentu
→ tetapi di code aktual self-service performance/ticket belum dibuka penuh
```

### PAYROLL_VIEWER

```text
Login
→ buka payroll read-only
→ buka finance dashboard read-only
→ tidak bisa mutate
```

## 5. Data Flow Modul Master ke Employee

```text
Master cabang/divisi/jabatan/grade/jadwal
→ dipilih di form employee
→ employee tersimpan dengan FK ke master
→ histori perubahan disimpan terpisah
→ histori itu nanti dipakai untuk snapshot performance dan payroll
```

## 6. Data Flow Performance

```text
Import workbook katalog
→ point_catalog_versions + division_point_target_rules + point_catalog_entries
→ user input daily activity
→ daily_activity_entries menyimpan snapshot poin
→ approval log ditulis ke daily_activity_approval_logs
→ generate monthly performance
→ monthly_point_performances terbentuk
→ training/dashboard/payroll membaca hasil ini
```

## 7. Data Flow Ticketing

```text
Ticket dibuat
→ attendance_tickets status SUBMITTED
→ approver memutuskan approve/reject
→ jika approve dan eligible:
   leave_quotas bisa bertambah used
→ payrollImpact tersimpan di ticket
→ payroll membaca ticket approved dalam periode aktif
```

## 8. Data Flow Review dan Incident

```text
Review dibuat
→ employee_reviews status SUBMITTED
→ HRD validasi
→ review menjadi artefak HR

Incident dibuat
→ incident_logs tersimpan
→ jika ada payrollDeduction atau SP1/SP2
→ payroll membaca incident aktif dalam periode
```

## 9. Data Flow Training

```text
Employee status = TRAINING
→ monthly_point_performances terkumpul
→ getTrainingEvaluations() hitung rata-rata performa
→ HRD putuskan lulus / tidak lolos
→ employees.employmentStatus dan payrollStatus berubah
```

## 10. Data Flow Payroll

```text
Create payroll period
→ payroll_periods

Siapkan salary config / KPI / adjustment
→ employee_salary_configs
→ managerial_kpi_summaries
→ payroll_adjustments
→ recurring_payroll_adjustments

Auto-preview saat `/payroll` dibuka
→ baca employees aktif
→ resolve snapshot divisi/jabatan/grade
→ baca monthly performance atau KPI
→ baca approved ticket, incident, adjustment periode, dan recurring adjustment aktif
→ hitung payroll via engine
→ tulis payroll_employee_snapshots
→ tulis payroll_results

Finalize
→ payroll_results FINALIZED
→ payroll_periods FINALIZED
→ monthly_point_performances LOCKED
→ daily_activity_entries DIKUNCI_PAYROLL

Mark paid
→ payroll_periods PAID

Lock
→ payroll_periods LOCKED
```

## 11. User Flow End-to-End yang Paling Penting

### Alur Onboarding Employee Baru

```text
HRD buat branch/division/position/grade bila belum ada
→ HRD buat work schedule
→ HRD tambah employee
→ histori awal employee tercatat
→ employee siap dipakai di performance/ticketing/training/payroll
```

### Alur Performance TEAMWORK

```text
HRD import katalog poin aktif
→ aktivitas harian disimpan
→ activity diajukan
→ SPV approve
→ HRD generate monthly performance
→ hasil bulanan dibaca training/payroll
```

### Alur Ticket ke Payroll

```text
ticket dibuat
→ ticket disetujui
→ payrollImpact ditentukan
→ payroll preview menghitung unpaid/paid leave days
→ THP dan eligibility bonus terpengaruh
```

### Alur Incident ke Payroll

```text
incident dicatat
→ jika type SP1/SP2, multiplier bonus berubah
→ jika payrollDeduction terisi, nominal deduction bertambah
→ payroll preview membaca incident aktif dalam periode
```

### Alur Payroll Closing

```text
Finance buat periode
→ buka payroll; sistem auto-preview server-side
→ review hasil
→ finalisasi
→ paid
→ lock
→ finance dashboard dan export membaca result final
```

## 12. Titik Putus Alur yang Perlu Disadari

- performance self-service belum tersambung ke role `TEAMWORK`.
- ticket self-service belum tersambung ke role `TEAMWORK`/`MANAGERIAL`.
- training decision belum memiliki “effective next payroll period”.
- finance dashboard bukan modul perhitungan baru; ia murni pembaca `payroll_results`.
