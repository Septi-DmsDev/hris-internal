CREATE TABLE IF NOT EXISTS "recurring_payroll_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "adjustment_type" "payroll_adjustment_type" NOT NULL,
  "category" varchar(50) NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "reason" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "applied_by_user_id" uuid NOT NULL,
  "applied_by_role" "user_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "recurring_payroll_adjustments"
  ADD CONSTRAINT "recurring_payroll_adjustments_employee_id_employees_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "recurring_payroll_adjustments_active_employee_category_uidx"
  ON "recurring_payroll_adjustments" ("employee_id", "category")
  WHERE "is_active" = true;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_recurring_payroll_adjustments_employee"
  ON "recurring_payroll_adjustments" ("employee_id");--> statement-breakpoint

INSERT INTO "recurring_payroll_adjustments" (
  "employee_id",
  "adjustment_type",
  "category",
  "amount",
  "reason",
  "is_active",
  "applied_by_user_id",
  "applied_by_role",
  "created_at",
  "updated_at"
)
SELECT
  latest."employee_id",
  latest."adjustment_type",
  latest."category",
  latest."amount",
  latest."reason",
  true,
  latest."applied_by_user_id",
  latest."applied_by_role",
  latest."created_at",
  now()
FROM (
  SELECT DISTINCT ON (pa."employee_id", split_part(pa."reason", '::', 1))
    pa."employee_id",
    pa."adjustment_type",
    split_part(pa."reason", '::', 1) AS "category",
    pa."amount",
    pa."reason",
    pa."applied_by_user_id",
    pa."applied_by_role",
    pa."created_at"
  FROM "payroll_adjustments" pa
  INNER JOIN "employees" e ON e."id" = pa."employee_id"
  WHERE e."is_active" = true
    AND split_part(pa."reason", '::', 1) IN ('BPJS', 'TRANSPORT')
  ORDER BY pa."employee_id", split_part(pa."reason", '::', 1), pa."created_at" DESC
) latest
ON CONFLICT DO NOTHING;
