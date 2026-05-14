ALTER TABLE "employee_group_configs"
ADD COLUMN IF NOT EXISTS "base_salary_amount" numeric(12, 2);

UPDATE "employee_group_configs"
SET "base_salary_amount" = CASE "employee_group"
  WHEN 'TRAINING' THEN 1000000
  ELSE 1200000
END
WHERE "base_salary_amount" IS NULL;
