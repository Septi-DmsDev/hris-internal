DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'monthly_point_performance_input_source'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."monthly_point_performance_input_source" AS ENUM('GENERATED', 'MANUAL_INPUT');
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "monthly_point_performances"
ADD COLUMN IF NOT EXISTS "input_source" "monthly_point_performance_input_source" NOT NULL DEFAULT 'GENERATED';
