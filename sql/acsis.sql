-- ============================================================
--  ANTI-CHEATING EXAM SYSTEM (ACSIS) — PostgreSQL Schema
--  Multi-tenant, institution-scoped, Google Classroom-style
--  Requires PostgreSQL 12+ (GENERATED columns on exam_results).
--
--  Safe to re-run (idempotent):
--    - ENUMs via pg_type check (works on all supported PG versions)
--    - CREATE TABLE / INDEX IF NOT EXISTS
--    - CREATE OR REPLACE FUNCTION
--    - DROP TRIGGER IF EXISTS + CREATE TRIGGER
--    - INSERT … ON CONFLICT DO NOTHING
--
--  Usage:  psql -U postgres -d your_db -f sql/acsis.sql
-- ============================================================

-- ============================================================
--  ENUM TYPES (skip if already created)
-- ============================================================

DO $acsis$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_user_role') THEN
        CREATE TYPE institution_user_role AS ENUM ('admin', 'faculty', 'student');
    END IF;
    -- super_admin is a flag on the users table, not an institution role

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'semester_type') THEN
        CREATE TYPE semester_type AS ENUM ('1st', '2nd', 'Summer');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_status') THEN
        CREATE TYPE exam_status AS ENUM ('draft', 'waiting', 'open', 'closed');
    END IF;
    -- draft   = faculty is still building the exam
    -- waiting = password released, students can enter lobby
    -- open    = faculty signals start, students can now answer
    -- closed  = exam ended, no more submissions

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM ('mcq', 'identification', 'true_false');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
        CREATE TYPE session_status AS ENUM ('in_progress', 'submitted', 'expired');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cheat_event') THEN
        CREATE TYPE cheat_event AS ENUM (
            'alt_tab',
            'copy_attempt',
            'paste_attempt',
            'window_blur',
            'devtools_open',
            'other'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
        CREATE TYPE report_type AS ENUM ('class_results', 'individual', 'item_analysis');
    END IF;
END
$acsis$;

-- ============================================================
--  REUSABLE TRIGGER: auto-update updated_at columns
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- ============================================================
--  SECTION 1: USERS
--  Global identity table — no institution-specific data here.
--  is_super_admin = TRUE for developer/platform-level accounts only.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    uid            SERIAL PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    middle_name    VARCHAR(50)  DEFAULT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    suffix         VARCHAR(10)  DEFAULT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password       VARCHAR(255) DEFAULT NULL, -- bcrypt hash; NULL for Google-only accounts
    google_sub     VARCHAR(255) UNIQUE, -- Google account subject (stable id)
    avatar_url     TEXT         DEFAULT NULL,
    is_super_admin BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
--  SECTION 2: THEMES
--  Predefined color themes prepared by developers.
--  Institutions pick one — no custom colors allowed.
--  primary_color   = main brand color (buttons, nav, accents)
--  secondary_color = surface/background tint
--  base_color      = page background (almost always white)
-- ============================================================

CREATE TABLE IF NOT EXISTS themes (
    theme_id        SERIAL PRIMARY KEY,
    theme_name      VARCHAR(50) NOT NULL UNIQUE,
    primary_color   VARCHAR(7)  NOT NULL, -- e.g. "#16A34A"
    secondary_color VARCHAR(7)  NOT NULL, -- e.g. "#DDEEE4"
    base_color      VARCHAR(7)  NOT NULL -- e.g. "#FFFFFF"
);

-- Seeded themes — developers can add more anytime
INSERT INTO themes (theme_name, primary_color, secondary_color, base_color)
VALUES
    ('Emerald', '#16A34A', '#DDEEE4', '#FFFFFF'), -- ACSIS default / green
    ('Ocean', '#1D4ED8', '#DBEAFE', '#FFFFFF'), -- blue
    ('Crimson', '#B91C1C', '#FEE2E2', '#FFFFFF'), -- red
    ('Violet', '#7C3AED', '#EDE9FE', '#FFFFFF'), -- purple
    ('Amber', '#D97706', '#FEF3C7', '#FFFFFF'), -- yellow-orange
    ('Slate', '#334155', '#F1F5F9', '#FFFFFF') -- neutral dark
ON CONFLICT (theme_name) DO NOTHING;

-- ============================================================
--  SECTION 3: INSTITUTIONS
--  Each institution is a tenant — just a row in this table.
--  Provisioned by super admin only, no self-signup.
--  Instance name shown in the app = acronym || ' ACSIS' (never stored).
-- ============================================================

CREATE TABLE IF NOT EXISTS institutions (
    institution_id   SERIAL PRIMARY KEY,
    institution_name VARCHAR(100) NOT NULL, -- e.g. "Pamantasan ng Lungsod ng Pasig"
    acronym          VARCHAR(20)  NOT NULL UNIQUE, -- e.g. "PLP" → shown as "PLP ACSIS"
    logo             TEXT         DEFAULT NULL, -- base64 data URI
    theme_id         INT          NOT NULL DEFAULT 1 REFERENCES themes (theme_id),
    max_warnings     SMALLINT     NOT NULL DEFAULT 3,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by       INT          NOT NULL REFERENCES users (uid),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_institutions_updated_at ON institutions;
CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
--  SECTION 4: INSTITUTION MEMBERS
--  Ties a user to an institution with a role.
--  A user can belong to multiple institutions (e.g. part-time faculty).
--  school_id = institution-issued ID (student number, employee number, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS institution_members (
    member_id      SERIAL PRIMARY KEY,
    institution_id INT NOT NULL REFERENCES institutions (institution_id) ON DELETE CASCADE,
    uid            INT NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    role           institution_user_role NOT NULL,
    school_id      VARCHAR(50) DEFAULT NULL,
    is_pending     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, uid) -- one membership per user per institution
);

-- Student subtype: institution-issued student number (00-00000).
-- Cohort (program, section, school year) lives on teaching_terms / classes.
CREATE TABLE IF NOT EXISTS students (
    student_id       SERIAL PRIMARY KEY,
    member_id        INT NOT NULL UNIQUE REFERENCES institution_members (member_id) ON DELETE CASCADE,
    institution_id   INT NOT NULL REFERENCES institutions (institution_id) ON DELETE CASCADE,
    student_number   VARCHAR(50) DEFAULT NULL
);

-- ============================================================
--  EMAIL VERIFICATION (OTP after Google / password sign-in)
-- ============================================================

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

-- ============================================================
--  SECTION 5: TEACHING SECTIONS & CLASSES (COURSES)
--  Faculty browse: section (BSIT 3D + AY/sem) → course (IT 108) → exams
--  Students join classes via access_code.
-- ============================================================

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

DROP TRIGGER IF EXISTS trg_teaching_terms_updated_at ON teaching_terms;
CREATE TRIGGER trg_teaching_terms_updated_at
    BEFORE UPDATE ON teaching_terms
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE IF NOT EXISTS classes (
    class_id       SERIAL PRIMARY KEY,
    institution_id INT NOT NULL REFERENCES institutions (institution_id) ON DELETE CASCADE,
    member_id      INT NOT NULL REFERENCES institution_members (member_id),
    term_id        INT DEFAULT NULL REFERENCES teaching_terms (term_id) ON DELETE SET NULL,
    course_code    VARCHAR(20) NOT NULL,
    class_name     VARCHAR(200) NOT NULL,
    description    TEXT DEFAULT NULL,
    school_year    VARCHAR(10) NOT NULL, -- denormalized from term for reporting
    semester       semester_type NOT NULL,
    access_code    VARCHAR(20) NOT NULL UNIQUE, -- students enter this to enroll
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_classes_updated_at ON classes;
CREATE TRIGGER trg_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
--  SECTION 6: CLASS ENROLLMENTS
--  Tracks which students have joined a class via access_code.
-- ============================================================

CREATE TABLE IF NOT EXISTS class_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    class_id      INT NOT NULL REFERENCES classes (class_id) ON DELETE CASCADE,
    member_id     INT NOT NULL REFERENCES institution_members (member_id) ON DELETE CASCADE,
    enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, member_id)
);

-- ============================================================
--  SECTION 7: EXAMS
--  Belong to a class. Students enter via password to join the lobby.
-- ============================================================

CREATE TABLE IF NOT EXISTS exams (
    exam_id           SERIAL PRIMARY KEY,
    class_id          INT NOT NULL REFERENCES classes (class_id) ON DELETE CASCADE,
    title             VARCHAR(200) NOT NULL,
    description       TEXT DEFAULT NULL,
    password          VARCHAR(20) DEFAULT NULL, -- students enter this to join the lobby
    time_limit        INT DEFAULT NULL, -- minutes; NULL = no limit
    status            exam_status NOT NULL DEFAULT 'draft',
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
    shuffle_choices   BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by        INT NOT NULL REFERENCES institution_members (member_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_exams_updated_at ON exams;
CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
--  SECTION 8: QUESTIONS & CHOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS questions (
    question_id   SERIAL PRIMARY KEY,
    exam_id       INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    points        NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    order_num     INT NOT NULL DEFAULT 0
    -- order_num is server-side only; not shown to students.
    -- if shuffle_questions = TRUE, app serves a randomized order.
);

CREATE TABLE IF NOT EXISTS choices (
    choice_id   SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES questions (question_id) ON DELETE CASCADE,
    choice_text VARCHAR(500) NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
    order_num   INT NOT NULL DEFAULT 0
    -- No A/B/C/D labels per requirements.
    -- is_correct = TRUE identifies the answer, not position.
);

-- ============================================================
--  SECTION 9: EXAM SESSIONS
--  One row per student per exam attempt.
--  Created when student submits the correct exam password.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_sessions (
    session_id     SERIAL PRIMARY KEY,
    exam_id        INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
    member_id      INT NOT NULL REFERENCES institution_members (member_id),
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at   TIMESTAMPTZ DEFAULT NULL,
    warning_count  SMALLINT NOT NULL DEFAULT 0,
    auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    status         session_status NOT NULL DEFAULT 'in_progress',
    question_order JSONB DEFAULT NULL,
    choice_orders  JSONB DEFAULT NULL,
    UNIQUE (exam_id, member_id)
);

-- ============================================================
--  SECTION 10: STUDENT ANSWERS
--  Locked after submission — cannot be edited post-submission.
-- ============================================================

CREATE TABLE IF NOT EXISTS student_answers (
    answer_id        SERIAL PRIMARY KEY,
    session_id       INT NOT NULL REFERENCES exam_sessions (session_id) ON DELETE CASCADE,
    question_id      INT NOT NULL REFERENCES questions (question_id),
    choice_id        INT DEFAULT NULL REFERENCES choices (choice_id) ON DELETE SET NULL,
    answer_text      TEXT DEFAULT NULL,
    -- answer_text MUST be stored in UPPER CASE by the application layer.
    is_correct       BOOLEAN DEFAULT NULL,
    manually_checked BOOLEAN NOT NULL DEFAULT FALSE,
    checked_by       INT DEFAULT NULL REFERENCES institution_members (member_id) ON DELETE SET NULL,
    checked_at       TIMESTAMPTZ DEFAULT NULL,
    UNIQUE (session_id, question_id)
);

-- ============================================================
--  SECTION 11: CHEATING LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS cheating_logs (
    log_id      SERIAL PRIMARY KEY,
    session_id  INT NOT NULL REFERENCES exam_sessions (session_id) ON DELETE CASCADE,
    event_type  cheat_event NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details     TEXT DEFAULT NULL
);

-- ============================================================
--  SECTION 12: EXAM RESULTS
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_results (
    result_id      SERIAL PRIMARY KEY,
    session_id     INT NOT NULL UNIQUE REFERENCES exam_sessions (session_id) ON DELETE CASCADE,
    raw_score      NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    total_points   NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
    percentage     NUMERIC(5, 2) GENERATED ALWAYS AS (
                       CASE
                           WHEN total_points > 0 THEN ROUND((raw_score / total_points) * 100, 2)
                           ELSE (0)::NUMERIC(5, 2)
                       END
                   ) STORED,
    rank           INT DEFAULT NULL,
    score_released BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at    TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
--  SECTION 13: REPORT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS report_logs (
    report_log_id SERIAL PRIMARY KEY,
    exam_id       INT NOT NULL REFERENCES exams (exam_id),
    generated_by  INT NOT NULL REFERENCES institution_members (member_id),
    report_type   report_type NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  PERFORMANCE INDEXES (skip missing tables/columns — safe on legacy DBs)
-- ============================================================

CREATE OR REPLACE FUNCTION acsis_safe_index(
    p_index_name text,
    p_table_name text,
    p_columns text[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    col text;
    col_list text;
    missing int;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = p_table_name
    ) THEN
        RAISE NOTICE 'Skipping index % — table % does not exist', p_index_name, p_table_name;
        RETURN;
    END IF;

    SELECT COUNT(*) INTO missing
    FROM unnest(p_columns) AS req(col)
    WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = req.col
    );

    IF missing > 0 THEN
        RAISE NOTICE 'Skipping index % — not all columns exist on %', p_index_name, p_table_name;
        RETURN;
    END IF;

    SELECT string_agg(quote_ident(c), ', ' ORDER BY ord)
    INTO col_list
    FROM unnest(p_columns) WITH ORDINALITY AS t(c, ord);

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (%s)',
        p_index_name,
        p_table_name,
        col_list
    );
END;
$$;

SELECT acsis_safe_index('idx_members_institution', 'institution_members', ARRAY['institution_id']);
SELECT acsis_safe_index('idx_members_user', 'institution_members', ARRAY['uid']);
SELECT acsis_safe_index('idx_students_member', 'students', ARRAY['member_id']);
SELECT acsis_safe_index('idx_students_institution', 'students', ARRAY['institution_id']);
-- Partial unique: student number per institution (see migration 009)
DO $acsis$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_institution_student_number'
    ) THEN
        CREATE UNIQUE INDEX idx_students_institution_student_number
            ON students (institution_id, student_number)
            WHERE student_number IS NOT NULL AND student_number <> '';
    END IF;
END
$acsis$;
SELECT acsis_safe_index('idx_teaching_terms_member', 'teaching_terms', ARRAY['member_id']);
SELECT acsis_safe_index('idx_classes_term', 'classes', ARRAY['term_id']);
SELECT acsis_safe_index('idx_classes_institution', 'classes', ARRAY['institution_id']);
SELECT acsis_safe_index('idx_classes_member', 'classes', ARRAY['member_id']);
SELECT acsis_safe_index('idx_enrollments_class', 'class_enrollments', ARRAY['class_id']);
SELECT acsis_safe_index('idx_enrollments_member', 'class_enrollments', ARRAY['member_id']);
SELECT acsis_safe_index('idx_exams_class', 'exams', ARRAY['class_id']);
SELECT acsis_safe_index('idx_exams_status', 'exams', ARRAY['status', 'is_archived']);
SELECT acsis_safe_index('idx_sessions_exam', 'exam_sessions', ARRAY['exam_id']);
SELECT acsis_safe_index('idx_sessions_member', 'exam_sessions', ARRAY['member_id']);
SELECT acsis_safe_index('idx_answers_session', 'student_answers', ARRAY['session_id']);
SELECT acsis_safe_index('idx_answers_question', 'student_answers', ARRAY['question_id']);
SELECT acsis_safe_index('idx_questions_exam', 'questions', ARRAY['exam_id']);
SELECT acsis_safe_index('idx_cheat_session', 'cheating_logs', ARRAY['session_id']);
SELECT acsis_safe_index('idx_cheat_occurred', 'cheating_logs', ARRAY['session_id', 'occurred_at']);
SELECT acsis_safe_index('idx_results_session', 'exam_results', ARRAY['session_id']);
SELECT acsis_safe_index('idx_report_exam', 'report_logs', ARRAY['exam_id']);

-- Quick sanity check (visible in pgAdmin Messages tab)
DO $acsis$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        RAISE NOTICE 'OK: public.institutions exists (% rows)', (SELECT COUNT(*) FROM institutions);
    ELSE
        RAISE WARNING 'MISSING: public.institutions — you may be on legacy schema or acsis.sql did not run. Use a fresh DB or run this file on database "acsis".';
    END IF;
END
$acsis$;
