# Developer Learning Path

## Tujuan

Bagian ini memberi rute belajar 12 hari agar developer baru memahami project dari nol sampai siap maintenance.

## Hari 1

Topik belajar:
overview project dan aturan repo

File yang harus dibaca:

- `AGENTS.md`
- `HANDOVER.md`
- `references/business-rules.md`
- `docs/codebase-curriculum/00-overview.md`

Hal yang harus dipahami:

- tujuan sistem,
- modul mana yang sudah ada,
- aturan bisnis paling sensitif,
- inkonsistensi dokumen vs code.

Latihan kecil:

- tulis ulang dengan kata sendiri alur besar project dari master data sampai payroll.

Checklist selesai:

- tahu 3 phase project
- tahu modul yang sudah production-ready vs parsial

## Hari 2

Topik belajar:
struktur repo dan boundary layer

File yang harus dibaca:

- `docs/codebase-curriculum/01-project-structure.md`
- `src/app/layout.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/proxy.ts`

Hal yang harus dipahami:

- bedanya `src/app`, `src/server`, `src/lib`, `src/components`,
- alur request private route,
- letak boundary UI vs action vs schema.

Latihan kecil:

- trace alur `/dashboard` dari route sampai query data.

Checklist selesai:

- tahu file entry point layout dan auth gate

## Hari 3

Topik belajar:
auth, session, dan role access

File yang harus dibaca:

- `docs/codebase-curriculum/02-auth-and-role-access.md`
- `src/lib/auth/session.ts`
- `src/lib/permissions/index.ts`
- `src/lib/db/schema/auth.ts`

Hal yang harus dipahami:

- fungsi `requireAuth`, `checkRole`, `getCurrentUserRoleRow`,
- role matrix,
- employee-linked self-service lewat `user_roles.employee_id`,
- scoping SPV/KABAG berdasarkan `user_role_divisions`.

Latihan kecil:

- sebutkan action mana saja yang paling berbahaya jika lupa role check.

Checklist selesai:

- paham kenapa employee link dan division scope wajib dicek di server action

## Hari 4

Topik belajar:
schema master dan employee

File yang harus dibaca:

- `docs/codebase-curriculum/03-database-schema.md`
- `src/lib/db/schema/master.ts`
- `src/lib/db/schema/employee.ts`

Hal yang harus dipahami:

- relasi employee ke branch/division/position/grade,
- enum status kerja dan payroll,
- histori perubahan,
- jadwal kerja dan assignment.

Latihan kecil:

- gambar relasi tabel employee dan history di catatan pribadi.

Checklist selesai:

- tahu tabel mana yang dipakai hampir semua modul

## Hari 5

Topik belajar:
master data module

File yang harus dibaca:

- `docs/codebase-curriculum/04-master-data-module.md`
- `src/server/actions/branches.ts`
- `src/server/actions/divisions.ts`
- `src/server/actions/positions.ts`
- `src/server/actions/grades.ts`
- `src/server/actions/work-schedules.ts`

Hal yang harus dipahami:

- pola CRUD server action,
- validasi Zod,
- kapan action memakai transaction.

Latihan kecil:

- jelaskan kenapa work schedule diletakkan di schema employee, bukan master.

Checklist selesai:

- bisa menambah master baru tanpa bingung pattern-nya

## Hari 6

Topik belajar:
employee profiling

File yang harus dibaca:

- `docs/codebase-curriculum/05-employee-profiling-module.md`
- `src/server/actions/employees.ts`
- `src/app/(dashboard)/employees/EmployeesTable.tsx`
- `src/app/(dashboard)/employees/[id]/page.tsx`

Hal yang harus dipahami:

- create/update employee,
- cara history ditulis,
- cara schedule assignment diakhiri/diganti.

Latihan kecil:

- jelaskan apa yang terjadi jika HRD mengganti divisionId dan scheduleId sekaligus.

Checklist selesai:

- paham detail histori employee

## Hari 7

Topik belajar:
performance point dan katalog

File yang harus dibaca:

- `docs/codebase-curriculum/06-performance-point-module.md`
- `src/server/actions/point-catalog.ts`
- `src/server/actions/performance.ts`
- `src/server/point-engine/parse-master-point-workbook.ts`
- `src/server/point-engine/count-target-days-for-period.ts`
- `src/server/point-engine/calculate-monthly-point-performance.ts`

Hal yang harus dipahami:

- versioning katalog poin,
- snapshot di daily activity,
- target default vs override OFFSET,
- generate monthly performance.

Latihan kecil:

- jelaskan perbedaan “divisi aktual harian” dan “divisi snapshot”.

Checklist selesai:

- tahu kenapa target tidak boleh bergantung ke data master live saja

## Hari 8

Topik belajar:
ticketing dan leave quota

File yang harus dibaca:

- `docs/codebase-curriculum/07-ticketing-leave-module.md`
- `src/server/actions/tickets.ts`
- `src/app/(dashboard)/tickets/TicketingClient.tsx`

Hal yang harus dipahami:

- role siapa boleh create/approve,
- cara quota dikonsumsi,
- bagaimana self-service memakai `user_roles.employee_id`.

Latihan kecil:

- buat contoh alur tiket sakit dua hari untuk karyawan yang quota bulanannya masih tersedia.

Checklist selesai:

- paham relasi ticket ke payroll impact

## Hari 9

Topik belajar:
review, incident, dan training

File yang harus dibaca:

- `docs/codebase-curriculum/08-review-and-incident-module.md`
- `docs/codebase-curriculum/09-training-evaluation-module.md`
- `src/server/actions/reviews.ts`
- `src/server/actions/training.ts`

Hal yang harus dipahami:

- formula review,
- incident yang memengaruhi payroll,
- kategori evaluasi training,
- gap rule training vs code.

Latihan kecil:

- hitung manual kategori review untuk skor 4,4,3,4,3.

Checklist selesai:

- tahu area mana yang masih butuh rule tambahan

## Hari 10

Topik belajar:
payroll engine

File yang harus dibaca:

- `docs/codebase-curriculum/10-payroll-module.md`
- `src/server/payroll-engine/resolve-payroll-period.ts`
- `src/server/payroll-engine/resolve-bonus-level.ts`
- `src/server/payroll-engine/calculate-teamwork-payroll.ts`
- `src/server/payroll-engine/calculate-managerial-payroll.ts`
- `src/server/payroll-engine/resolve-payroll-status-transition.ts`

Hal yang harus dipahami:

- periode 26-25,
- bonus kinerja/prestasi,
- prorate gaji,
- unpaid leave deduction,
- SP multiplier.

Latihan kecil:

- hitung secara kasar kenapa training tidak mendapat bonus di engine TEAMWORK.

Checklist selesai:

- bisa membaca output payroll engine tanpa bingung

## Hari 11

Topik belajar:
payroll action, detail page, export, finance

File yang harus dibaca:

- `src/server/actions/payroll.ts`
- `src/app/(dashboard)/payroll/PayrollClient.tsx`
- `src/app/(dashboard)/payroll/[periodId]/[employeeId]/page.tsx`
- `src/app/(dashboard)/finance/page.tsx`
- `src/app/(dashboard)/finance/FinanceDashboardClient.tsx`

Hal yang harus dipahami:

- create period,
- preview,
- finalize,
- paid,
- lock,
- summary finance.

Latihan kecil:

- jelaskan data apa saja yang dibaca saat generate payroll preview.

Checklist selesai:

- tahu lifecycle payroll end-to-end

## Hari 12

Topik belajar:
testing, validasi, dan maintenance checklist

File yang harus dibaca:

- `docs/codebase-curriculum/11-ui-components.md`
- `docs/codebase-curriculum/12-server-actions-and-business-logic.md`
- `docs/codebase-curriculum/13-data-flow-and-user-flow.md`
- `docs/codebase-curriculum/14-testing-and-validation.md`
- `docs/codebase-curriculum/16-maintenance-checklist.md`

Hal yang harus dipahami:

- komponen reusable yang sering dipakai,
- ringkasan semua server action,
- command validasi,
- hotspot maintenance.

Latihan kecil:

- pilih satu bug imajiner di payroll atau performance, lalu tulis file mana yang akan kamu baca dulu.

Checklist selesai:

- siap maintenance modul yang ada
- tahu area mana yang perlu hati-hati sebelum coding
