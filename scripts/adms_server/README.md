# ADMS Receiver Server

Server penerima data ZKTeco ADMS dari mesin BioFinger AT301.
Mesin AT301 push langsung ke server ini via internet — tidak perlu komputer tambahan di kantor.

## Arsitektur

```
[AT301 Kantor A] ──internet──▶
[AT301 Kantor B] ──internet──▶  [adms.it-teknos.site:443] ──▶ [hris.it-teknos.site/api/...]
[AT301 Kantor C] ──internet──▶
```

## Setup di VPS

```bash
# Upload file ke VPS
scp main.py adms.service setup.sh ubuntu@hris-supa.it-teknos.site:/tmp/adms-setup/

# SSH ke VPS
ssh ubuntu@hris-supa.it-teknos.site

# Jalankan setup (perlu sudo)
cd /tmp/adms-setup
sudo bash setup.sh
```

Script setup otomatis:
- Install Python + dependencies
- Setup systemd service (auto-start)
- Setup Nginx reverse proxy
- Setup HTTPS via Certbot (Let's Encrypt)

## Konfigurasi mesin AT301

Setelah server jalan, masuk ke settings mesin:

**Melalui LCD mesin:**
1. Menu → Communication → Cloud Server
2. Enable Cloud Server: **ON**
3. Server Address: `adms.it-teknos.site`
4. Server Port: `80` (atau `443` jika HTTPS sudah aktif)
5. HTTPS: `ON` (setelah Certbot selesai)
6. Save → Reboot mesin

**Atau via Web Admin mesin** (buka IP mesin di browser):
1. Communication → Cloud Setting
2. Isi Server Address, Port
3. Save

## Cek status

```bash
# Status service
sudo systemctl status adms-receiver

# Log realtime
sudo journalctl -u adms-receiver -f

# Health check
curl https://adms.it-teknos.site/health
```

## Sync manual (untuk catch-up data lama)

Kalau mesin sudah nyala lama tapi baru setup sekarang,
data lama sudah tersimpan di mesin. Setelah mesin connect ke server,
data lama akan otomatis terkirim saat push pertama.

Untuk trigger sync manual ke HRD Dashboard:
```bash
# SSH ke VPS, lalu jalankan Python
python3 -c "
import sys; sys.path.insert(0, '/opt/adms-receiver')
from main import send_batch_for_date
from datetime import date, timedelta
for i in range(7):  # 7 hari ke belakang
    send_batch_for_date(date.today() - timedelta(days=i))
"
```

## Jadwal sync ke HRD Dashboard

Setelah menerima data dari mesin, server mengagregasi dan mengirim batch ke API jam:
- **09:05 WIB**
- **14:05 WIB**
- **17:05 WIB**
- **21:05 WIB**

## Troubleshooting

| Masalah | Cek |
|---------|-----|
| Mesin tidak connect | Pastikan `adms.it-teknos.site` bisa diping dari jaringan kantor |
| Data tidak masuk | `journalctl -u adms-receiver -f` — lihat log push masuk |
| Batch tidak terkirim | Cek ADMS_INGEST_TOKEN di service config |
| Mesin AT301 tidak ada menu Cloud | Cari "ADMS" atau "Wiegand" di menu Communication |
