-- Run AFTER importing sql/backup_gwen.sql into a database that should match sql/acsis.sql.
-- Fixes the main inconsistencies without editing the 2k-line dump.

\echo '=== ACSIS post-import alignment (Gwen backup) ==='

-- 1) institution_members: membership only (no student cohort fields)
ALTER TABLE institution_members DROP COLUMN IF EXISTS year_level;
ALTER TABLE institution_members DROP COLUMN IF EXISTS section;

-- 2) students table keyed by member_id (migrate legacy uid/program_id rows if present)
CREATE TABLE IF NOT EXISTS students (
    student_id    SERIAL PRIMARY KEY,
    member_id     INT NOT NULL UNIQUE REFERENCES institution_members (member_id) ON DELETE CASCADE,
    program_code  VARCHAR(20) DEFAULT NULL,
    year_level    VARCHAR(50) DEFAULT NULL,
    section_code  VARCHAR(20) DEFAULT NULL
);

-- 3) teaching_terms + classes.term_id / course_code
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
UPDATE classes SET course_code = COALESCE(NULLIF(TRIM(class_name), ''), 'COURSE')
WHERE course_code IS NULL OR TRIM(course_code) = '';

-- 4) Email OTP (Google / password sign-in)
CREATE TABLE IF NOT EXISTS email_verification_codes (
    verification_id SERIAL PRIMARY KEY,
    uid             INT NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    code_hash       VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_uid_active
    ON email_verification_codes (uid, created_at DESC)
    WHERE used_at IS NULL;

\echo 'Done. Prefer sql/acsis.sql for fresh installs; use this only after backup_gwen.sql import.'
