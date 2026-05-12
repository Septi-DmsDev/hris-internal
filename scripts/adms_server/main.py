#!/usr/bin/env python3
"""
ADMS Receiver Server
Server penerima data ZKTeco ADMS dari mesin BioFinger AT301.

Menjalankan dua fungsi:
1. HTTP server yang berbicara protokol ZKTeco ADMS (port 8000)
2. Scheduler yang mengirim batch rekap ke HRD Dashboard API (09:00/14:00/17:00/21:00 WIB)

Install:
    pip install fastapi uvicorn apscheduler requests

Jalankan:
    python main.py

Atau sebagai service (lihat adms.service):
    sudo systemctl start adms-receiver
"""

import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Query, Request
from fastapi.responses import PlainTextResponse

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
HRD_API_URL = os.environ.get(
    "HRD_API_URL",
    "https://hris.it-teknos.site/api/integrations/adms/attendance",
)
ADMS_INGEST_TOKEN = os.environ.get("ADMS_INGEST_TOKEN", "")
DB_PATH = os.environ.get("DB_PATH", "/var/lib/adms-receiver/punches.db")

# Zona waktu WIB (UTC+7) — sesuaikan jika server di timezone berbeda
WIB = timezone(timedelta(hours=7))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("adms")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS punch_logs (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                device_sn  TEXT    NOT NULL,
                employee_code TEXT NOT NULL,
                punch_time TEXT    NOT NULL,  -- ISO datetime string
                punch_type INTEGER NOT NULL,  -- 0=masuk,1=pulang,2=keluar_istirahat,3=masuk_istirahat
                synced     INTEGER NOT NULL DEFAULT 0,
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_punch_logs_date
            ON punch_logs (employee_code, punch_time, synced)
        """)


def store_punches(device_sn: str, raw_body: str):
    """Parse body ATTLOG ZKTeco dan simpan ke DB."""
    rows_saved = 0
    with get_db() as conn:
        for line in raw_body.strip().splitlines():
            parts = line.strip().split("\t")
            if len(parts) < 3:
                continue
            employee_code = parts[0].strip()
            punch_time_str = parts[1].strip()   # "2026-05-12 07:30:15"
            try:
                punch_type = int(parts[2].strip())
                datetime.strptime(punch_time_str, "%Y-%m-%d %H:%M:%S")  # validate
            except (ValueError, IndexError):
                continue

            conn.execute(
                """
                INSERT OR IGNORE INTO punch_logs (device_sn, employee_code, punch_time, punch_type)
                VALUES (?, ?, ?, ?)
                """,
                (device_sn, employee_code, punch_time_str, punch_type),
            )
            rows_saved += 1

    if rows_saved:
        log.info(f"[{device_sn}] Tersimpan {rows_saved} punch baru.")


# ---------------------------------------------------------------------------
# Batch sender — dijalankan scheduler 4x sehari
# ---------------------------------------------------------------------------
PUNCH_MASUK = 0
PUNCH_PULANG = 1
PUNCH_KELUAR_ISTIRAHAT = 2
PUNCH_MASUK_ISTIRAHAT = 3


def send_batch_for_date(target_date: date):
    """Ambil punch hari target, kelompokkan per karyawan, kirim ke API."""
    if not ADMS_INGEST_TOKEN:
        log.warning("ADMS_INGEST_TOKEN belum diset, batch dilewati.")
        return

    date_str = target_date.isoformat()
    date_prefix = f"{date_str} "

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT device_sn, employee_code, punch_time, punch_type
            FROM punch_logs
            WHERE punch_time >= ? AND punch_time < ?
            ORDER BY punch_time ASC
            """,
            (date_prefix + "00:00:00", date_prefix + "23:59:59"),
        ).fetchall()

    if not rows:
        log.info(f"[{date_str}] Tidak ada data punch, batch dilewati.")
        return

    # Kelompokkan per (device_sn, employee_code)
    groups: dict[tuple[str, str], dict] = {}
    for row in rows:
        key = (row["device_sn"], row["employee_code"])
        if key not in groups:
            groups[key] = {
                "device_sn": row["device_sn"],
                "employee_code": row["employee_code"],
                "check_in": None,
                "check_out": None,
                "break_out": None,
                "break_in": None,
            }
        g = groups[key]
        t = row["punch_time"][11:16]  # HH:MM

        if row["punch_type"] == PUNCH_MASUK and not g["check_in"]:
            g["check_in"] = t
        elif row["punch_type"] == PUNCH_PULANG:
            g["check_out"] = t  # ambil yang terakhir
        elif row["punch_type"] == PUNCH_KELUAR_ISTIRAHAT and not g["break_out"]:
            g["break_out"] = t
        elif row["punch_type"] == PUNCH_MASUK_ISTIRAHAT and not g["break_in"]:
            g["break_in"] = t

    # Susun records per device
    by_device: dict[str, list] = {}
    for (device_sn, emp_code), g in groups.items():
        record: dict = {
            "employeeCode": emp_code,
            "attendanceDate": date_str,
            "attendanceStatus": "HADIR",
        }
        if g["check_in"]:
            record["checkInTime"] = g["check_in"]
        if g["check_out"]:
            record["checkOutTime"] = g["check_out"]
        if g["break_out"]:
            record["breakOutTime"] = g["break_out"]
        if g["break_in"]:
            record["breakInTime"] = g["break_in"]

        by_device.setdefault(device_sn, []).append(record)

    # Kirim per device
    for device_sn, records in by_device.items():
        payload = {"deviceId": device_sn, "records": records}
        try:
            resp = requests.post(
                HRD_API_URL,
                headers={
                    "Authorization": f"Bearer {ADMS_INGEST_TOKEN}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            log.info(
                f"[{device_sn}] {date_str} — "
                f"inserted:{result.get('inserted',0)} "
                f"updated:{result.get('updated',0)} "
                f"skipped:{result.get('skipped',0)}"
            )
            if result.get("errors"):
                for err in result["errors"][:5]:
                    log.warning(f"  skip [{err.get('employeeCode')}]: {err.get('reason')}")
        except Exception as exc:
            log.error(f"[{device_sn}] Gagal kirim batch: {exc}")


def scheduled_sync():
    """Dipanggil scheduler: sync hari ini dan kemarin (untuk catch-up punch malam)."""
    today = datetime.now(WIB).date()
    yesterday = today - timedelta(days=1)
    log.info(f"=== Scheduled sync: {today} ===")
    send_batch_for_date(today)
    # Sync kemarin juga untuk catch-up punch malam yang baru masuk
    send_batch_for_date(yesterday)


# ---------------------------------------------------------------------------
# ZKTeco ADMS Protocol Handler
# ---------------------------------------------------------------------------
app_router = FastAPI(title="ADMS Receiver")


@app_router.get("/iclock/cdata", response_class=PlainTextResponse)
async def device_handshake(
    SN: str = Query(..., description="Serial number mesin"),
    options: str = Query(None),
    pushver: str = Query(None),
):
    """
    Handshake awal dari mesin AT301.
    Server mengirim konfigurasi sync kembali ke mesin.
    TransTimes = jadwal push otomatis dari mesin (WIB).
    """
    log.info(f"[{SN}] Handshake dari mesin.")
    config = (
        f"GET OPTION FROM: {SN}\r\n"
        f"ATTLOGStamp=0\r\n"
        f"OPERLOGStamp=9999\r\n"
        f"ErrorDelay=30\r\n"
        f"Delay=10\r\n"
        f"TransTimes=09:00;14:00;17:00;21:00\r\n"
        f"TransInterval=1\r\n"
        f"TransFlag=TransData AttLog OpLog\r\n"
        f"TimeZone=7\r\n"
        f"Realtime=1\r\n"
        f"Encrypt=None\r\n"
    )
    return PlainTextResponse(config)


@app_router.post("/iclock/cdata", response_class=PlainTextResponse)
async def receive_data(
    request: Request,
    SN: str = Query(...),
    table: str = Query(None),
    Stamp: str = Query(None),
):
    """
    Menerima push attendance log dari mesin AT301.
    Format body: PIN\\tDATE_TIME\\tSTATUS\\tVERIFY\\tWORKCODE\\tRESERVED
    """
    body = await request.body()
    raw = body.decode("utf-8", errors="ignore")

    if table == "ATTLOG":
        store_punches(SN, raw)
    else:
        log.debug(f"[{SN}] Tabel {table} diabaikan.")

    return PlainTextResponse("OK")


@app_router.get("/iclock/getrequest", response_class=PlainTextResponse)
async def get_request(SN: str = Query(...)):
    """Mesin polling untuk command. Tidak ada command, balas OK."""
    return PlainTextResponse("OK")


@app_router.post("/iclock/devicecmd", response_class=PlainTextResponse)
async def device_cmd(SN: str = Query(...)):
    return PlainTextResponse("OK")


@app_router.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(WIB).isoformat()}


# ---------------------------------------------------------------------------
# Lifespan: init DB + scheduler
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info(f"DB siap: {DB_PATH}")

    scheduler = BackgroundScheduler(timezone="Asia/Jakarta")
    # Sync jam 09:00, 14:00, 17:00, 21:00 WIB
    for hour in [9, 14, 17, 21]:
        scheduler.add_job(scheduled_sync, "cron", hour=hour, minute=5)
    scheduler.start()
    log.info("Scheduler aktif: sync jam 09:05, 14:05, 17:05, 21:05 WIB")

    yield

    scheduler.shutdown()


app_router.router.lifespan_context = lifespan


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app_router",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
