DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'employee_group' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."employee_group" AS ENUM(
      'MANAGERIAL',
      'TEAMWORK',
      'KARYAWAN_TETAP',
      'MITRA_KERJA',
      'BORONGAN',
      'TRAINING'
    );
  ELSE
    BEGIN
      ALTER TYPE "public"."employee_group" ADD VALUE IF NOT EXISTS 'KARYAWAN_TETAP';
      ALTER TYPE "public"."employee_group" ADD VALUE IF NOT EXISTS 'MITRA_KERJA';
      ALTER TYPE "public"."employee_group" ADD VALUE IF NOT EXISTS 'BORONGAN';
      ALTER TYPE "public"."employee_group" ADD VALUE IF NOT EXISTS 'TRAINING';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
