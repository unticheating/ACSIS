-- Optional per-class header background color (hex). NULL = institution brand.

\echo '=== 011: classes.header_color ==='

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS header_color VARCHAR(7) DEFAULT NULL;

\echo 'Done.'
