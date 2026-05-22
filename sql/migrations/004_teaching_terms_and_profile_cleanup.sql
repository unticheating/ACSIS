-- Align legacy Gwen / course-assignment schema with acsis.sql teaching model.
-- Safe to run multiple times (IF NOT EXISTS / guarded drops).

-- Remove program/section/year from institution_members (belongs on students only)
ALTER TABLE institution_members DROP COLUMN IF EXISTS year_level;
ALTER TABLE institution_members DROP COLUMN IF EXISTS section;

-- Student profile extension (canonical in acsis.sql)
CREATE TABLE IF NOT EXISTS students (
    student_id    SERIAL PRIMARY KEY,
    member_id     INT NOT NULL UNIQUE REFERENCES institution_members (member_id) ON DELETE CASCADE,
    program_code  VARCHAR(20) DEFAULT NULL,
    year_level    VARCHAR(50) DEFAULT NULL,
    section_code  VARCHAR(20) DEFAULT NULL
);

-- Teaching sections (faculty: BSIT 3D + AY/sem)
CREATE TABLE IF NOT EXISTS teaching_terms (
    term_id        SERIAL PRIMARY KEY,
    institution_id INT NOT NULL REFERENCES institutions (institution_id) ON DELETE CASCADE,
    member_id      INT NOT NULL REFERENCES institution_members (member_id) ON DELETE CASCADE,
    program_code   VARCHAR(20) NOT NULL,
    section_code   VARCHAR(20) NOT NULL,
    school_year    VARCHAR(10) NOT NULL,
    semester       semester_type NOT NULL,
    is_archived    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (member_id, program_code, section_code, school_year, semester)
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS term_id INT DEFAULT NULL
  REFERENCES teaching_terms (term_id) ON DELETE SET NULL;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS course_code VARCHAR(20);
UPDATE classes SET course_code = 'COURSE' WHERE course_code IS NULL OR TRIM(course_code) = '';
ALTER TABLE classes ALTER COLUMN course_code SET NOT NULL;
