# Onboarding Curriculum - HRD Dashboard Internal

Dokumen ini dibuat untuk membantu engineer baru memahami codebase saat ini berdasarkan kondisi aktual repo pada 2026-04-28.

## 1. Tujuan Belajar

Setelah membaca dokumen ini, engineer baru diharapkan paham:

- arsitektur aplikasi dari UI sampai database;
- letak business logic sensitif;
- file mana yang aman diubah untuk UI, validasi, action, engine, dan schema;
- modul mana yang sudah ada di repo;
- risiko teknis yang perlu diingat sebelum menambah fitur baru.

## 2. Urutan Belajar yang Disarankan

1. Baca `AGENTS.md` di root repo.
2. Baca `references/business-rules.md`.
3. Baca `references/implementation-playbook.md`.
4. Baca `references/tech-stack.md`.
5. Scan `src/lib/db/schema/*` untuk mengenal model data.
6. Scan `src/server/actions/*` untuk melihat boundary server-side.
7. Scan `src/server/*-engine/*` untuk rumus dan kalkulasi.
8. Baru masuk ke `src/app/(dashboard)/*` untuk melihat UI dan wiring.

## 3. Mental Model Arsitektur

Alur utama aplikasi:

`Page / Client Component -> Server Action -> Engine / Service -> Drizzle Schema -> PostgreSQL`

Rule penting:

- UI hanya mengumpulkan input dan menampilkan hasil.
- Mutation sensitif dilakukan di server action.
- Formula payroll, performa bulanan, bonus, dan approval tidak boleh dipindah ke browser.
- Schema Drizzle di `src/lib/db/schema/*` adalah sumber kebenaran struktur data aplikasi.

## 4. Peta Folder

### Root

| File/Folder | Fungsi |
|---|---|
| `AGENTS.md` | Aturan kerja agent untuk repo ini. |
| `HANDOVER.md` | Catatan handover, berguna tapi harus diverifikasi terhadap code aktual. |
| `references/` | Dokumen aturan bisnis, playbook implementasi, konsep phase, dan stack. |
| `supabase/migrations/` | Riwayat migration SQL Drizzle/Supabase. |
| `package.json` | Dependency, script dev/build/lint. |
| `drizzle.config.ts` | Konfigurasi Drizzle terhadap `DATABASE_URL`. |
| `components.json` | Konfigurasi shadcn/ui. |
| `next.config.ts` | Konfigurasi Next.js. |
| `tsconfig.json` | Konfigurasi TypeScript. |
| `vitest.config.ts` | Konfigurasi unit test. |

### `src/app`

| Path | Fungsi |
|---|---|
| `src/app/layout.tsx` | Root layout global aplikasi. |
| `src/app/page.tsx` | Landing/root page. |
| `src/app/(auth)/login/*` | Halaman login dan form login. |
| `src/app/(dashboard)/*` | Semua route internal setelah login. |

### `src/lib`

| Path | Fungsi |
|---|---|
| `src/lib/auth/session.ts` | Helper session server-side: `getUser`, `requireAuth`, `checkRole`, `getCurrentUserRoleRow`. |
| `src/lib/db/index.ts` | Inisialisasi koneksi Drizzle ke Postgres. |
| `src/lib/db/schema/*` | Definisi tabel, enum, dan type infer Drizzle. |
| `src/lib/supabase/client.ts` | Client Supabase untuk browser. |
| `src/lib/supabase/server.ts` | Client Supabase untuk server. |
| `src/lib/validations/*` | Seluruh schema Zod untuk input form/action. |
| `src/lib/permissions/index.ts` | Mapping permission per role. |

### `src/server`

| Path | Fungsi |
|---|---|
| `src/server/actions/*` | Boundary mutation/query yang dipanggil dari UI. |
| `src/server/payroll-engine/*` | Formula payroll, period resolver, bonus resolver, export, payslip. |
| `src/server/point-engine/*` | Engine performa poin dan parser workbook master poin. |
| `src/server/services/*` | Helper query reusable lintas action. |

## 5. File Penting dan Logika Per Area

### A. Auth dan Session

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/middleware.ts` | Guard route berbasis session Supabase. Saat ini masih memakai konvensi `middleware`, dan Next.js 16 memberi warning untuk migrasi ke `proxy`. | `middleware()` |
| `src/lib/auth/session.ts` | Pusat auth server-side. Hampir semua server action masuk melalui file ini. | `requireAuth()`, `checkRole()`, `getCurrentUserRoleRow()`, `getCurrentUserRole()` |
| `src/server/actions/auth.ts` | Login dan logout. | `loginAction()`, `logoutAction()` |
| `src/lib/validations/auth.ts` | Validasi email/password login. | `loginSchema` |

Catatan:

- `checkRole()` membaca role dari tabel `user_roles`.
- Self-scoping TEAMWORK belum kuat karena belum ada relasi langsung `auth user -> employee`.

### B. Master Data

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/lib/db/schema/master.ts` | Tabel `branches`, `divisions`, `positions`, `grades`, plus enum `employee_group`. | tabel dan enum master |
| `src/server/actions/branches.ts` | CRUD cabang. | `getBranches()`, `createBranch()`, `updateBranch()`, `deleteBranch()` |
| `src/server/actions/divisions.ts` | CRUD divisi, termasuk `trainingPassPercent`. | `getDivisions()`, `createDivision()`, `updateDivision()`, `deleteDivision()` |
| `src/server/actions/positions.ts` | CRUD jabatan, termasuk `employeeGroup`. | `getPositions()`, `createPosition()`, `updatePosition()`, `deletePosition()` |
| `src/server/actions/grades.ts` | CRUD grade. | `getGrades()`, `createGrade()`, `updateGrade()`, `deleteGrade()` |
| `src/server/actions/work-schedules.ts` | CRUD jadwal kerja dan hari kerja per schedule. | `getWorkSchedules()`, `getActiveWorkSchedules()`, `createWorkSchedule()`, `updateWorkSchedule()`, `deleteWorkSchedule()` |
| `src/lib/validations/master.ts` | Zod untuk branch/division/position/grade. | `branchSchema`, `divisionSchema`, `positionSchema`, `gradeSchema` |
| `src/lib/validations/employee.ts` | Zod untuk employee dan work schedule. | `employeeSchema`, `workScheduleDaySchema`, `workScheduleSchema` |

UI terkait:

- `src/app/(dashboard)/master/branches/*`
- `src/app/(dashboard)/master/divisions/*`
- `src/app/(dashboard)/master/positions/*`
- `src/app/(dashboard)/master/grades/*`
- `src/app/(dashboard)/master/work-schedules/*`

### C. Employee Profiling

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/lib/db/schema/employee.ts` | Tabel inti `employees` dan history: divisi, jabatan, grade, supervisor, status, assignment jadwal. | `employees`, `employeeDivisionHistories`, `employeePositionHistories`, `employeeGradeHistories`, `employeeSupervisorHistories`, `employeeStatusHistories`, `employeeScheduleAssignments` |
| `src/server/actions/employees.ts` | Query detail/list karyawan dan mutation create/update/delete beserta history insert. | `getEmployees()`, `getEmployeeFormOptions()`, `getEmployeeById()`, `createEmployee()`, `updateEmployee()`, `deleteEmployee()` |
| `src/app/(dashboard)/employees/page.tsx` | Server Component yang mengambil data employee list dan opsi form. | `EmployeesPage()` |
| `src/app/(dashboard)/employees/EmployeesTable.tsx` | Client UI untuk CRUD employee. | komponen tabel/form employee |
| `src/app/(dashboard)/employees/[id]/page.tsx` | Halaman detail karyawan beserta history. | `EmployeeDetailPage()` |

Logika penting:

- Saat create/update employee, action akan menulis ke history table jika divisi/jabatan/grade/status/supervisor berubah.
- SPV hanya bisa melihat karyawan divisinya.

### D. Performance dan Point Catalog

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/config/constants.ts` | Konstanta target poin, target override OFFSET, gaji default, bonus level, training pass default, SP multiplier. | `POINT_TARGET_HARIAN`, `DIVISION_POINT_TARGET_OVERRIDES`, `resolvePointTargetForDivision()` |
| `src/lib/db/schema/point.ts` | Semua tabel performance poin. | `pointCatalogVersions`, `divisionPointTargetRules`, `pointCatalogEntries`, `dailyActivityEntries`, `dailyActivityApprovalLogs`, `monthlyPointPerformances` |
| `src/server/services/point-catalog-service.ts` | Helper mengambil versi aktif, entries, dan target rule per versi. | `getActivePointCatalogVersion()`, `getPointCatalogEntriesByVersion()`, `getDivisionTargetRulesByVersion()` |
| `src/server/point-engine/parse-master-point-workbook.ts` | Parser workbook master poin untuk import versi baru. | `parseMasterPointWorkbook()` |
| `src/server/point-engine/count-target-days-for-period.ts` | Menghitung hari target dari assignment jadwal kerja. | `countTargetDaysForPeriod()` |
| `src/server/point-engine/calculate-monthly-point-performance.ts` | Hitung target harian, target bulanan, total approved, dan persen performa. | `calculateMonthlyPointPerformance()` |
| `src/server/actions/point-catalog.ts` | Overview katalog poin dan sinkronisasi workbook. | `getPointCatalogOverview()`, `syncPointCatalogFromWorkbook()` |
| `src/server/actions/performance.ts` | Workspace performance, CRUD aktivitas harian, submit, approve/reject, generate bulanan. | `getPerformanceWorkspace()`, `saveDailyActivityEntry()`, `submitDailyActivityEntry()`, `approveDailyActivityEntry()`, `rejectDailyActivityEntry()`, `generateMonthlyPerformance()`, `deleteActivityEntry()` |
| `src/app/(dashboard)/performance/page.tsx` | Server Component untuk merakit data performance. | `PerformancePage()` |
| `src/app/(dashboard)/performance/PerformanceCatalogClient.tsx` | Client UI katalog poin, aktivitas, approval, performa bulanan. | komponen performance |

Logika penting:

- Snapshot poin disimpan di `dailyActivityEntries`: nama pekerjaan, poin satuan, divisi, versi.
- Generate performa bulanan mengambil hanya aktivitas berstatus approved/locked payroll.
- Target default 13.000, override OFFSET 39.000.
- Setelah patch audit, akses baca modul performance dibatasi ke `SUPER_ADMIN`, `HRD`, `SPV`.

### E. Ticketing

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/lib/db/schema/hr.ts` | Tabel HR selain employee: `attendance_tickets`, `leave_quotas`, `employee_reviews`, `incident_logs`. | definisi ticket, quota, review, incident |
| `src/lib/validations/hr.ts` | Zod untuk ticket, review, incident. | `createTicketSchema`, `ticketDecisionSchema`, `createReviewSchema`, `createIncidentSchema` |
| `src/server/actions/tickets.ts` | Query dan mutation ticketing plus leave quota. | `getTickets()`, `createTicket()`, `approveTicket()`, `rejectTicket()`, `cancelTicket()`, `generateLeaveQuota()` |
| `src/app/(dashboard)/tickets/page.tsx` | Server Component tiket. | `TicketingPage()` |
| `src/app/(dashboard)/tickets/TicketingClient.tsx` | UI ticketing dan approval. | komponen ticketing |

Logika penting:

- Ticket approved dapat menghasilkan `UNPAID`, `PAID_QUOTA_MONTHLY`, atau `PAID_QUOTA_ANNUAL`.
- Leave quota tahunan/bulanan disimpan di `leave_quotas`.
- Setelah patch audit:
  - TEAMWORK/MANAGERIAL tidak lagi bisa melihat seluruh ticket.
  - SPV hanya bisa approve/reject/create dalam scope divisinya.
  - cancel ticket dibatasi ke pembuat ticket atau HRD/SUPER_ADMIN.

### F. Review dan Incident

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/server/actions/reviews.ts` | Query review dan incident, create review, validate review, create incident. | `getReviews()`, `createReview()`, `validateReview()`, `createIncident()` |
| `src/app/(dashboard)/reviews/page.tsx` | Server Component reviews. | `ReviewsPage()` |
| `src/app/(dashboard)/reviews/ReviewsClient.tsx` | UI review dan incident. | komponen reviews |

Logika penting:

- Score review dihitung dari 5 aspek berbobot.
- Kategori review: Sangat Baik, Baik, Cukup, Kurang, Buruk.
- Setelah patch audit:
  - akses baca dibatasi ke `SUPER_ADMIN`, `HRD`, `SPV`;
  - SPV tidak bisa membuat review/incident untuk divisi lain;
  - `reviewerEmployeeId` tidak lagi diisi dengan `user_roles.id` yang salah.

### G. Training Evaluation

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/server/actions/training.ts` | Ambil evaluasi training dan action lulus/gagal training. | `getTrainingEvaluations()`, `graduateTrainee()`, `failTrainee()` |
| `src/app/(dashboard)/performance/training/page.tsx` | Halaman training evaluation. | `TrainingEvaluationPage()` |
| `src/app/(dashboard)/performance/training/TrainingEvaluationClient.tsx` | UI evaluasi training. | komponen training |

Logika penting:

- Kategori evaluasi: `LULUS`, `MENDEKATI`, `BELUM_LULUS`.
- Passing percent mengikuti `divisions.trainingPassPercent`, default 80.
- Setelah patch audit, akses baca dibatasi ke `SUPER_ADMIN`, `HRD`, `SPV`.

### H. Dashboard

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/server/actions/dashboard.ts` | Agregasi dashboard: employee count, pending approvals, activity status, division performance, incident summary. | `getDashboardStats()` |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard utama. | `DashboardPage()` |
| `src/components/charts/*` | Komponen chart bila dipakai dashboard. | chart UI |

Logika penting:

- Query dashboard sudah memakai pattern scoping SPV: `isSPV ? eq(employees.divisionId, roleRow.divisionId!) : undefined`.

### I. Payroll

| File | Penjelasan | Fungsi penting |
|---|---|---|
| `src/lib/db/schema/payroll.ts` | Semua tabel payroll. | `employeeSalaryConfigs`, `payrollPeriods`, `managerialKpiSummaries`, `payrollEmployeeSnapshots`, `payrollResults`, `payrollAdjustments`, `payrollAuditLogs` |
| `src/lib/validations/payroll.ts` | Zod untuk periode payroll, adjustment, KPI, salary config. | `createPayrollPeriodSchema`, `payrollPeriodActionSchema`, `payrollAdjustmentSchema`, `managerialKpiSummarySchema`, `salaryConfigSchema` |
| `src/server/actions/payroll.ts` | Workspace payroll lengkap: periode, preview, detail, KPI, adjustment, finalize, mark paid, lock. | `getPayrollWorkspace()`, `getPayrollEmployeeDetail()`, `upsertEmployeeSalaryConfig()`, `upsertManagerialKpiSummary()`, `createPayrollPeriod()`, `addPayrollAdjustment()`, `generatePayrollPreview()`, `finalizePayroll()`, `markPayrollPaid()`, `lockPayrollPeriod()` |
| `src/server/payroll-engine/resolve-payroll-period.ts` | Resolver periode 26-25 dari kode `YYYY-MM`. | `resolvePayrollPeriod()` |
| `src/server/payroll-engine/resolve-bonus-level.ts` | Resolver level bonus dari performance percent. | `resolveBonusLevel()` |
| `src/server/payroll-engine/calculate-teamwork-payroll.ts` | Rumus payroll TEAMWORK. | `calculateTeamworkPayroll()` |
| `src/server/payroll-engine/calculate-managerial-payroll.ts` | Rumus payroll MANAGERIAL. | `calculateManagerialPayroll()` |
| `src/server/payroll-engine/resolve-payroll-status-transition.ts` | Aturan transisi status payroll period. | `resolvePayrollStatusTransition()` |
| `src/server/payroll-engine/build-payroll-export-rows.ts` | Bentuk data export XLSX payroll. | `buildPayrollExportRows()` |
| `src/server/payroll-engine/build-payslip-breakdown.ts` | Breakdown payslip per komponen. | `buildPayslipBreakdown()` |
| `src/server/payroll-engine/render-payslip-pdf.tsx` | Render PDF payslip. | `renderPayslipPdf()` |
| `src/server/payroll-engine/PayslipPdfDocument.tsx` | Template dokumen PDF. | `PayslipPdfDocument()` |
| `src/server/payroll-engine/summarize-payroll-results.ts` | Agregasi summary payroll per divisi dan total. | `summarizePayrollResults()` |
| `src/app/(dashboard)/payroll/page.tsx` | Halaman workspace payroll. | `PayrollPage()` |
| `src/app/(dashboard)/payroll/PayrollClient.tsx` | UI payroll utama. | komponen payroll |
| `src/app/(dashboard)/payroll/[periodId]/[employeeId]/page.tsx` | Detail payroll per karyawan. | `PayrollEmployeeDetailPage()` |
| `src/app/(dashboard)/payroll/[periodId]/export.xlsx/route.ts` | Endpoint export payroll XLSX. | `GET()` |
| `src/app/(dashboard)/payroll/[periodId]/[employeeId]/payslip.pdf/route.ts` | Endpoint PDF payslip. | `GET()` |

Logika penting:

- Preview payroll membangun snapshot employee per periode.
- Result payroll menyimpan breakdown JSON dan komponen nominal, bukan THP saja.
- Finalize payroll mengunci `monthlyPointPerformances` dan activity terkait.
- Setelah patch audit, kalkulasi threshold bonus TEAMWORK memakai persentase mentah `approved points / target points`, bukan angka 2 desimal yang sudah dibulatkan.

### J. Finance View

| File | Penjelasan |
|---|---|
| `src/app/(dashboard)/finance/page.tsx` | Halaman finance summary berbasis data payroll. |
| `src/app/(dashboard)/finance/FinanceDashboardClient.tsx` | Client UI finance. |

## 6. File Test yang Perlu Dibaca

| File | Fokus test |
|---|---|
| `src/config/constants.test.ts` | Konstanta target dan bonus. |
| `src/lib/permissions/index.test.ts` | Permission matrix per role. |
| `src/lib/validations/employee.test.ts` | Validasi employee dan jadwal kerja. |
| `src/lib/validations/payroll.test.ts` | Validasi payload payroll. |
| `src/server/point-engine/*.test.ts` | Perhitungan target hari, performa bulanan, parser workbook. |
| `src/server/payroll-engine/*.test.ts` | Period resolver, bonus level, payroll calculator, export, payslip summary. |

Tips:

- Jika ingin memahami rule bisnis tercepat, baca test payroll engine dan point engine setelah membaca `references/business-rules.md`.

## 7. Cara Membaca Alur Perubahan

Kalau mau trace sebuah fitur, gunakan pola ini:

1. Mulai dari page di `src/app/(dashboard)/.../page.tsx`.
2. Lihat client component yang dipakai page itu.
3. Cari server action yang dipanggil client tersebut.
4. Lihat validation schema yang dipakai action.
5. Lihat schema database dan engine yang dipanggil action.
6. Kalau ada test, baca test file-nya.

Contoh:

- Performance bulanan:
  `PerformanceCatalogClient.tsx -> generateMonthlyPerformance() -> calculateMonthlyPointPerformance() + countTargetDaysForPeriod() -> monthlyPointPerformances`
- Payroll preview:
  `PayrollClient.tsx -> generatePayrollPreview() -> calculateTeamworkPayroll()/calculateManagerialPayroll() -> payrollEmployeeSnapshots + payrollResults`

## 8. Known Risks yang Harus Diketahui Anak Baru

- Belum ada relasi langsung antara `auth.users` dan `employees`, sehingga rule self-access TEAMWORK/MANAGERIAL belum bisa ditegakkan secara kuat.
- RLS belum diaktifkan pada tabel-tabel utama; proteksi saat ini sangat bergantung pada server action.
- Ticketing self-service untuk TEAMWORK/MANAGERIAL sementara diblokir di patch audit karena gap mapping auth-employee.
- Rule time window performance belum lengkap: H+1 input, H+2 approval, H+1 revisi/resubmit belum enforced.
- Rule training “status reguler efektif periode payroll berikutnya” belum sepenuhnya tercermin di action graduate.
- Belum ada audit log khusus untuk review, training, dan ticket approval selain log pada payroll/performance.
- `src/middleware.ts` masih memakai konvensi lama; Next.js 16 menyarankan migrasi ke `proxy`.

## 9. Saran Jalur Onboarding 5 Sesi

### Sesi 1 - Fondasi

- Baca `references/*`.
- Baca `src/lib/db/schema/*`.
- Pahami role dan boundary auth di `src/lib/auth/session.ts`.

### Sesi 2 - Employee + Master

- Ikuti CRUD master.
- Baca `employees.ts` sampai paham cara history ditulis.

### Sesi 3 - Performance + Ticketing

- Baca `point.ts`, `performance.ts`, `point-catalog.ts`, `tickets.ts`.
- Cocokkan dengan business rules target 13.000 dan OFFSET 39.000.

### Sesi 4 - Review + Training

- Baca `reviews.ts` dan `training.ts`.
- Pahami gap bisnis yang belum selesai.

### Sesi 5 - Payroll

- Baca `payroll.ts`.
- Lanjut ke seluruh file di `src/server/payroll-engine`.
- Jalankan test dan build lokal.

## 10. Checklist Sebelum Mulai Ngoding

- Sudah baca business rules?
- Sudah tahu modul ini phase 1, 2, atau 3?
- Sudah tahu logic ini sensitif atau tidak?
- Sudah tahu action mana yang jadi entry point?
- Sudah tahu schema tabel yang disentuh?
- Sudah tahu apakah perubahan perlu audit log?

Jika belum, berhenti dulu dan telusuri dari file-file yang disebut di atas.
