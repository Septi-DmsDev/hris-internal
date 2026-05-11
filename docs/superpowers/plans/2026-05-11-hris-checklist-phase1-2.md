# HRIS Checklist Phase 1-2 (Analisa Lanjutan)

Tanggal update: 11 Mei 2026
Status: Baseline analisa setelah commit `Update Revisi dari CEO v.2`

## Tujuan Dokumen
- Menyelaraskan status implementasi Phase 1 dan Phase 2 dengan kondisi kode terbaru.
- Menandai gap yang wajib diperbaiki tanpa mengubah sistem/alur existing secara mendadak.
- Menjadi daftar kerja eksekusi berikutnya dengan pola "konfirmasi dulu sebelum ubah flow".

---

## A. Ringkasan Status

### Phase 1 - Profiling & Master Data Foundation
- Status umum: **Mayoritas sudah terimplementasi**, tetapi ada mismatch dokumentasi dan beberapa boundary perlu dirapikan.
- Progress:
  - [x] Fondasi employee grouping baru sudah masuk (`src/lib/employee-groups.ts`, test terkait ada).
  - [x] Penguatan employee profiling dan validation sudah berjalan di action utama.
  - [x] Penyesuaian master route baru (`/master/catalogpoin`) sudah ada.
  - [ ] Sinkronisasi penuh dokumentasi akses employee-linked belum beres.

### Phase 2 - Performance / Ticketing / Review / Training
- Status umum: **Engine inti jalan**, tetapi masih ada gap hardening rule dan konsistensi dokumen-vs-kode.
- Progress:
  - [x] Workflow activity performance (draft/submit/approve/reject) tetap aktif.
  - [x] Input aktivitas harian admin/HRD sudah disederhanakan ke total poin harian final.
  - [x] Scope check server-side masih dipertahankan.
  - [ ] Deadline enforcement H+1/H+2 belum merata.
  - [ ] Rule training "efektif reguler periode payroll berikutnya" belum sesuai penuh.
  - [ ] Audit coverage non-payroll belum merata.

---

## B. Temuan Analisa Phase 1

1. Grouping karyawan
- Implementasi helper grouping sudah menjadi fondasi utama.
- Dampak: UI/validation/action lebih konsisten untuk kategori baru.

2. Profiling dan identity flow
- Perubahan employee/profile flow sudah terlihat di action dan halaman employee.
- Tetap perlu regression check untuk alur account-linked employee.

3. Route documentation mismatch
- Ini bertentangan dengan beberapa dokumen yang masih menuliskan route personal lama sebagai aktif.
- Keputusan yang dibutuhkan: apakah route personal memang sengaja ditutup sementara atau tidak.

4. Dokumentasi belum sepenuhnya sinkron
- Beberapa dokumen kurikulum dan handover masih menyebut flow lama.
- Perlu satu putaran sinkronisasi docs agar onboarding tidak menyesatkan tim.

---

## C. Temuan Analisa Phase 2

1. Performance harian
- Flow baru input total poin harian final sudah aktif untuk admin/HRD.
- Workflow approval masih mengikuti status existing (tidak mengubah lifecycle approval).

2. Deadline rule H+1 / H+2
- Belum terlihat enforcement konsisten di seluruh action terkait.
- Ini masih menjadi gap terhadap `references/business-rules.md`.

3. Training graduation
- `graduateTrainee()` masih jadi titik rawan mismatch terhadap aturan "berlaku payroll periode berikutnya".

4. Audit log coverage
- Payroll dan approval performance relatif kuat.
- Ticket/review/training masih perlu pemerataan audit detail pada aksi kritikal.

---

## D. Checklist Eksekusi (Konfirmasi Dulu)

Catatan: sesuai arahan, item di bawah **tidak dieksekusi dulu** sebelum konfirmasi.

### Paket Phase 1 (Dokumentasi & Konsistensi)
- [ ] P1-02 Tambah section "Known Intentional Changes" agar perbedaan flow lama-baru terdokumentasi.
- [ ] P1-03 Buat matriks route aktif per role pasca revisi v2.

### Paket Phase 2 (Hardening Tanpa Ubah Alur Besar)
- [ ] P2-01 Tambah guard deadline H+1 input TW dan H+2 approval SPV/KABAG/HRD sesuai rule.
- [ ] P2-02 Tambah test coverage action performance untuk deadline dan scope.
- [ ] P2-03 Evaluasi training graduation agar efektif di periode payroll berikutnya (tanpa mengubah payroll lifecycle existing).
- [ ] P2-04 Tambah audit log terarah untuk action kritikal ticket/review/training.

---

## E. Batasan Implementasi
- Jangan ubah arsitektur atau alur besar sistem yang sedang berjalan.
- Jangan ubah behavior bisnis sensitif tanpa keputusan eksplisit.
- Setiap perubahan Phase 2 harus incremental, test-backed, dan reversible.
- Jika ada trade-off non-obvious, wajib konfirmasi dulu sebelum merge.

---

## F. Usulan Urutan Kerja Aman
1. Finalisasi sinkronisasi dokumentasi Phase 1.
2. Pilih 1 paket hardening Phase 2 paling rendah risiko (disarankan: P2-01 + P2-02).
3. Jalankan validasi, laporkan diff behavior, lalu lanjut paket berikutnya.

---

## G. Checklist CEO (Update 11 Mei 2026)

### Perbaikan Sistem HR & Teknos ID
- [x] Tambahkan history karyawan resign
- [x] Tambahkan history perubahan besaran poin tiap jenis pekerjaan (via versioning master poin + snapshot transaksi)
- [x] Tambahkan variable NIK
- [ ] Tambahkan sistem second chance (karyawan punya kesempatan masuk 2 kali)

### Data Karyawan
- [ ] Karyawan bisa upload/update pendidikan
- [ ] Karyawan bisa upload/update kompetensi
- [x] Wajib lengkapi data diri sebelum mengisi poin (gate profile completion)
- [ ] HRD hanya input (otomatis generate username & password default `12345678`) dengan field minimal:
- [ ] Nama lengkap
- [ ] Tanggal masuk
- [x] Ubah Kelompok karyawan:
- [x] Karyawan Tetap (Sebelumnya Managerial)
- [x] Mitra Kerja (Sebelumnya Teamwork)
- [x] Borongan (Tambahan)
- [x] Training (Tambahan)
- [x] Tambahkan foto profil karyawan
- [x] Tambahkan KODE KARYAWAN format `KODECABANG-NOMERURUT` berdasar tanggal masuk

### Akses & Resign
- [x] Larangan akses/login untuk karyawan resign
- [x] Tambahkan form pengajuan resign
- [x] Dashboard HRD approve/tolak pengajuan resign

### Kehadiran & Disiplin
- [x] Logic alpha:
- [x] Alpha pertama = peringatan
- [x] Alpha kedua = otomatis SP1
- [x] Tambahkan notifikasi HRD jika ada tim alpha (monitoring alpha di dashboard/approval queue)
- [x] Dampak SP:
- [x] Kena SP1 turun 1 tingkat bonus kinerja (dengan penalty performa absolut -10 poin)
- [x] Kena SP2 turun 2 tingkat bonus kinerja (dengan penalty performa absolut -20 poin)

### Cuti
- [x] Tampilkan jatah cuti bulanan di dashboard karyawan
- [x] Tampilkan jatah cuti tahunan di dashboard karyawan

### Poin & Performa
- [x] Tambahkan input manual poin harian oleh HRD (input total poin harian final)
- [x] Ubah format desimal poin dari `0,00` ke `0,0`

### BPJS & HRD Monitoring
- [ ] Tambahkan variable status BPJS (Aktif/Tidak Aktif)
- [ ] Tambahkan notifikasi HRD terkait status BPJS

### Table & UI
- [x] Tambahkan fitur sort table berdasarkan variable lain di `/employees` dan `/positioning`

