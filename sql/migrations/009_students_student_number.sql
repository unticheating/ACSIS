-- Student profile: institution-scoped student number only.
-- Cohort (program, section, school year) stays on teaching_terms / classes.
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS).

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS institution_id INT,
    ADD COLUMN IF NOT EXISTS student_number VARCHAR(50);

-- Link existing rows to their institution
UPDATE students s
SET institution_id = im.institution_id
FROM institution_members im
WHERE s.member_id = im.member_id
  AND s.institution_id IS NULL;

-- Copy legacy school_id from membership into student_number
UPDATE students s
SET student_number = TRIM(im.school_id)
FROM institution_members im
WHERE s.member_id = im.member_id
  AND im.role = 'student'
  AND im.school_id IS NOT NULL
  AND TRIM(im.school_id) <> ''
  AND (s.student_number IS NULL OR TRIM(s.student_number) = '');

-- Ensure every student member has a students row
INSERT INTO students (member_id, institution_id, student_number)
SELECT im.member_id,
       im.institution_id,
       NULLIF(TRIM(im.school_id), '')
FROM institution_members im
LEFT JOIN students s ON s.member_id = im.member_id
WHERE im.role = 'student'
  AND s.member_id IS NULL;

-- institution_id is required for new model
ALTER TABLE students
    ALTER COLUMN institution_id SET NOT NULL;

DO $acsis$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'students_institution_id_fkey'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT students_institution_id_fkey
            FOREIGN KEY (institution_id) REFERENCES institutions (institution_id) ON DELETE CASCADE;
    END IF;
END
$acsis$;

ALTER TABLE students DROP COLUMN IF EXISTS program_code;
ALTER TABLE students DROP COLUMN IF EXISTS year_level;
ALTER TABLE students DROP COLUMN IF EXISTS section_code;

-- Student number lives on students; keep school_id for faculty/admin only
UPDATE institution_members
SET school_id = NULL
WHERE role = 'student'
  AND school_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_institution_student_number
    ON students (institution_id, student_number)
    WHERE student_number IS NOT NULL AND student_number <> '';
