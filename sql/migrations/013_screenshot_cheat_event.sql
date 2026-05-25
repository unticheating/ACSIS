-- Add screenshot_attempt to cheat_event enum (idempotent on PostgreSQL 9.1+ via IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'cheat_event' AND e.enumlabel = 'screenshot_attempt'
  ) THEN
    ALTER TYPE cheat_event ADD VALUE 'screenshot_attempt';
  END IF;
END
$$;
