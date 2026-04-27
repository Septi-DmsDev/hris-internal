---
name: hrd-dashboard-agent
description: gunakan skill ini saat mengerjakan proyek hrd dashboard berbasis next.js, supabase, dan postgresql yang mencakup profiling karyawan, manajemen poin kinerja, review karyawan, ticketing izin/sakit/cuti, training evaluation, payroll system, finance closing, rls, audit log, dan rule engine. skill ini membantu agent coding seperti codex, claude code, atau chatgpt menjaga konteks bisnis, arsitektur 3 phase, aturan payroll/performance, struktur modul, workflow eksekusi, standar implementasi, dan checklist validasi agar perubahan kode tetap sinkron dengan konsep proyek.
---

# HRD Dashboard Agent

## Overview

Gunakan skill ini sebagai handbook agent untuk membangun, mereview, atau memodifikasi proyek **HRD Dashboard** berbasis **Next.js + Supabase/PostgreSQL**. Skill ini menjaga agar agent tidak keluar dari konteks bisnis yang sudah disepakati: Profiling Karyawan, Performance Engine, Ticketing, Review, dan Payroll System.

## Cara Menggunakan Skill Ini

Saat mendapat task terkait proyek ini:

1. Baca instruksi utama di file ini.
2. Jika task menyentuh domain bisnis, baca `references/business-rules.md`.
3. Jika task menyentuh arsitektur, modul, atau roadmap, baca `references/project-concept-3-phase.md`.
4. Jika task menyentuh implementasi teknis, baca `references/tech-stack.md` dan `references/implementation-playbook.md`.
5. Jika bekerja di Claude Code atau Codex, gunakan `AGENTS.md` atau `CLAUDE.md` sebagai instruksi repo-level.
6. Selalu buat perubahan kecil, terstruktur, dan bisa diuji.

## Prinsip Utama Proyek

- Jangan hitung payroll, bonus, leave quota, adjustment, atau finalization di client/browser.
- Pusatkan business logic sensitif di server-side engine atau PostgreSQL transaction.
- Gunakan snapshot untuk data yang memengaruhi histori: master poin, payroll period, divisi payroll, jabatan, grade, gaji, dan status karyawan.
- Gunakan PostgreSQL RLS dan validasi server-side untuk role access.
- Semua approval, override, finalization, dan adjustment wajib punya audit log.
- Payroll adalah final calculation engine, bukan tempat input semua data mentah.
- Jangan ubah aturan bisnis yang sudah final tanpa menandai sebagai asumsi atau meminta konfirmasi.

## Phase Proyek

### Phase 1: Profiling Karyawan & Master Data Foundation

Fokus:
- employee profile
- cabang, divisi, jabatan, grade
- status training/reguler
- role dan permission
- jadwal kerja individual
- histori perubahan divisi, jabatan, grade, SPV

Output minimal:
- halaman profil karyawan
- master data dasar
- role-based access awal
- jadwal kerja sebagai dasar target poin dan payroll

### Phase 2: Performance Management Engine

Fokus:
- manajemen poin kinerja
- input aktivitas TW/operator
- approval SPV
- review karyawan
- incident log
- ticketing izin/sakit/cuti
- leave quota
- training evaluation

Output minimal:
- daily activity input
- master poin versioning
- monthly point performance
- ticketing dengan payroll impact
- review bulanan
- monitoring training

### Phase 3: Payroll System & Finance Closing

Fokus:
- payroll period 26-25
- employee payroll snapshot
- salary config
- payroll preview
- payroll finalization
- paid/locked period
- payslip
- salary additions/deductions
- adjustment

Output minimal:
- payroll preview yang bisa diaudit
- finalization idempotent
- payslip breakdown
- payroll history
- exception dashboard

## Workflow Eksekusi Agent

Untuk setiap task coding:

1. Identifikasi modul dan phase.
2. Jelaskan data sumber dan data output.
3. Cek aturan bisnis terkait sebelum membuat kode.
4. Rancang perubahan minimal: schema, server action/service, UI, test.
5. Implementasikan business logic di server atau database, bukan di client.
6. Tambahkan validasi Zod atau database constraint.
7. Tambahkan audit log untuk action penting.
8. Tambahkan test untuk rule engine bila ada perhitungan.
9. Jalankan lint/typecheck/test jika tersedia.
10. Berikan ringkasan perubahan dan risiko yang tersisa.

## Standar Implementasi

### Next.js

- Gunakan App Router.
- Gunakan Server Components untuk read-heavy pages.
- Gunakan Server Actions atau Route Handlers untuk mutation.
- Jangan memanggil service role key di client.
- Jangan menyimpan secret di file yang masuk repo.

### Supabase/PostgreSQL

- Aktifkan RLS untuk tabel yang bisa diakses client.
- Buat custom role/permission table.
- Gunakan migration untuk perubahan schema.
- Gunakan transaction untuk payroll finalization, leave quota consumption, dan adjustment.
- Gunakan audit table untuk action penting.

### UI

- Gunakan Tailwind CSS dan shadcn/ui.
- Gunakan TanStack Table untuk data besar.
- Gunakan React Hook Form + Zod untuk form.
- Tampilkan status, exception, dan audit note secara eksplisit.

## Output yang Diharapkan dari Agent

Saat menjawab atau mengeksekusi task, agent harus memberikan:

- ringkasan pendek apa yang akan/baru dilakukan;
- file yang diubah;
- perubahan schema bila ada;
- aturan bisnis yang diterapkan;
- cara validasi/test;
- catatan risiko atau keputusan yang perlu dikonfirmasi.

## Referensi

- `references/project-concept-3-phase.md` — konsep lengkap dashboard dan roadmap 3 phase.
- `references/tech-stack.md` — tech stack, arsitektur, folder structure, security, deployment.
- `references/business-rules.md` — aturan bisnis ringkas yang wajib dijaga agent.
- `references/implementation-playbook.md` — workflow implementasi praktis untuk coding agent.
- `assets/agent-startup-prompt.md` — prompt awal siap pakai untuk agent.
- `AGENTS.md` — instruksi repo-level untuk Codex/agent coding umum.
- `CLAUDE.md` — instruksi repo-level untuk Claude Code.
