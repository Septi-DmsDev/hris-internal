ALTER TABLE "work_schedule_days"
  ADD COLUMN "break_start" varchar(5);
--> statement-breakpoint
ALTER TABLE "work_schedule_days"
  ADD COLUMN "break_end" varchar(5);
--> statement-breakpoint
ALTER TABLE "work_schedule_days"
  ADD COLUMN "break_tolerance_minutes" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "work_schedule_days"
  ADD COLUMN "check_in_tolerance_minutes" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "work_schedule_days"
SET
  "break_start" = CASE WHEN "is_working_day" THEN '12:00' ELSE NULL END,
  "break_end" = CASE WHEN "is_working_day" THEN '13:00' ELSE NULL END,
  "break_tolerance_minutes" = CASE WHEN "is_working_day" THEN 5 ELSE 0 END,
  "check_in_tolerance_minutes" = 0;
