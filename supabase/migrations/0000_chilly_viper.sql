CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'HRD', 'FINANCE', 'SPV', 'TEAMWORK', 'MANAGERIAL', 'PAYROLL_VIEWER');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('TRAINING', 'REGULER', 'DIALIHKAN_TRAINING', 'TIDAK_LOLOS', 'NONAKTIF', 'RESIGN');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('TRAINING', 'REGULER', 'FINAL_PAYROLL', 'NONAKTIF');--> statement-breakpoint
CREATE TYPE "public"."work_day_status" AS ENUM('KERJA', 'OFF', 'CUTI', 'SAKIT', 'IZIN', 'ALPA', 'SETENGAH_HARI');--> statement-breakpoint
CREATE TYPE "public"."employee_group" AS ENUM('MANAGERIAL', 'TEAMWORK');--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'TEAMWORK' NOT NULL,
	"division_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "employee_division_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"previous_division_id" uuid,
	"new_division_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_grade_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"previous_grade_id" uuid,
	"new_grade_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_position_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"previous_position_id" uuid,
	"new_position_id" uuid NOT NULL,
	"effective_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_schedule_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"effective_start_date" date NOT NULL,
	"effective_end_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_status_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"previous_employment_status" "employment_status",
	"new_employment_status" "employment_status" NOT NULL,
	"previous_payroll_status" "payroll_status",
	"new_payroll_status" "payroll_status" NOT NULL,
	"effective_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_supervisor_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"previous_supervisor_employee_id" uuid,
	"new_supervisor_employee_id" uuid,
	"effective_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" varchar(30) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"nickname" varchar(100),
	"photo_url" text,
	"phone_number" varchar(30),
	"address" text,
	"start_date" date NOT NULL,
	"branch_id" uuid NOT NULL,
	"division_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"jobdesk" varchar(100),
	"grade_id" uuid NOT NULL,
	"employee_group" "employee_group" NOT NULL,
	"employment_status" "employment_status" DEFAULT 'TRAINING' NOT NULL,
	"payroll_status" "payroll_status" DEFAULT 'TRAINING' NOT NULL,
	"supervisor_employee_id" uuid,
	"training_graduation_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "work_schedule_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"day_status" "work_day_status" DEFAULT 'KERJA' NOT NULL,
	"is_working_day" boolean DEFAULT true NOT NULL,
	"start_time" varchar(5),
	"end_time" varchar(5),
	"target_points" integer DEFAULT 12000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_schedules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"branch_id" uuid,
	"training_pass_percent" integer DEFAULT 80 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divisions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grades_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"employee_group" "employee_group" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_division_histories" ADD CONSTRAINT "employee_division_histories_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_division_histories" ADD CONSTRAINT "employee_division_histories_previous_division_id_divisions_id_fk" FOREIGN KEY ("previous_division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_division_histories" ADD CONSTRAINT "employee_division_histories_new_division_id_divisions_id_fk" FOREIGN KEY ("new_division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_grade_histories" ADD CONSTRAINT "employee_grade_histories_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_grade_histories" ADD CONSTRAINT "employee_grade_histories_previous_grade_id_grades_id_fk" FOREIGN KEY ("previous_grade_id") REFERENCES "public"."grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_grade_histories" ADD CONSTRAINT "employee_grade_histories_new_grade_id_grades_id_fk" FOREIGN KEY ("new_grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_position_histories" ADD CONSTRAINT "employee_position_histories_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_position_histories" ADD CONSTRAINT "employee_position_histories_previous_position_id_positions_id_fk" FOREIGN KEY ("previous_position_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_position_histories" ADD CONSTRAINT "employee_position_histories_new_position_id_positions_id_fk" FOREIGN KEY ("new_position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_schedule_assignments" ADD CONSTRAINT "employee_schedule_assignments_schedule_id_work_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_histories" ADD CONSTRAINT "employee_status_histories_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_supervisor_histories" ADD CONSTRAINT "employee_supervisor_histories_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_supervisor_histories" ADD CONSTRAINT "employee_supervisor_histories_previous_supervisor_employee_id_employees_id_fk" FOREIGN KEY ("previous_supervisor_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_supervisor_histories" ADD CONSTRAINT "employee_supervisor_histories_new_supervisor_employee_id_employees_id_fk" FOREIGN KEY ("new_supervisor_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisor_employee_id_employees_id_fk" FOREIGN KEY ("supervisor_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedule_days" ADD CONSTRAINT "work_schedule_days_schedule_id_work_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;