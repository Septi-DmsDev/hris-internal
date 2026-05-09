ALTER TABLE "branches"
ADD COLUMN IF NOT EXISTS "latitude" numeric(10,7),
ADD COLUMN IF NOT EXISTS "longitude" numeric(10,7),
ADD COLUMN IF NOT EXISTS "max_attendance_radius_meters" integer NOT NULL DEFAULT 150;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'attendance_fallback_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."attendance_fallback_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "attendance_fallback_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "attendance_date" date NOT NULL,
  "photo_url" text NOT NULL,
  "latitude" numeric(10,7) NOT NULL,
  "longitude" numeric(10,7) NOT NULL,
  "branch_latitude_snapshot" numeric(10,7),
  "branch_longitude_snapshot" numeric(10,7),
  "radius_meters_snapshot" integer,
  "distance_meters" integer,
  "geofence_matched" boolean DEFAULT false NOT NULL,
  "fingerprint_failure_reason" text NOT NULL,
  "developer_mode_disabled_confirmed" boolean DEFAULT false NOT NULL,
  "status" "attendance_fallback_status" DEFAULT 'PENDING' NOT NULL,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamp with time zone,
  "review_notes" text,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_fallback_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_attendance_fallback_requests_date" ON "attendance_fallback_requests" USING btree ("attendance_date");
CREATE INDEX IF NOT EXISTS "idx_attendance_fallback_requests_status" ON "attendance_fallback_requests" USING btree ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_fallback_employee_date_uidx" ON "attendance_fallback_requests" USING btree ("employee_id","attendance_date");
