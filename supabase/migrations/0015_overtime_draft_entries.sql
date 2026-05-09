CREATE TABLE IF NOT EXISTS "overtime_draft_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "overtime_request_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "work_date" date NOT NULL,
  "job_id" varchar(100) NOT NULL,
  "work_name" varchar(200) NOT NULL,
  "quantity" numeric(10, 2) NOT NULL,
  "point_value" numeric(12, 2) NOT NULL,
  "total_points" numeric(12, 2) NOT NULL,
  "notes" text,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "overtime_draft_entries"
    ADD CONSTRAINT "overtime_draft_entries_overtime_request_id_fk"
    FOREIGN KEY ("overtime_request_id") REFERENCES "public"."overtime_requests"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "overtime_draft_entries"
    ADD CONSTRAINT "overtime_draft_entries_employee_id_fk"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_overtime_draft_request"
  ON "overtime_draft_entries" USING btree ("overtime_request_id");
CREATE INDEX IF NOT EXISTS "idx_overtime_draft_employee_date"
  ON "overtime_draft_entries" USING btree ("employee_id", "work_date");
