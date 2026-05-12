-- Migration: 0026_shift_checkclock_windows
-- Menambahkan variabel waktu spesifik untuk logika checkclock:
--   work_schedule_days: checkOutStart (jam paling awal tap pulang valid)
--                       checkOutToleranceMinutes (toleransi khusus pulang)
--   work_shift_masters: breakStart, breakEnd (jam istirahat template)
--                       checkInToleranceMinutes, breakToleranceMinutes, checkOutToleranceMinutes
--
-- Cara apply: Supabase Studio → SQL Editor

ALTER TABLE work_schedule_days
  ADD COLUMN IF NOT EXISTS check_out_start          VARCHAR(5),
  ADD COLUMN IF NOT EXISTS check_out_tolerance_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE work_shift_masters
  ADD COLUMN IF NOT EXISTS break_start                  VARCHAR(5),
  ADD COLUMN IF NOT EXISTS break_end                    VARCHAR(5),
  ADD COLUMN IF NOT EXISTS check_out_start              VARCHAR(5),
  ADD COLUMN IF NOT EXISTS check_in_tolerance_minutes   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_tolerance_minutes      INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS check_out_tolerance_minutes  INTEGER NOT NULL DEFAULT 0;
