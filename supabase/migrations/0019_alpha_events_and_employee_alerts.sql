DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'alpha_action_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."alpha_action_status" AS ENUM('PENDING', 'CALL_SENT', 'SP1_ISSUED');
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'employee_alert_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."employee_alert_type" AS ENUM('ALPHA_CALL', 'ALPHA_SP1');
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "attendance_alpha_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "alpha_date" date NOT NULL,
  "alpha_count" integer DEFAULT 1 NOT NULL,
  "status" "alpha_action_status" DEFAULT 'PENDING' NOT NULL,
  "call_sent_at" timestamp with time zone,
  "call_sent_by_user_id" uuid,
  "sp1_issued_at" timestamp with time zone,
  "sp1_issued_by_user_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_alpha_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_alpha_events_employee_date_uidx" ON "attendance_alpha_events" USING btree ("employee_id","alpha_date");
CREATE INDEX IF NOT EXISTS "idx_attendance_alpha_events_date" ON "attendance_alpha_events" USING btree ("alpha_date");
CREATE INDEX IF NOT EXISTS "idx_attendance_alpha_events_status" ON "attendance_alpha_events" USING btree ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "alert_type" "employee_alert_type" NOT NULL,
  "title" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "ref_date" date,
  "source_ref_id" uuid,
  "sent_by_user_id" uuid,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "employee_alerts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_employee_alerts_employee_created" ON "employee_alerts" USING btree ("employee_id","created_at");
