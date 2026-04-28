CREATE TYPE "public"."managerial_kpi_status" AS ENUM('DRAFT', 'VALIDATED', 'LOCKED');--> statement-breakpoint
CREATE TABLE "managerial_kpi_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"performance_percent" numeric(7, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"status" "managerial_kpi_status" DEFAULT 'DRAFT' NOT NULL,
	"validated_by_user_id" uuid,
	"validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payroll_results" ADD COLUMN "managerial_kpi_summary_id" uuid;--> statement-breakpoint
ALTER TABLE "managerial_kpi_summaries" ADD CONSTRAINT "managerial_kpi_summaries_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managerial_kpi_summaries" ADD CONSTRAINT "managerial_kpi_summaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "managerial_kpi_period_employee_uidx" ON "managerial_kpi_summaries" USING btree ("period_id","employee_id");--> statement-breakpoint
ALTER TABLE "payroll_results" ADD CONSTRAINT "payroll_results_managerial_kpi_summary_id_managerial_kpi_summaries_id_fk" FOREIGN KEY ("managerial_kpi_summary_id") REFERENCES "public"."managerial_kpi_summaries"("id") ON DELETE set null ON UPDATE no action;