-- Allow professors to mark cheating detections as false positives in live monitoring.
ALTER TABLE cheating_logs
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE cheating_logs
  ADD COLUMN IF NOT EXISTS dismissed_by_member_id INT DEFAULT NULL
  REFERENCES institution_members (member_id) ON DELETE SET NULL;
