ALTER TABLE "employees"
ADD COLUMN IF NOT EXISTS "nik" varchar(50);
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'employees_nik_unique'
  ) THEN
    CREATE UNIQUE INDEX "employees_nik_unique"
      ON "employees" ("nik")
      WHERE "nik" IS NOT NULL;
  END IF;
END $$;
