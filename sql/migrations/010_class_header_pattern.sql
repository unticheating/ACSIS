-- Per-class decorative header pattern (instructor-selected; visible to enrolled students).

\echo '=== 010: classes.header_pattern ==='

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS header_pattern VARCHAR(20) NOT NULL DEFAULT 'grid';

ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_header_pattern_check;

ALTER TABLE classes
  ADD CONSTRAINT classes_header_pattern_check
  CHECK (header_pattern IN ('grid', 'honeycomb', 'diamond', 'floral', 'ruled'));

\echo 'Done.'
