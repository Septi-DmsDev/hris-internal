DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'employee_group_payroll_mode'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "employee_group_payroll_mode" AS ENUM ('KPI', 'POINT');
  END IF;
END
$$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_group_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_group" "employee_group" NOT NULL,
  "display_name" varchar(100) NOT NULL,
  "legacy_alias" varchar(50),
  "payroll_mode" "employee_group_payroll_mode" NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "employee_group_configs_employee_group_unique" UNIQUE("employee_group")
);
--> statement-breakpoint

INSERT INTO "employee_group_configs" (
  "employee_group",
  "display_name",
  "legacy_alias",
  "payroll_mode",
  "description",
  "sort_order",
  "is_active"
)
VALUES
  ('KARYAWAN_TETAP', 'Karyawan Tetap', 'MANAGERIAL', 'KPI', 'Kelompok KPI/bulanan untuk karyawan tetap.', 10, true),
  ('MITRA_KERJA', 'Mitra Kerja', 'TEAMWORK', 'POINT', 'Kelompok poin harian reguler.', 20, true),
  ('BORONGAN', 'Borongan', NULL, 'POINT', 'Kelompok poin harian borongan.', 30, true),
  ('TRAINING', 'Training', NULL, 'POINT', 'Kelompok training sebelum lulus reguler.', 40, true),
  ('MANAGERIAL', 'Managerial (Legacy)', NULL, 'KPI', 'Legacy group, dipertahankan untuk kompatibilitas data lama.', 90, true),
  ('TEAMWORK', 'Teamwork (Legacy)', NULL, 'POINT', 'Legacy group, dipertahankan untuk kompatibilitas data lama.', 91, true)
ON CONFLICT ("employee_group") DO NOTHING;
