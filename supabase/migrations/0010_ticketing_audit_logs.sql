CREATE TYPE "public"."attendance_ticket_audit_action" AS ENUM('APPROVE_SPV', 'APPROVE_HRD', 'REJECT_SPV', 'REJECT_HRD');
--> statement-breakpoint
CREATE TABLE "attendance_ticket_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"action" "attendance_ticket_audit_action" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"notes" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_ticket_audit_logs" ADD CONSTRAINT "attendance_ticket_audit_logs_ticket_id_attendance_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."attendance_tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_ticket_audit_logs" ADD CONSTRAINT "attendance_ticket_audit_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
