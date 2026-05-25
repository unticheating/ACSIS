-- Migration 011: Add coding question type for scripting / manual coding items

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'question_type' AND e.enumlabel = 'coding'
  ) THEN
    ALTER TYPE question_type ADD VALUE 'coding';
  END IF;
END $$;
