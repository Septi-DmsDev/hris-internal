ALTER TABLE "daily_activity_entries"
ADD COLUMN IF NOT EXISTS "job_id_snapshot" varchar(50);

UPDATE "daily_activity_entries" dae
SET "job_id_snapshot" = COALESCE(dae."job_id_snapshot", pce."external_code")
FROM "point_catalog_entries" pce
WHERE dae."point_catalog_entry_id" = pce."id"
  AND dae."job_id_snapshot" IS NULL;
