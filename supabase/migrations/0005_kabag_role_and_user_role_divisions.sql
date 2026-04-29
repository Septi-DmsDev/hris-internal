CREATE TABLE "user_role_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_role_id" uuid NOT NULL,
	"division_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_role_divisions_user_role_id_division_id_unique" UNIQUE("user_role_id","division_id")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DEFAULT 'TEAMWORK'::text;--> statement-breakpoint
ALTER TABLE "incident_logs" ALTER COLUMN "recorded_by_role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "daily_activity_approval_logs" ALTER COLUMN "actor_role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ALTER COLUMN "applied_by_role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payroll_audit_logs" ALTER COLUMN "actor_role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'HRD', 'KABAG', 'SPV', 'MANAGERIAL', 'FINANCE', 'TEAMWORK', 'PAYROLL_VIEWER');--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DEFAULT 'TEAMWORK'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "incident_logs" ALTER COLUMN "recorded_by_role" SET DATA TYPE "public"."user_role" USING "recorded_by_role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "daily_activity_approval_logs" ALTER COLUMN "actor_role" SET DATA TYPE "public"."user_role" USING "actor_role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ALTER COLUMN "applied_by_role" SET DATA TYPE "public"."user_role" USING "applied_by_role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "payroll_audit_logs" ALTER COLUMN "actor_role" SET DATA TYPE "public"."user_role" USING "actor_role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "employee_id" uuid;--> statement-breakpoint
ALTER TABLE "user_role_divisions" ADD CONSTRAINT "user_role_divisions_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_divisions" ADD CONSTRAINT "user_role_divisions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;