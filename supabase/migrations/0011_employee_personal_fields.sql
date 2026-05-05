ALTER TABLE "employees"
ADD COLUMN IF NOT EXISTS "birth_place" varchar(100),
ADD COLUMN IF NOT EXISTS "birth_date" date,
ADD COLUMN IF NOT EXISTS "gender" varchar(20),
ADD COLUMN IF NOT EXISTS "religion" varchar(50),
ADD COLUMN IF NOT EXISTS "marital_status" varchar(50);
