CREATE TYPE "public"."activity_status" AS ENUM('DRAFT', 'DIAJUKAN', 'DITOLAK_SPV', 'REVISI_TW', 'DIAJUKAN_ULANG', 'DISETUJUI_SPV', 'OVERRIDE_HRD', 'DIKUNCI_PAYROLL');--> statement-breakpoint
CREATE TYPE "public"."monthly_point_performance_status" AS ENUM('DRAFT', 'FINALIZED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."point_approval_action" AS ENUM('SUBMIT', 'APPROVE_SPV', 'REJECT_SPV', 'RESUBMIT', 'OVERRIDE_HRD', 'LOCK_PAYROLL');--> statement-breakpoint
CREATE TYPE "public"."point_catalog_version_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "daily_activity_approval_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_entry_id" uuid NOT NULL,
	"action" "point_approval_action" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_activity_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"actual_division_id" uuid,
	"point_catalog_entry_id" uuid NOT NULL,
	"point_catalog_version_id" uuid NOT NULL,
	"point_catalog_division_name" varchar(100) NOT NULL,
	"work_name_snapshot" text NOT NULL,
	"unit_description_snapshot" text,
	"point_value_snapshot" numeric(12, 2) NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"total_points" numeric(14, 2) NOT NULL,
	"status" "activity_status" DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "division_point_target_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"division_code" varchar(20),
	"division_name" varchar(100) NOT NULL,
	"target_points" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_point_performances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"period_start_date" date NOT NULL,
	"period_end_date" date NOT NULL,
	"division_snapshot_id" uuid,
	"division_snapshot_name" varchar(100) NOT NULL,
	"target_daily_points" integer NOT NULL,
	"target_days" integer NOT NULL,
	"total_target_points" integer NOT NULL,
	"total_approved_points" numeric(14, 2) NOT NULL,
	"performance_percent" numeric(7, 2) NOT NULL,
	"status" "monthly_point_performance_status" DEFAULT 'DRAFT' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_catalog_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"division_code" varchar(20),
	"division_name" varchar(100) NOT NULL,
	"external_row_number" integer,
	"external_code" varchar(50),
	"work_name" text NOT NULL,
	"point_value" numeric(12, 2) NOT NULL,
	"unit_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_catalog_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"source_file_name" varchar(255),
	"notes" text,
	"status" "point_catalog_version_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_start_date" date NOT NULL,
	"effective_end_date" date,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_catalog_versions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "daily_activity_approval_logs" ADD CONSTRAINT "daily_activity_approval_logs_activity_entry_id_daily_activity_entries_id_fk" FOREIGN KEY ("activity_entry_id") REFERENCES "public"."daily_activity_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity_entries" ADD CONSTRAINT "daily_activity_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity_entries" ADD CONSTRAINT "daily_activity_entries_actual_division_id_divisions_id_fk" FOREIGN KEY ("actual_division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity_entries" ADD CONSTRAINT "daily_activity_entries_point_catalog_entry_id_point_catalog_entries_id_fk" FOREIGN KEY ("point_catalog_entry_id") REFERENCES "public"."point_catalog_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity_entries" ADD CONSTRAINT "daily_activity_entries_point_catalog_version_id_point_catalog_versions_id_fk" FOREIGN KEY ("point_catalog_version_id") REFERENCES "public"."point_catalog_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "division_point_target_rules" ADD CONSTRAINT "division_point_target_rules_version_id_point_catalog_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."point_catalog_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_point_performances" ADD CONSTRAINT "monthly_point_performances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_point_performances" ADD CONSTRAINT "monthly_point_performances_division_snapshot_id_divisions_id_fk" FOREIGN KEY ("division_snapshot_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_catalog_entries" ADD CONSTRAINT "point_catalog_entries_version_id_point_catalog_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."point_catalog_versions"("id") ON DELETE cascade ON UPDATE no action;