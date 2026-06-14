-- Migration 012: Add matching, essay, and diagramming question types

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'question_type' AND e.enumlabel = 'matching'
  ) THEN
    ALTER TYPE question_type ADD VALUE 'matching';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'question_type' AND e.enumlabel = 'essay'
  ) THEN
    ALTER TYPE question_type ADD VALUE 'essay';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'question_type' AND e.enumlabel = 'diagramming'
  ) THEN
    ALTER TYPE question_type ADD VALUE 'diagramming';
  END IF;
END $$;
