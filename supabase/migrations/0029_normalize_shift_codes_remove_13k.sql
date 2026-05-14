DO $$
DECLARE
  rec RECORD;
  new_code text;
  new_name text;
BEGIN
  FOR rec IN SELECT id, code, name FROM work_shift_masters LOOP
    new_code := lower(rec.code);
    new_code := regexp_replace(new_code, 'target\s*13\.?000', '', 'gi');
    new_code := regexp_replace(new_code, 'target\s*13000', '', 'gi');
    new_code := regexp_replace(new_code, '13k', '', 'gi');
    new_code := regexp_replace(new_code, '[^a-z0-9_ ]+', '', 'g');
    new_code := regexp_replace(new_code, '\s+', '_', 'g');
    new_code := regexp_replace(new_code, '_+', '_', 'g');
    new_code := regexp_replace(new_code, '^_+|_+$', '', 'g');

    IF new_code ~ '^shift_?([0-9]+[a-z]?)$' THEN
      new_code := regexp_replace(new_code, '^shift_?([0-9]+[a-z]?)$', 'shift_\1');
    END IF;

    IF new_code IS NULL OR new_code = '' THEN
      new_code := rec.code;
    END IF;

    new_name := regexp_replace(rec.name, 'target\s*13\.?000', '', 'gi');
    new_name := regexp_replace(new_name, 'target\s*13000', '', 'gi');
    new_name := regexp_replace(new_name, '13k', '', 'gi');
    new_name := regexp_replace(new_name, '\s+', ' ', 'g');
    new_name := btrim(new_name);

    IF new_name IS NULL OR new_name = '' THEN
      new_name := rec.name;
    END IF;

    IF EXISTS (
      SELECT 1 FROM work_shift_masters m
      WHERE m.code = new_code AND m.id <> rec.id
    ) THEN
      new_code := rec.code;
    END IF;

    UPDATE work_shift_masters
    SET code = new_code,
        name = new_name,
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id, code, name FROM work_schedules LOOP
    new_code := lower(rec.code);
    new_code := regexp_replace(new_code, 'target\s*13\.?000', '', 'gi');
    new_code := regexp_replace(new_code, 'target\s*13000', '', 'gi');
    new_code := regexp_replace(new_code, '13k', '', 'gi');
    new_code := regexp_replace(new_code, '[^a-z0-9_ ]+', '', 'g');
    new_code := regexp_replace(new_code, '\s+', '_', 'g');
    new_code := regexp_replace(new_code, '_+', '_', 'g');
    new_code := regexp_replace(new_code, '^_+|_+$', '', 'g');

    IF new_code ~ '^shift_?([0-9]+[a-z]?)$' THEN
      new_code := regexp_replace(new_code, '^shift_?([0-9]+[a-z]?)$', 'shift_\1');
    END IF;

    IF new_code IS NULL OR new_code = '' THEN
      new_code := rec.code;
    END IF;

    new_name := regexp_replace(rec.name, 'target\s*13\.?000', '', 'gi');
    new_name := regexp_replace(new_name, 'target\s*13000', '', 'gi');
    new_name := regexp_replace(new_name, '13k', '', 'gi');
    new_name := regexp_replace(new_name, '\s+', ' ', 'g');
    new_name := btrim(new_name);

    IF new_name IS NULL OR new_name = '' THEN
      new_name := rec.name;
    END IF;

    IF EXISTS (
      SELECT 1 FROM work_schedules s
      WHERE s.code = new_code AND s.id <> rec.id
    ) THEN
      new_code := rec.code;
    END IF;

    UPDATE work_schedules
    SET code = new_code,
        name = new_name,
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END $$;
