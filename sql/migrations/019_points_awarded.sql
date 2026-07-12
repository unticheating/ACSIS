-- Partial credit: teacher-assigned points per answer (nullable = use auto grade).
ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS points_awarded NUMERIC(10, 2) DEFAULT NULL;
