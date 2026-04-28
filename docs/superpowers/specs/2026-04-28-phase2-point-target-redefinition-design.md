# Phase 2 Point Target Redefinition Design

**Date:** 2026-04-28  
**Status:** Approved  
**Approach:** Snapshot-Based Division Target (Approach B)

## Summary

Dokumen ini merekonstruksi rule target poin harian sebelum implementasi Phase 2 dimulai. Konteks baru berasal dari workbook `DATABASE POIN.xlsx` yang menjadi sumber master pekerjaan lintas divisi.

Perubahan inti:

- target poin harian default berubah dari `12.000` menjadi `13.000`,
- divisi `OFFSET` memakai target poin harian khusus `39.000`,
- input pekerjaan harian tetap mengikuti `divisi aktual harian`,
- target performa harian dan bulanan mengikuti `divisi payroll snapshot / divisi awal periode`.

## Evidence From Workbook

Sumber: `C:\Users\P C\Downloads\DATABASE POIN.xlsx`, sheet `MASTER_BERSIH`.

Temuan penting:

- Workbook berisi 12 divisi operasional.
- `OFFSET` adalah divisi mandiri dengan `53` item pekerjaan.
- Struktur data saat ini: `DIVISI`, `NO`, `JENIS PEKERJAAN (EYD)`, `POIN (ID)`, `KETERANGAN/SATUAN`.
- Data ini cocok dipakai sebagai fondasi `master point pekerjaan` Phase 2.

## Decision

| Item | Decision |
|---|---|
| Default target harian | `13.000` |
| Override target harian | `OFFSET = 39.000` |
| Resolusi target | Berdasarkan `divisi payroll snapshot / divisi awal periode` |
| Pemilihan pekerjaan harian | Berdasarkan `divisi aktual harian` |
| Status `SETENGAH_HARI` | Tetap memakai target penuh sesuai hasil resolusi target divisi |
| Status `ALPA` | Tetap masuk target penuh sesuai hasil resolusi target divisi, poin aktual `0` |

## Recommended Rule Model

### 1. Dua konsep divisi tetap dipertahankan

- `Divisi aktual harian`
  Fungsi: menentukan daftar pekerjaan yang boleh dipilih user saat input aktivitas.
- `Divisi payroll snapshot`
  Fungsi: menentukan target poin harian dasar, target bulanan, dan basis evaluasi performa periode.

### 2. Target poin tidak lagi satu angka global

Target poin harian harus diselesaikan lewat resolver:

```text
Jika divisi payroll snapshot = OFFSET -> target harian = 39.000
Jika divisi payroll snapshot != OFFSET -> target harian = 13.000
```

### 3. Rumus target bulanan berubah

```text
Target Poin Bulanan = Target Harian Terselesaikan x Jumlah Hari Masuk Target
```

Contoh:

- Karyawan snapshot `FINISHING`, 22 hari target:
  `13.000 x 22 = 286.000`
- Karyawan snapshot `OFFSET`, 22 hari target:
  `39.000 x 22 = 858.000`

### 4. Rule pindah divisi tetap audit-safe

Jika karyawan membantu divisi lain di tengah periode:

- pekerjaan yang diinput mengikuti `divisi aktual harian`,
- target performa tetap mengikuti `divisi payroll snapshot`,
- bonus/performa tidak berubah karena perpindahan harian sementara.

Ini sengaja mempertahankan sifat audit-safe dari konsep lama.

## Why This Approach

### Option A: Global Hardcode

- Semua divisi `13.000`, `OFFSET` di-hardcode khusus.
- Cepat, tetapi rapuh dan susah diperluas bila nanti ada divisi target khusus lain.

### Option B: Snapshot-Based Division Target

- Default `13.000`.
- Override target berdasarkan divisi snapshot.
- Konsisten dengan rule snapshot payroll dan tetap kompatibel dengan perpindahan divisi tengah periode.

### Option C: Daily Actual Division Target

- Target ikut divisi kerja aktual setiap hari.
- Terlihat fleksibel, tetapi membuat performa periode dan payroll lebih sulit diaudit.

**Chosen:** Option B.

## Impacted Concept Areas

Area yang wajib disinkronkan:

1. `references/project-concept-3-phase.md`
2. `references/business-rules.md`
3. `references/implementation-playbook.md`
4. `src/config/constants.ts`
5. Phase 2 schema/rule engine design untuk:
   - master point versioning,
   - division target resolver,
   - monthly performance calculation,
   - training evaluation input.

## Forward Model For Phase 2

Agar implementasi berikutnya tidak mentok, Phase 2 sebaiknya memakai model berikut:

- `master_point_catalog`
  Menyimpan pekerjaan per divisi dari workbook.
- `division_point_target_rules`
  Menyimpan default dan override target per divisi/periode versi.
- `daily_activity_entries`
  Menyimpan input aktivitas harian berbasis divisi aktual.
- `monthly_point_performance`
  Menghitung performa berdasarkan target snapshot dan poin approved.

## Out of Scope For This Redefinition

- Import penuh workbook ke database.
- UI input aktivitas harian.
- Approval SPV workflow.
- Perhitungan bonus/payroll engine.

Dokumen ini hanya menetapkan ulang rule fondasi supaya implementasi Phase 2 dimulai dari model yang benar.
