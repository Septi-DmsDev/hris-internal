# Maintenance Checklist

## 1. Tujuan Dokumen

Checklist ini dipakai sebelum, saat, dan setelah mengubah code agar perubahan tetap aman terhadap business rule project HRD Dashboard.

## 2. Checklist Sebelum Mengubah Code

- sudah baca business rule modul terkait
- sudah tahu phase modulnya
- sudah tahu role yang terdampak
- sudah tahu tabel yang dibaca dan ditulis
- sudah tahu apakah perubahan memengaruhi snapshot/history
- sudah tahu apakah perlu transaction
- sudah tahu apakah perlu audit log

## 3. Checklist per Layer

### Auth dan Access

- apakah route/action ini sudah memanggil `requireAuth()`?
- apakah role check sudah sesuai?
- apakah SPV harus dibatasi `divisionId`?
- apakah self-access butuh mapping `auth user -> employee`?

### Validation

- apakah input baru sudah masuk `src/lib/validations/*`?
- apakah enum/status baru konsisten dengan schema dan UI?
- apakah error message cukup jelas?

### Database dan Schema

- apakah perubahan butuh field baru atau table baru?
- apakah field itu perlu history/snapshot?
- apakah perubahan ke master bisa mengubah histori modul lain?
- apakah perubahan payroll/performance perlu idempotency?

### Server Actions

- apakah action baru cukup baca/tulis satu tabel, atau perlu transaction?
- apakah `revalidatePath()` sudah sesuai?
- apakah ada status yang tidak boleh diubah dari state tertentu?

### Rule Engine

- apakah logic sensitif ditempatkan di server/engine, bukan di client?
- apakah ada test unit untuk rule baru?
- apakah formula mengikuti `references/business-rules.md`?

### UI

- apakah status label dan badge sudah sinkron dengan enum?
- apakah form mengikuti schema input terbaru?
- apakah dialog destructive memakai confirm?
- apakah DataTable searchKey masih benar?

## 4. Checklist Maintenance per Modul

### Master Data

- cek dampak ke employee option
- cek kode unik
- cek data master yang dipakai payroll/training

### Employee Profiling

- cek apakah perubahan perlu history
- cek schedule assignment lama ditutup dengan benar
- cek scope SPV

### Performance

- cek versi katalog aktif
- cek snapshot poin tetap aman
- cek activity status transition
- cek target days dan divisi snapshot

### Ticketing

- cek status ticket sebelum approve/reject/cancel
- cek priority quota monthly → annual → unpaid
- cek scope SPV
- cek gap self-service

### Review/Incident

- cek formula bobot review
- cek incident type yang memengaruhi payroll
- cek siapa yang boleh validate review

### Training

- cek apakah keputusan training harus langsung atau next payroll
- cek standar lulus per divisi
- cek status karyawan masih `TRAINING`

### Payroll

- cek status periode sebelum preview/finalize/paid/lock
- cek snapshot tetap dipakai
- cek KPI managerial lengkap
- cek ticket approved dan incident aktif masuk periode
- cek activity dan monthly performance dikunci saat finalize
- cek audit log payroll ditulis

## 5. Hotspot yang Paling Berisiko

| Area | Risiko |
|---|---|
| `src/server/actions/payroll.ts` | efek lintas modul dan banyak tabel |
| `src/server/actions/employees.ts` | histori karyawan bisa salah bila effective date keliru |
| `src/server/actions/performance.ts` | status workflow dan generate monthly |
| `src/server/actions/tickets.ts` | leave quota bisa double consume jika salah modifikasi |
| `src/lib/auth/session.ts` | role gate salah bisa membuka data sensitif |
| `src/proxy.ts` | auth redirect semua route |

## 6. Inkonsistensi yang Selalu Perlu Diingat

- `HANDOVER.md` belum menggambarkan payroll aktual.
- `README.md` root masih default template.
- `docs/onboarding-curriculum.md` masih menyebut `middleware.ts`.
- business rule beberapa area lebih maju daripada code:
  - self-service performance/ticket,
  - deadline H+1/H+2,
  - training efektif payroll berikutnya,
  - RLS.

## 7. Checklist Setelah Mengubah Code

- jalankan `pnpm lint`
- jalankan `pnpm vitest run`
- jalankan `pnpm tsc --noEmit`
- jalankan `pnpm build`
- cek ulang role affected
- cek ulang data flow modul terdampak
- update dokumentasi bila behavior bisnis berubah

## 8. Area yang Perlu Review Lanjutan

- policy RLS yang sebenarnya
- mapping `auth user -> employee`
- overtime dan uang harian di payroll preview
- audit log selain payroll/performance activity log
