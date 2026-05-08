DO $$ BEGIN
  CREATE TYPE "public"."overtime_type" AS ENUM(
    'OVERTIME_1H',
    'OVERTIME_2H',
    'OVERTIME_3H',
    'LEMBUR_FULLDAY',
    'PATCH_ABSENCE_3H'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."overtime_request_status" AS ENUM(
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "overtime_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "request_date" date NOT NULL,
  "overtime_type" "overtime_type" NOT NULL,
  "overtime_hours" integer NOT NULL,
  "break_hours" integer DEFAULT 0 NOT NULL,
  "base_amount" numeric(12, 2) NOT NULL,
  "meal_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  "total_amount" numeric(12, 2) NOT NULL,
  "period_code" varchar(7) NOT NULL,
  "period_start_date" date NOT NULL,
  "period_end_date" date NOT NULL,
  "reason" text NOT NULL,
  "status" "overtime_request_status" DEFAULT 'PENDING' NOT NULL,
  "review_notes" text,
  "requested_by_user_id" uuid NOT NULL,
  "approved_by_user_id" uuid,
  "approved_at" timestamp with time zone,
  "rejected_by_user_id" uuid,
  "rejected_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "overtime_requests"
    ADD CONSTRAINT "overtime_requests_employee_id_employees_id_fk"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_overtime_requests_employee_date"
  ON "overtime_requests" USING btree ("employee_id","request_date");
CREATE INDEX IF NOT EXISTS "idx_overtime_requests_status"
  ON "overtime_requests" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_overtime_requests_period_code"
  ON "overtime_requests" USING btree ("period_code");
