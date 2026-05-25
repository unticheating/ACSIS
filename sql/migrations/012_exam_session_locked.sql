-- Lock exam session for manual submit (time up / max violations) without auto-submit.

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS lock_reason VARCHAR(32) DEFAULT NULL;
