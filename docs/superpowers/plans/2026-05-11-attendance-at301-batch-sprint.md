# Sprint Integrasi BioFinger AT301 - Batch Attendance

Tanggal: 2026-05-11
Branch kerja: `feature/attendance-at301-batch`
Workspace: `.worktrees/attendance-at301-batch`

## Tujuan
- Integrasi absensi BioFinger AT301 lewat cloud server batch.
- Cloud kirim rekap per karyawan per tanggal.
- HRD Dashboard hitung `TELAT` berdasarkan jadwal kerja.
- Toleransi hanya untuk istirahat/pulang, 5 menit. Check-in masuk tanpa toleransi.
- Data kosong tidak auto `ALPA`; HRD yang tindak lanjut.
- Payroll tetap membaca `employee_attendance_records` yang sama.

## Keputusan yang sudah dikunci
- User ID mesin sama dengan `employeeCode`.
- Jadwal sync cloud: `09.00`, `14.00`, `17.00`, `21.00`.
- Label batch tidak disimpan sebagai status.
- Cloud mengirim rekap final, bukan `punctualityStatus`.
- Manual HRD tetap menang atas data fingerprint.
- Raw punch log tetap boleh disimpan di cloud; dashboard menyimpan hasil rekap final + `rawPayload`.

## Ruang Sprint

### Task 1 - Kontrak ingest ADMS
- Update schema ingest agar menerima rekap batch per karyawan per tanggal.
- Hapus keharusan `punctualityStatus` dari payload cloud.
- Pertahankan idempotent upsert dan prioritas data manual.
- Kembalikan ringkasan `inserted`, `updated`, `skipped`, dan `errors`.

### Task 2 - Model toleransi jadwal
- Tambah penyimpanan toleransi di master jadwal.
- Simpan toleransi istirahat/pulang `5` menit.
- Simpan toleransi masuk kerja `0` menit.
- Jika perlu, snapshot rule disimpan bersama hasil rekap agar histori tidak berubah saat master jadwal diganti.

### Task 3 - Resolver punctuality
- Bandingkan `checkInTime` terhadap jam masuk jadwal.
- Bandingkan jam kembali istirahat / `checkOutTime` terhadap jadwal + toleransi.
- Set `punctualityStatus = TELAT` bila aturan jadwal dilanggar.
- Tetap biarkan data harian kosong bila belum ada scan yang valid.

### Task 4 - Payroll dan validasi
- Pastikan payroll tetap menghitung bonus disiplin dari hasil absensi yang sudah di-resolve.
- Pastikan record kosong tidak otomatis dianggap `ALPA`.
- Tambah test untuk normal day, telat istirahat/pulang, missing check-out, dan manual override.

### Task 5 - QA dan dokumentasi
- Jalankan `tsc`, `lint`, dan test relevan.
- Update catatan repo agar alur batch AT301 bisa dibaca ulang dari repo saja.

## Model Eksekusi
- Gunakan `subagent-driven-development`.
- Satu subagent implementer per task.
- Review dua tahap per task: spec compliance lalu code quality.
- Kerjakan di worktree, jangan di `main`.

## Acceptance Criteria
- Cloud batch bisa sync tanpa mengirim `punctualityStatus`.
- HRD Dashboard menghitung `TELAT` dari jadwal kerja.
- Toleransi istirahat/pulang 5 menit berjalan.
- Check-in tidak punya toleransi.
- Data kosong tidak auto diisi `ALPA`.
- Payroll tetap konsumsi hasil absensi yang sama tanpa perubahan jalur baca.

