CREATE TYPE "public"."incident_impact" AS ENUM('REVIEW_ONLY', 'PAYROLL_POTENTIAL', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('KOMPLAIN', 'MISS_PROSES', 'TELAT', 'AREA_KOTOR', 'PELANGGARAN', 'SP1', 'SP2', 'PENGHARGAAN');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('DRAFT', 'SUBMITTED', 'VALIDATED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."ticket_payroll_impact" AS ENUM('UNPAID', 'PAID_QUOTA_MONTHLY', 'PAID_QUOTA_ANNUAL');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('DRAFT', 'SUBMITTED', 'AUTO_APPROVED', 'AUTO_REJECTED', 'NEED_REVIEW', 'APPROVED_SPV', 'APPROVED_HRD', 'REJECTED', 'CANCELLED', 'LOCKED');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('CUTI', 'SAKIT', 'IZIN', 'EMERGENCY', 'SETENGAH_HARI');--> statement-breakpoint
CREATE TYPE "public"."payroll_adjustment_type" AS ENUM('ADDITION', 'DEDUCTION');--> statement-breakpoint
CREATE TYPE "public"."payroll_audit_action" AS ENUM('CREATE_PERIOD', 'GENERATE_PREVIEW', 'FINALIZE', 'MARK_PAID', 'LOCK', 'ADD_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."payroll_period_status" AS ENUM('OPEN', 'DATA_REVIEW', 'DRAFT', 'FINALIZED', 'PAID', 'LOCKED');--> statement-breakpoint
CREATE TABLE "attendance_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"ticket_type" "ticket_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days_count" integer DEFAULT 1 NOT NULL,
	"reason" text NOT NULL,
	"attachment_url" text,
	"status" "ticket_status" DEFAULT 'DRAFT' NOT NULL,
	"payroll_impact" "ticket_payroll_impact",
	"review_notes" text,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"rejected_by_user_id" uuid,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"reviewer_employee_id" uuid,
	"period_start_date" date NOT NULL,
	"period_end_date" date NOT NULL,
	"sop_quality_score" integer,
	"instruction_score" integer,
	"attendance_discipline_score" integer,
	"initiative_teamwork_score" integer,
	"process_miss_score" integer,
	"total_score" numeric(5, 2),
	"category" varchar(30),
	"status" "review_status" DEFAULT 'DRAFT' NOT NULL,
	"review_notes" text,
	"validated_by_user_id" uuid,
	"validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"division_id" uuid,
	"incident_type" "incident_type" NOT NULL,
	"incident_date" date NOT NULL,
	"description" text NOT NULL,
	"impact" "incident_impact" DEFAULT 'REVIEW_ONLY' NOT NULL,
	"payroll_deduction" numeric(12, 2),
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_by_role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"monthly_quota_total" integer DEFAULT 12 NOT NULL,
	"monthly_quota_used" integer DEFAULT 0 NOT NULL,
	"annual_quota_total" integer DEFAULT 3 NOT NULL,
	"annual_quota_used" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_salary_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"base_salary_amount" numeric(12, 2),
	"grade_allowance_amount" numeric(12, 2),
	"tenure_allowance_amount" numeric(12, 2),
	"daily_allowance_amount" numeric(12, 2),
	"performance_bonus_base_amount" numeric(12, 2),
	"achievement_bonus_140_amount" numeric(12, 2),
	"achievement_bonus_165_amount" numeric(12, 2),
	"fulltime_bonus_amount" numeric(12, 2),
	"discipline_bonus_amount" numeric(12, 2),
	"team_bonus_amount" numeric(12, 2),
	"overtime_rate_amount" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_salary_configs_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"adjustment_type" "payroll_adjustment_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"applied_by_user_id" uuid NOT NULL,
	"applied_by_role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid,
	"action" "payroll_audit_action" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"notes" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_employee_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employee_code_snapshot" varchar(50) NOT NULL,
	"employee_name_snapshot" varchar(150) NOT NULL,
	"branch_snapshot_id" uuid,
	"branch_snapshot_name" varchar(100),
	"division_snapshot_id" uuid,
	"division_snapshot_name" varchar(100) NOT NULL,
	"position_snapshot_id" uuid,
	"position_snapshot_name" varchar(100) NOT NULL,
	"grade_snapshot_id" uuid,
	"grade_snapshot_name" varchar(50),
	"employee_group_snapshot" "employee_group" NOT NULL,
	"employment_status_snapshot" "employment_status" NOT NULL,
	"payroll_status_snapshot" "payroll_status" NOT NULL,
	"base_salary_amount" numeric(12, 2) NOT NULL,
	"grade_allowance_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tenure_allowance_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"daily_allowance_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"performance_bonus_base_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"achievement_bonus_140_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"achievement_bonus_165_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fulltime_bonus_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discipline_bonus_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"team_bonus_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"overtime_rate_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"scheduled_work_days" integer DEFAULT 0 NOT NULL,
	"active_employment_days" integer DEFAULT 0 NOT NULL,
	"snapshot_taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_code" varchar(7) NOT NULL,
	"period_start_date" date NOT NULL,
	"period_end_date" date NOT NULL,
	"status" "payroll_period_status" DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"preview_generated_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_periods_period_code_unique" UNIQUE("period_code")
);
--> statement-breakpoint
CREATE TABLE "payroll_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"monthly_performance_id" uuid,
	"performance_percent" numeric(7, 2) DEFAULT '0' NOT NULL,
	"total_approved_points" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_target_points" numeric(14, 2) DEFAULT '0' NOT NULL,
	"approved_unpaid_leave_days" integer DEFAULT 0 NOT NULL,
	"approved_paid_leave_days" integer DEFAULT 0 NOT NULL,
	"incident_deduction_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sp_penalty_multiplier" numeric(5, 2) DEFAULT '1' NOT NULL,
	"manual_adjustment_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"base_salary_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grade_allowance_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tenure_allowance_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"daily_allowance_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_fulltime_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_discipline_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_kinerja_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_prestasi_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_team_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_addition_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deduction_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"take_home_pay" numeric(12, 2) DEFAULT '0' NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "payroll_period_status" DEFAULT 'DRAFT' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_tickets" ADD CONSTRAINT "attendance_tickets_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_reviews" ADD CONSTRAINT "employee_reviews_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_reviews" ADD CONSTRAINT "employee_reviews_reviewer_employee_id_employees_id_fk" FOREIGN KEY ("reviewer_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_logs" ADD CONSTRAINT "incident_logs_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_quotas" ADD CONSTRAINT "leave_quotas_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary_configs" ADD CONSTRAINT "employee_salary_configs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_audit_logs" ADD CONSTRAINT "payroll_audit_logs_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_audit_logs" ADD CONSTRAINT "payroll_audit_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_snapshots" ADD CONSTRAINT "payroll_employee_snapshots_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_snapshots" ADD CONSTRAINT "payroll_employee_snapshots_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_snapshots" ADD CONSTRAINT "payroll_employee_snapshots_branch_snapshot_id_branches_id_fk" FOREIGN KEY ("branch_snapshot_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_snapshots" ADD CONSTRAINT "payroll_employee_snapshots_division_snapshot_id_divisions_id_fk" FOREIGN KEY ("division_snapshot_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_snapshots" ADD CONSTRAINT "payroll_employee_snapshots_position_snapshot_id_positions_id_fk" FOREIGN KEY ("position_snapshot_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_snapshots" ADD CONSTRAINT "payroll_employee_snapshots_grade_snapshot_id_grades_id_fk" FOREIGN KEY ("grade_snapshot_id") REFERENCES "public"."grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_results" ADD CONSTRAINT "payroll_results_period_id_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_results" ADD CONSTRAINT "payroll_results_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_results" ADD CONSTRAINT "payroll_results_snapshot_id_payroll_employee_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."payroll_employee_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_results" ADD CONSTRAINT "payroll_results_monthly_performance_id_monthly_point_performances_id_fk" FOREIGN KEY ("monthly_performance_id") REFERENCES "public"."monthly_point_performances"("id") ON DELETE set null ON UPDATE no action;