-- Migration: 0027_drop_adms_external_columns
-- Hapus kolom external_device_id dan external_user_code dari employee_attendance_records.
--
-- Kolom ini digunakan oleh endpoint lama /api/integrations/adms/attendance
-- (BioFinger-Service mengirim data yang sudah diklasifikasikan per-record).
--
-- Pendekatan baru (/api/integrations/adms/taps):
-- - BioFinger-Service kirim raw taps (waktu mentah saja)
-- - HRD Dashboard yang mengklasifikasikan berdasarkan jadwal
-- - deviceId disimpan di dalam rawPayload JSONB (per tap), bukan per-record
--
-- Cara apply: Supabase Studio → SQL Editor

ALTER TABLE employee_attendance_records
  DROP COLUMN IF EXISTS external_device_id,
  DROP COLUMN IF EXISTS external_user_code;
