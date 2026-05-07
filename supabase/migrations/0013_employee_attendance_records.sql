DO $$ BEGIN
  CREATE TYPE "attendance_status" AS ENUM ('HADIR', 'ALPA', 'IZIN', 'SAKIT', 'CUTI', 'OFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "attendance_punctuality_status" AS ENUM ('TEPAT_WAKTU', 'TELAT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "attendance_source" AS ENUM ('MANUAL', 'FINGERPRINT_ADMS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_attendance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "attendance_date" date NOT NULL,
  "attendance_status" "attendance_status" NOT NULL,
  "check_in_time" time,
  "check_out_time" time,
  "punctuality_status" "attendance_punctuality_status",
  "source" "attendance_source" DEFAULT 'MANUAL' NOT NULL,
  "external_device_id" varchar(120),
  "external_user_code" varchar(120),
  "raw_payload" jsonb,
  "synced_at" timestamp with time zone,
  "recorded_by_user_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "employee_attendance_records"
    ADD CONSTRAINT "employee_attendance_records_employee_id_employees_id_fk"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "employee_attendance_employee_date_uidx"
  ON "employee_attendance_records" ("employee_id", "attendance_date");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_employee_attendance_records_date"
  ON "employee_attendance_records" ("attendance_date");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_employee_attendance_records_source"
  ON "employee_attendance_records" ("source");
