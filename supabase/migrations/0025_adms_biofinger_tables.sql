-- Migration: 0025_adms_biofinger_tables
-- Tabel pendukung integrasi mesin fingerprint ZKTeco AT301
-- via BioFinger-Service (ADMS protocol receiver).
--
-- Tabel ini TIDAK dikelola oleh Drizzle ORM — diakses langsung oleh
-- BioFinger-Service (Python/psycopg2) menggunakan DATABASE_URL yang sama.
--
-- Cara apply: Supabase Studio → SQL Editor

-- Daftar mesin fingerprint yang pernah terhubung ke server
CREATE TABLE IF NOT EXISTS adms_devices (
    sn        TEXT PRIMARY KEY,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log tap karyawan dari semua mesin (raw data dari AT301)
-- Diolah oleh scheduler BioFinger-Service lalu dikirim ke HRD Dashboard API
CREATE TABLE IF NOT EXISTS adms_punch_logs (
    id            BIGSERIAL PRIMARY KEY,
    device_sn     TEXT      NOT NULL,
    employee_code TEXT      NOT NULL,
    punch_time    TIMESTAMP NOT NULL,
    punch_type    INTEGER   NOT NULL,  -- 0=masuk 1=pulang 2=keluar_istirahat 3=masuk_istirahat
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (device_sn, employee_code, punch_time)
);

-- Antrian command dari server ke mesin (per-device)
-- Digunakan untuk inject DATA USER (karyawan baru/baru ditambah ke mesin)
-- Mesin polling GET /iclock/getrequest setiap ~30 detik untuk mengambil command ini
CREATE TABLE IF NOT EXISTS adms_command_queue (
    id            BIGSERIAL PRIMARY KEY,
    target_device TEXT    NOT NULL,
    command_text  TEXT    NOT NULL,
    sent_at       TIMESTAMPTZ,   -- NULL = belum dikirim ke mesin
    acked_at      TIMESTAMPTZ,   -- NULL = belum dikonfirmasi mesin
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adms_punch_time
    ON adms_punch_logs (employee_code, punch_time);

CREATE INDEX IF NOT EXISTS idx_adms_cmd_pending
    ON adms_command_queue (target_device, sent_at);
