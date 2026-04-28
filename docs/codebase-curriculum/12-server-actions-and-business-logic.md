# Server Actions and Business Logic

## 1. Tujuan Dokumen

Dokumen ini merangkum semua file di `src/server/actions`, karena folder inilah boundary bisnis paling penting di repo.

## 2. Ringkasan File Action

| File | Fungsi utama | Modul |
|---|---|---|
| `auth.ts` | login/logout | auth |
| `branches.ts` | CRUD branch | master data |
| `divisions.ts` | CRUD division | master data |
| `positions.ts` | CRUD position | master data |
| `grades.ts` | CRUD grade | master data |
| `work-schedules.ts` | CRUD work schedule | master data |
| `employees.ts` | employee list/detail/create/update/delete | employee profiling |
| `dashboard.ts` | dashboard summary | dashboard |
| `point-catalog.ts` | katalog poin overview + import workbook | performance |
| `performance.ts` | activity workflow + monthly performance | performance |
| `tickets.ts` | ticket workflow + leave quota | ticketing |
| `reviews.ts` | review + incident | review |
| `training.ts` | training evaluation decision | training |
| `payroll.ts` | payroll workspace dan lifecycle | payroll |

## 3. Tabel Ringkasan Semua Action

| Function | Role yang boleh | Input | Output | Tabel yang disentuh | Side effect / audit |
|---|---|---|---|---|---|
| `loginAction` | semua user login | `FormData(email,password)` | redirect `/dashboard` atau error | Supabase Auth | set auth session |
| `logoutAction` | user login | tidak ada | redirect `/login` | Supabase Auth | sign out |
| `getBranches` | login | - | list branch | `branches` | - |
| `createBranch` | `HRD`, `SUPER_ADMIN` | `FormData` | success/error | `branches` | `revalidatePath` |
| `updateBranch` | `HRD`, `SUPER_ADMIN` | `id`, `FormData` | success/error | `branches` | `revalidatePath` |
| `deleteBranch` | `HRD`, `SUPER_ADMIN` | `id` | success/error | `branches` | `revalidatePath` |
| `getDivisions` | login | - | list division | `divisions` | - |
| `createDivision` | `HRD`, `SUPER_ADMIN` | `FormData` | success/error | `divisions` | `revalidatePath` |
| `updateDivision` | `HRD`, `SUPER_ADMIN` | `id`, `FormData` | success/error | `divisions` | `revalidatePath` |
| `deleteDivision` | `HRD`, `SUPER_ADMIN` | `id` | success/error | `divisions` | `revalidatePath` |
| `getPositions` | login | - | list position | `positions` | - |
| `createPosition` | `HRD`, `SUPER_ADMIN` | `FormData` | success/error | `positions` | `revalidatePath` |
| `updatePosition` | `HRD`, `SUPER_ADMIN` | `id`, `FormData` | success/error | `positions` | `revalidatePath` |
| `deletePosition` | `HRD`, `SUPER_ADMIN` | `id` | success/error | `positions` | `revalidatePath` |
| `getGrades` | login | - | list grade | `grades` | - |
| `createGrade` | `HRD`, `SUPER_ADMIN` | `FormData` | success/error | `grades` | `revalidatePath` |
| `updateGrade` | `HRD`, `SUPER_ADMIN` | `id`, `FormData` | success/error | `grades` | `revalidatePath` |
| `deleteGrade` | `HRD`, `SUPER_ADMIN` | `id` | success/error | `grades` | `revalidatePath` |
| `getWorkSchedules` | login | - | list schedule + days | `work_schedules`, `work_schedule_days` | - |
| `getActiveWorkSchedules` | login | - | opsi jadwal aktif | `work_schedules` | - |
| `createWorkSchedule` | `HRD`, `SUPER_ADMIN` | object Zod | success/error | `work_schedules`, `work_schedule_days` | transaction + revalidate |
| `updateWorkSchedule` | `HRD`, `SUPER_ADMIN` | `id`, object Zod | success/error | `work_schedules`, `work_schedule_days` | transaction + revalidate |
| `deleteWorkSchedule` | `HRD`, `SUPER_ADMIN` | `id` | success/error | `work_schedules` | revalidate |
| `getEmployees` | `SUPER_ADMIN`, `HRD`, `SPV`, `FINANCE` | - | list employee | `employees` + master joins | scope SPV |
| `getEmployeeFormOptions` | read employee roles | - | option form | master tables + `employees` + `work_schedules` | - |
| `getEmployeeById` | read employee roles | `id` | detail + histories | `employees`, history tables, schedule assignments | scope SPV |
| `createEmployee` | `HRD`, `SUPER_ADMIN` | object Zod | success/error | `employees`, history tables, schedule assignment | transaction |
| `updateEmployee` | `HRD`, `SUPER_ADMIN` | `id`, object Zod | success/error | `employees`, history tables, schedule assignment | transaction |
| `deleteEmployee` | `HRD`, `SUPER_ADMIN` | `id` | success/error | `employees` | hard delete |
| `getDashboardStats` | login | - | dashboard summary | `employees`, `attendance_tickets`, `daily_activity_entries`, `employee_reviews`, `monthly_point_performances`, `incident_logs` | scope SPV |
| `getPointCatalogOverview` | login | - | overview katalog | `point_catalog_versions`, `point_catalog_entries`, `division_point_target_rules` | - |
| `syncPointCatalogFromWorkbook` | `HRD`, `SUPER_ADMIN` | object Zod | success/error | versi, rules, entries | transaction |
| `getPerformanceWorkspace` | `SUPER_ADMIN`, `HRD`, `SPV` | - | workspace performance | employees, divisions, activity, monthly, catalog | scope SPV |
| `saveDailyActivityEntry` | `SUPER_ADMIN`, `HRD`, `SPV` | object Zod | success/error | `daily_activity_entries`, `point_catalog_entries`, `divisions` | snapshot poin |
| `submitDailyActivityEntry` | `SUPER_ADMIN`, `HRD`, `SPV` | decision input | success/error | `daily_activity_entries`, `daily_activity_approval_logs` | transaction + log |
| `approveDailyActivityEntry` | `SUPER_ADMIN`, `HRD`, `SPV` | decision input | success/error | `daily_activity_entries`, `daily_activity_approval_logs` | transaction + log |
| `rejectDailyActivityEntry` | `SUPER_ADMIN`, `HRD`, `SPV` | decision input | success/error | `daily_activity_entries`, `daily_activity_approval_logs` | transaction + log |
| `generateMonthlyPerformance` | `SUPER_ADMIN`, `HRD` | period input | success/error | `employees`, `daily_activity_entries`, `monthly_point_performances`, history schedule/division | replace periode |
| `deleteActivityEntry` | `SUPER_ADMIN`, `HRD`, `SPV` | `activityEntryId` | success/error | `daily_activity_entries` | only DRAFT |
| `getTickets` | `SUPER_ADMIN`, `HRD`, `SPV`, `TEAMWORK`, `MANAGERIAL` | - | list ticket | `attendance_tickets`, `employees`, `divisions` | scope role |
| `createTicket` | `SUPER_ADMIN`, `HRD`, `SPV`, `TEAMWORK`, `MANAGERIAL` | object Zod | success/error | `attendance_tickets` | self-service blocked for TW/MANAGERIAL |
| `approveTicket` | `SUPER_ADMIN`, `HRD`, `SPV` | decision input | success/error | `attendance_tickets`, `leave_quotas`, `employees` | transaction quota consume |
| `rejectTicket` | `SUPER_ADMIN`, `HRD`, `SPV` | decision input | success/error | `attendance_tickets` | rejection reason wajib |
| `cancelTicket` | pembuat / `HRD` / `SUPER_ADMIN` | `ticketId` | success/error | `attendance_tickets` | status cancel |
| `generateLeaveQuota` | `SUPER_ADMIN`, `HRD` | `employeeId`, `year` | success/error | `leave_quotas`, `employees` | create quota |
| `getReviews` | `SUPER_ADMIN`, `HRD`, `SPV` | - | list review + incident | `employee_reviews`, `incident_logs`, `employees`, `divisions` | scope SPV |
| `createReview` | `SUPER_ADMIN`, `HRD`, `SPV` | object Zod | success/error + score | `employee_reviews`, `employees` | hitung skor |
| `validateReview` | `SUPER_ADMIN`, `HRD` | `reviewId` | success/error | `employee_reviews` | set VALIDATED |
| `createIncident` | `SUPER_ADMIN`, `HRD`, `SPV` | object Zod | success/error | `incident_logs`, `employees` | payroll deduction opsional |
| `getTrainingEvaluations` | `SUPER_ADMIN`, `HRD`, `SPV` | - | list trainee evaluation | `employees`, `divisions`, `monthly_point_performances` | scope SPV |
| `graduateTrainee` | `SUPER_ADMIN`, `HRD` | `employeeId`, `notes` | success/error | `employees` | status langsung berubah |
| `failTrainee` | `SUPER_ADMIN`, `HRD` | `employeeId`, `notes` | success/error | `employees` | status langsung berubah |
| `getPayrollWorkspace` | `SUPER_ADMIN`, `HRD`, `FINANCE`, `PAYROLL_VIEWER` | optional `periodId` | periods + results + adjustments + salaryConfigs + KPI | payroll tables + employees/divisions | basis payroll/finance page |
| `getPayrollEmployeeDetail` | payroll read roles | `periodId`, `employeeId` | detail payroll | payroll + performance + tickets + incidents + adjustments | basis detail/payslip |
| `upsertEmployeeSalaryConfig` | payroll write roles | object Zod | success/error | `employee_salary_configs`, `employees` | revalidate payroll/finance |
| `upsertManagerialKpiSummary` | payroll write roles | object Zod | success/error | `managerial_kpi_summaries`, `payroll_periods`, `employees` | set VALIDATED |
| `createPayrollPeriod` | payroll write roles | object Zod | success/error | `payroll_periods`, `payroll_audit_logs` | audit `CREATE_PERIOD` |
| `addPayrollAdjustment` | payroll write roles | object Zod | success/error | `payroll_adjustments`, `payroll_audit_logs` | audit `ADD_ADJUSTMENT` |
| `generatePayrollPreview` | payroll write roles | `periodId` | success/error + generatedEmployees | hampir seluruh payroll input tables | snapshot + audit `GENERATE_PREVIEW` |
| `finalizePayroll` | payroll write roles | `periodId` | success/error | `payroll_results`, `payroll_periods`, `monthly_point_performances`, `daily_activity_entries`, `daily_activity_approval_logs`, `payroll_audit_logs` | lock hasil dan aktivitas |
| `markPayrollPaid` | payroll write roles | `periodId` | success/error | `payroll_periods`, `payroll_results`, `managerial_kpi_summaries`, `payroll_audit_logs` | audit `MARK_PAID` |
| `lockPayrollPeriod` | payroll write roles | `periodId` | success/error | `payroll_periods`, `payroll_results`, `payroll_audit_logs` | audit `LOCK` |

## 4. Action Paling Kritis

### `updateEmployee()`

Kenapa kritis:

- menyentuh profil inti,
- menulis banyak history table,
- memengaruhi snapshot modul lain.

Business rule yang diterapkan:

- histori hanya ditulis jika data berubah,
- perubahan jadwal memakai tanggal efektif.

### `generateMonthlyPerformance()`

Kenapa kritis:

- hasilnya dipakai training, dashboard, dan payroll TEAMWORK.

Business rule yang diterapkan:

- hanya aktivitas approved/locked yang dihitung,
- target diambil dari divisi snapshot,
- target days diambil dari jadwal kerja.

### `approveTicket()`

Kenapa kritis:

- memengaruhi leave quota dan payroll impact.

Business rule yang diterapkan:

- prioritas quota monthly → annual → unpaid,
- SPV hanya boleh approve divisinya.

### `createReview()` dan `createIncident()`

Kenapa kritis:

- review dan incident bisa memengaruhi evaluasi HR dan payroll.

Business rule yang diterapkan:

- skor review 5 aspek berbobot,
- SPV scoped per divisi,
- incident bisa membawa `payrollDeduction`.

### `generatePayrollPreview()`

Kenapa kritis:

- ini inti perhitungan payroll.

Business rule yang diterapkan:

- pakai snapshot awal periode,
- TEAMWORK dan MANAGERIAL punya source performa berbeda,
- default salary training/reguler,
- ticket approved dan incident aktif masuk ke kalkulasi,
- adjustment manual dijumlahkan,
- KPI managerial wajib ada.

### `finalizePayroll()`

Kenapa kritis:

- mengubah state draft menjadi final.

Business rule yang diterapkan:

- preview harus sudah ada,
- monthly performance dan activity terkait dikunci,
- audit log ditulis.

## 5. Catatan Umum

- repo cukup konsisten memakai `revalidatePath()` setelah mutation.
- master data dan employee banyak memakai transaction saat perubahan bisa memecah ke beberapa tabel.
- payroll sudah punya audit log, sementara modul selain payroll umumnya belum.
