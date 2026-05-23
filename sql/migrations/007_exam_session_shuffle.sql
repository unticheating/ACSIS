-- Per-student question/choice order for shuffle settings
ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS question_order JSONB DEFAULT NULL;

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS choice_orders JSONB DEFAULT NULL;
