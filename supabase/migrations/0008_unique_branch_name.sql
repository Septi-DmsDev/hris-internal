CREATE UNIQUE INDEX IF NOT EXISTS "branches_name_ci_uidx" ON "branches" (lower("name"));
