DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'cheat_event' AND e.enumlabel = 'win_key'
  ) THEN
    ALTER TYPE cheat_event ADD VALUE 'win_key';
  END IF;
END
$$;
