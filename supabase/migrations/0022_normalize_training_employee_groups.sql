UPDATE "employees"
SET
  "employee_group" = 'TRAINING',
  "updated_at" = now()
WHERE "training_graduation_date" IS NULL
  AND "employee_group" IN ('MANAGERIAL', 'TEAMWORK', 'MITRA_KERJA', 'BORONGAN', 'TRAINING');
