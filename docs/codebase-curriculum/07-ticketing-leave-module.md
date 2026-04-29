# Ticketing Leave Module

## Status

`status: tersedia, tetapi belum lengkap`

File ditemukan:

- `src/lib/db/schema/hr.ts`
- `src/lib/validations/hr.ts`
- `src/server/actions/tickets.ts`
- `src/app/(dashboard)/tickets/page.tsx`
- `src/app/(dashboard)/tickets/TicketingClient.tsx`

Gap yang perlu dibangun:

- self-service `TEAMWORK` dan `MANAGERIAL`,
- audit log khusus keputusan ticket,
- integrasi lebih kaya dengan attendance/point target engine.

## 1. Tujuan Modul

Modul ini mengelola pengajuan dan approval:

- cuti,
- sakit,
- izin,
- emergency,
- setengah hari.

Modul ini penting karena status tiket memengaruhi payroll dan target performa.

## 2. File dan Folder Terkait

| File/Folder | Fungsi | Dipakai Oleh | Catatan |
|---|---|---|---|
| `src/lib/db/schema/hr.ts` | tabel `attendance_tickets` dan `leave_quotas` | ticketing, payroll, dashboard | inti modul |
| `src/lib/validations/hr.ts` | `createTicketSchema`, `ticketDecisionSchema` | action tickets | validasi input |
| `src/server/actions/tickets.ts` | query dan mutation ticket | UI ticketing | modul utama |
| `src/app/(dashboard)/tickets/page.tsx` | page server ticketing | user | menyiapkan option karyawan |
| `src/app/(dashboard)/tickets/TicketingClient.tsx` | UI list, create, approve, reject, cancel | user internal | pakai `DataTable` dan `Dialog` |

## 3. Alur Kerja Modul

```text
User buka /tickets
→ getTickets()
→ requireAuth()
→ role menentukan data scope
→ page ambil opsi employee jika role pengelola
→ DataTable tampil
```

```text
Create ticket
→ createTicket()
→ checkRole()
→ validasi Zod
→ cek scope SPV bila pembuat adalah SPV
→ hitung daysCount dari tanggal mulai-akhir
→ insert attendance_tickets status SUBMITTED
→ revalidate /tickets
```

```text
Approve ticket
→ approveTicket()
→ checkRole(APPROVER_ROLES)
→ validasi input
→ cek status tiket
→ cek scope SPV
→ jika payrollImpact belum dipilih dan bukan setengah hari
→ cek eligibility > 12 bulan
→ konsumsi leave quota bulanan lebih dulu
→ jika penuh, coba annual quota
→ update attendance_tickets dengan status approved dan payrollImpact
```

## 4. Penjelasan File-by-File

### `src/lib/db/schema/hr.ts`

Fungsi utama:
mendefinisikan `attendance_tickets` dan `leave_quotas`.

Logika penting:

- ticket menyimpan `startDate`, `endDate`, `daysCount`, `status`, `payrollImpact`.
- leave quota menyimpan total dan used untuk bulanan/tahunan per tahun.

### `src/server/actions/tickets.ts`

Fungsi utama:
workflow ticket dan kuota cuti.

Export utama:
`getTickets()`, `createTicket()`, `approveTicket()`, `rejectTicket()`, `cancelTicket()`, `generateLeaveQuota()`

Logika penting:

- `getTickets()`:
  - SPV hanya melihat tiket divisinya,
  - `TEAMWORK`/`MANAGERIAL` hanya akan melihat tiket yang dibuat user itu sendiri,
  - admin/HRD melihat semua.
- `createTicket()`:
  - role `TEAMWORK` dan `MANAGERIAL` saat ini diblokir dengan error eksplisit karena belum ada relasi `auth user -> employee`,
  - SPV hanya boleh membuat tiket untuk employee di divisinya.
- `approveTicket()`:
  - status approve menjadi `APPROVED_SPV` atau `APPROVED_HRD`,
  - quota dipakai otomatis: monthly dulu, lalu annual,
  - jika tidak eligible atau quota tidak ada/habis, hasil default `UNPAID`.
- `rejectTicket()`:
  - alasan penolakan wajib diisi.
- `cancelTicket()`:
  - hanya pembuat tiket atau HRD/SUPER_ADMIN yang boleh membatalkan,
  - tiket yang sudah diproses tidak bisa dibatalkan.
- `generateLeaveQuota()`:
  - hanya HRD/SUPER_ADMIN,
  - hanya untuk employee yang eligible > 1 tahun,
  - menolak duplikasi quota per tahun.

### `src/app/(dashboard)/tickets/page.tsx`

Fungsi utama:
menentukan daftar employee options hanya untuk role yang memang boleh membuat/approve ticket atas nama karyawan.

### `src/app/(dashboard)/tickets/TicketingClient.tsx`

Fungsi utama:
UI ticket list, create, approve, reject, cancel.

Logika penting:

- semua create/decision memakai dialog,
- status dan payroll impact diterjemahkan ke badge dan label,
- tabel memakai `searchKey="employeeName"`.

## 5. Business Rules yang Diterapkan

- approver hanya `SUPER_ADMIN`, `HRD`, `SPV`.
- SPV hanya boleh memproses ticket dalam divisinya.
- self-service `TEAMWORK`/`MANAGERIAL` sementara diblokir.
- eligible leave quota dihitung dari masa kerja kira-kira 12 bulan.
- prioritas quota:
  1. `PAID_QUOTA_MONTHLY`
  2. `PAID_QUOTA_ANNUAL`
  3. `UNPAID`
- ticket `SETENGAH_HARI` tidak otomatis mengonsumsi quota pada flow approve saat ini.
- tiket yang sudah diproses tidak bisa dibatalkan.

## 6. Data yang Dibaca dan Ditulis

| Tabel Database | Dibaca | Ditulis | Fungsi |
|---|---|---|---|
| `attendance_tickets` | ya | ya | tiket dan status approval |
| `leave_quotas` | ya | ya | kuota leave bulanan/tahunan |
| `employees` | ya | tidak | cek masa kerja, divisi, list employee |
| `divisions` | ya | tidak | label divisi pada list |

## 7. Edge Case

- employee belum 1 tahun kerja → quota tidak bisa dibuat dan approve default ke `UNPAID`.
- quota record belum dibuat → approve tetap berjalan, tetapi impact bisa tetap `UNPAID`.
- reason penolakan kosong → reject ditolak.
- SPV tanpa `divisionId` → tidak bisa approve/reject/create ticket scoped.

## 8. Hal yang Perlu Diperhatikan Developer

- belum ada mapping auth ke employee, jadi self-service karyawan belum aman.
- belum ada audit log khusus selain kolom timestamp dan actor di tabel ticket.
- modul ini belum mengubah target harian performance secara langsung; integrasi penuh dengan engine target perlu review lanjutan.

## 9. Contoh Alur Nyata

```text
SPV buka /tickets
→ hanya melihat tiket karyawan di divisinya
→ klik Ajukan Tiket untuk salah satu karyawan
→ createTicket() menyimpan status SUBMITTED
→ HRD atau SPV klik Setujui
→ approveTicket() cek eligibility cuti > 12 bulan
→ sistem mencoba mengurangi quota bulanan
→ jika berhasil, payrollImpact = PAID_QUOTA_MONTHLY
→ tiket tersimpan sebagai APPROVED_SPV atau APPROVED_HRD
→ payroll nanti membaca ticket approved dalam periode aktif
```
