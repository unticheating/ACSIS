-- Ensure every exam belongs to a class (classes.access_code = student enroll;
-- exams.password = optional faculty-set lobby password).
-- Safe to run multiple times.

\echo '=== 005: exams.class_id cleanup ==='

-- Drop legacy assignment link if present (replaced by class_id)
ALTER TABLE exams DROP COLUMN IF EXISTS assignment_id;

-- Legacy dumps used access_code on exams; canonical uses password only
DO $migrate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'access_code'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'password'
  ) THEN
    UPDATE exams
    SET password = COALESCE(NULLIF(TRIM(password), ''), NULLIF(TRIM(access_code), ''))
    WHERE password IS NULL OR TRIM(password) = '';
  END IF;
END
$migrate$;

ALTER TABLE exams DROP COLUMN IF EXISTS access_code;

-- Add class_id if an old DB is missing it (should not happen on acsis.sql)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS class_id INT REFERENCES classes (class_id) ON DELETE CASCADE;

-- Remove exams that cannot be linked (review orphans before DELETE in production)
DELETE FROM exams WHERE class_id IS NULL;

ALTER TABLE exams ALTER COLUMN class_id SET NOT NULL;

\echo 'Done. Students enroll via classes.access_code; exams.password is optional.'
