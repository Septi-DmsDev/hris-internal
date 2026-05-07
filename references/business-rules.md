# Business Rules HRD Dashboard

Dokumen ini merangkum aturan bisnis yang wajib dijaga saat membangun HRD Dashboard.

> Catatan code 2026-05-04:
> Business rules di bawah adalah sumber aturan bisnis. Jika implementasi aktual berbeda, catat sebagai gap dan jangan mengubah rule diam-diam. Gap yang diketahui: enforcement deadline H+1/H+2 belum lengkap, status lulus training di code masih langsung berubah, dan beberapa hardening payroll lanjutan masih dilacak di `next-update.md`.

## Kelompok Karyawan

| Kelompok | Contoh role | Metode penilaian |
|---|---|---|
| MANAGERIAL | Kabag, SPV, TL, Staff | KPI bulanan |
| TEAMWORK | TW, Operator | Poin kerja harian |

TEAMWORK memiliki status:
- Training
- Reguler
- Dialihkan Training
- Tidak Lolos / Keluar
- Nonaktif / Resign

## Periode Payroll

Periode rekap dan payroll:

```text
Tanggal 26 bulan sebelumnya sampai tanggal 25 bulan berjalan
```

Payroll harus memakai snapshot awal periode untuk divisi payroll, jabatan, grade, gaji, status, dan kelompok karyawan.

## Poin Kinerja TEAMWORK

Target harian:

```text
Default 13.000 poin per hari
Divisi Offset 39.000 poin per hari
```

Rumus:

```text
Target Bulanan = target harian hasil resolusi divisi snapshot x jumlah hari masuk target
Persentase Kinerja = total poin approved / target bulanan x 100%
```

Status hari:

| Status | Masuk target | Target | Poin aktual |
|---|---:|---:|---:|
| Kerja normal | Ya | 13.000 default / 39.000 Offset | sesuai input approved |
| Setengah hari | Ya | 13.000 default / 39.000 Offset | sesuai input approved |
| Alpa | Ya | 13.000 default / 39.000 Offset | 0 |
| Cuti approved | Tidak | 0 | 0 |
| Sakit approved | Tidak | 0 | 0 |
| Izin approved | Tidak | 0 | 0 |
| Off/libur jadwal | Tidak | 0 | 0 |

## Bonus Kinerja TEAMWORK

Tidak ada pembulatan level bonus.

| Persentase | Bonus kinerja | Bonus prestasi |
|---:|---|---|
| < 80% | 0 | 0 |
| 80% - 89.99% | bonus 80% | 0 |
| 90% - 99.99% | bonus 90% | 0 |
| 100% - 139.99% | bonus 100% | 0 |
| 140% - 164.99% | bonus 100% | prestasi 140% |
| >= 165% | bonus 100% | prestasi 165% saja |

Jika mencapai 165%, bonus prestasi yang didapat hanya 165%, bukan 140% + 165%.

## Input dan Approval Aktivitas

- TW input aktivitas maksimal H+1 dari tanggal kerja.
- TW hanya bisa memilih pekerjaan sesuai divisi aktual harian.
- Target performa harian dan bulanan mengikuti divisi payroll snapshot / divisi awal periode.
- Total poin = jumlah x poin master.
- SPV hanya bisa approve/tolak, tidak bisa mengubah data.
- SPV approve/tolak maksimal H+2 setelah input.
- Jika ditolak, TW revisi maksimal H+1 setelah penolakan.
- SPV approve ulang maksimal H+1 setelah submit ulang.
- HRD boleh override dengan alasan wajib.
- Setelah payroll closing, perubahan hanya lewat adjustment.

## Master Poin

- Master poin wajib versioning.
- Transaksi aktivitas wajib menyimpan snapshot: point_id, versi, nama pekerjaan, divisi, poin satuan, satuan.
- Perubahan master poin tidak boleh mengubah histori lama.

## Training

- Gaji training Rp1.000.000/bulan.
- Jika masuk tengah periode, prorate berdasarkan hari aktif training.
- Poin training tidak menentukan bonus; poin menentukan kelulusan training.
- Minimal training 1 bulan, maksimal 3 bulan.
- Jika lulus training di tengah periode, status reguler efektif mulai periode payroll berikutnya.

Standar minimal lulus training:

| Divisi | Minimal |
|---|---:|
| Creative | 70% |
| Printing | 75% |
| Finishing | 80% |
| Logistic | 80% |
| Offset | 80% |
| Blangko / Pabrik | 80% |

## Resolusi Target Divisi

Rule target poin:

```text
Jika divisi payroll snapshot = Offset -> target harian = 39.000
Jika divisi payroll snapshot != Offset -> target harian = 13.000
```

Rule ini dipakai untuk:
- target harian,
- target bulanan,
- persentase performa bulanan,
- evaluasi training berbasis poin.

Jika karyawan membantu divisi lain di tengah periode:
- daftar pekerjaan tetap mengikuti divisi aktual harian;
- target performa tetap mengikuti divisi snapshot periode berjalan.

## Review Karyawan

Review mengukur kualitas, disiplin, sikap kerja, SOP, dan potensi. Review tidak langsung mengubah bonus kinerja di MVP.

Aspek review:
- SOP & Kualitas Kerja
- Pemahaman Instruksi
- Absensi & Disiplin
- Inisiatif, Teamwork & 5R
- Miss Proses & Tanggung Jawab

## Ticketing Izin/Sakit/Cuti

Semua izin/sakit/cuti harus berbasis tiket.

Default:
- izin/sakit/cuti harian tidak dibayar;
- gaji pokok dipotong;
- bonus fulltime tidak didapat;
- target poin tidak dihitung jika ticket approved.

Untuk form TEAMWORK:
- field yang ditampilkan cukup jenis tiket, rentang tanggal/durasi, alasan/catatan, dan bukti bila memang diwajibkan;
- akun self-service memakai `user_roles.employee_id` sebagai karyawan tujuan;
- sakit lebih dari 1 hari wajib melampirkan surat dokter atau bukti pendukung lain yang valid.

Untuk karyawan dengan masa kerja > 1 tahun dan punya tunjangan tahunan:
- kuota cuti bulanan 1x;
- kuota cuti tahunan sampai 3x;
- izin/sakit pertama otomatis mengambil kuota cuti bulanan;
- izin berikutnya user memilih cuti tahunan atau izin biasa;
- cuti berkuota tidak memotong gaji pokok, tetapi tetap menggugurkan bonus fulltime.

## Payroll

Gaji pokok reguler default:

```text
Rp1.200.000 / bulan
```

Formula umum:

```text
THP =
Gaji Pokok Dibayar
+ Tunjangan Grade
+ Tunjangan Masa Kerja
+ Uang Harian
+ Overtime
+ Bonus Fulltime
+ Bonus Disiplin
+ Bonus Kinerja
+ Bonus Prestasi
+ Bonus Team / KPI
+ Penambah Manual
- Potongan
- Potongan Unpaid Leave
+/- Adjustment
```

Bonus fulltime:
- hanya jika benar-benar hadir penuh;
- izin/sakit/cuti/alpa membuat bonus fulltime gugur;
- cuti berbayar tetap menggugurkan fulltime.

Bonus disiplin:
- tidak telat;
- tidak alpa;
- performa minimal 80%;
- di bawah 80% tidak dapat bonus disiplin.

SP penalty:
- diterapkan ke bonus saja;
- tidak memotong gaji pokok.

Overtime:
- pertahankan logika base code finance;
- gunakan istilah Overtime di UI.

Payroll finalization:
- harus idempotent;
- tidak boleh mengurangi cicilan/tenor berkali-kali akibat finalisasi ulang;
- setelah paid/locked, koreksi masuk adjustment periode berikutnya.

## Variable Penambah Gaji

| Kategori | Berlaku untuk | Aturan |
|---|---|---|
| Penambahan Manual | Semua karyawan | Bebas, keterangan wajib diisi |

## Variable Pengurang Gaji

| Kategori | Berlaku untuk | Aturan |
|---|---|---|
| BPJS | Semua karyawan | Recurring setiap bulan selama masih aktif bekerja |
| Kasbon | Semua karyawan | Maksimum **Rp 300.000** per karyawan per periode payroll |
| Ganti Rugi Personal | Semua karyawan (MANAGERIAL & TEAMWORK) | Satu kali per karyawan per periode; tidak bisa duplikat |
| Ganti Rugi Team | **Karyawan MANAGERIAL only** | Satu kali per karyawan per periode; tidak bisa duplikat |
| Cicilan | Karyawan tertentu yang punya pinjaman | Recurring setiap bulan; wajib isi sisa tenor (bulan); tenor dicatat bukan otomatis didekrementasi — finance input manual tiap periode sampai tenor habis |

Catatan implementasi:
- Business rules di-enforce server-side di `addPayrollAdjustment` (`src/server/actions/payroll.ts`)
- Kategori disimpan sebagai prefix di field `reason` (tidak ada migrasi skema baru — `adjustment_type` tetap `ADDITION`/`DEDUCTION`)
- Format: `KASBON`, `BPJS::catatan`, `GANTI_RUGI_PERSONAL::deskripsi`, `GANTI_RUGI_TEAM::deskripsi`, `CICILAN::12::deskripsi`, `MANUAL_ADDITION::alasan`
