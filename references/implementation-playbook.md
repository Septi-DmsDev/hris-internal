# Implementation Playbook

Gunakan playbook ini saat agent mengerjakan kode proyek HRD Dashboard.

## 1. Sebelum Coding

Untuk setiap task, tentukan:

1. Modul: profiling, performance, review, ticketing, payroll, atau finance.
2. Phase: 1, 2, atau 3.
3. Role terkait: TW, SPV, HRD, Finance, Admin, Managerial.
4. Data sumber dan data output.
5. Aturan bisnis yang berlaku.
6. Risiko audit, payroll, atau keamanan.

Jangan langsung membuat UI jika schema dan rule engine belum jelas.

## 2. Urutan Implementasi Fitur

Urutan umum:

1. Schema/migration.
2. Types/generated type.
3. Server service/rule engine.
4. Server action/route handler.
5. UI form/table/detail.
6. Audit log.
7. Test/validation.
8. Dokumentasi perubahan.

## 3. Pattern Server Action

Mutation harus melalui server action atau route handler.

Mutation wajib:
- validate input dengan Zod;
- cek permission server-side;
- gunakan transaction jika menyentuh payroll, quota, approval, atau adjustment;
- tulis audit log;
- return result yang jelas: success, error, validation issue.

## 4. Pattern Rule Engine

Letakkan rule engine di folder `server/*-engine`.

Contoh:

```text
server/point-engine/resolve-bonus-level.ts
server/ticketing-engine/resolve-leave-quota.ts
server/payroll-engine/calculate-teamwork-payroll.ts
```

Rule engine harus pure sebisa mungkin:
- input data eksplisit;
- output data eksplisit;
- minim side effect;
- mudah ditest.

## 5. Database Rules

Gunakan snake_case untuk nama tabel/kolom database.
Gunakan enum/status yang eksplisit.
Gunakan timestamp untuk created_at, updated_at, submitted_at, approved_at, locked_at.

Tabel penting harus punya:
- created_by
- updated_by bila relevan
- status
- audit trail atau related log table

## 6. RLS & Permission

RLS minimal:
- TW hanya melihat data diri sendiri.
- SPV melihat data karyawan di divisinya.
- HRD melihat semua data HRD/performance/ticketing.
- Finance melihat payroll dan finance modules.
- Admin mengelola master data.

Tetap lakukan permission check di server action, jangan hanya mengandalkan UI hidden state.

## 7. Payroll Rules

Payroll tidak boleh dihitung dari data mentah yang belum final.

Payroll membaca:
- payroll_employee_snapshot;
- monthly_point_performance;
- KPI summary untuk managerial;
- attendance summary;
- approved ticket payroll impact;
- approved additions/deductions;
- adjustment log.

Finalization harus:
- memakai transaction;
- idempotent;
- mengunci periode;
- menyimpan breakdown komponen;
- menulis audit log.

## 8. Output Jawaban Agent

Setelah task selesai, berikan ringkasan:

```text
Yang dikerjakan:
- ...

File diubah:
- ...

Aturan bisnis yang diterapkan:
- ...

Validasi/test:
- ...

Risiko/catatan:
- ...
```

## 9. Larangan

- Jangan hardcode rule payroll di komponen UI.
- Jangan menggunakan service role key di client.
- Jangan menghapus histori payroll, aktivitas, approval, atau ticket tanpa audit.
- Jangan mengubah master poin lama tanpa versioning.
- Jangan membuat finalization yang bisa dijalankan berulang dengan efek samping ganda.
- Jangan mengabaikan edge case training, cuti berbayar, pindah divisi, dan locked period.
