-- ============================================================
--  ANTI-CHEATING EXAM SYSTEM (ACSIS) — PostgreSQL Schema
--  Multi-tenant, institution-scoped, Google Classroom-style
--  Requires PostgreSQL 12+ (GENERATED columns on exam_results).
-- ============================================================

-- ============================================================
--  ENUM TYPES
-- ============================================================

CREATE TYPE institution_user_role AS ENUM ('admin', 'faculty', 'student');
--  super_admin is a flag on the users table, not an institution role

CREATE TYPE semester_type AS ENUM ('1st', '2nd', 'Summer');
CREATE TYPE exam_status AS ENUM ('draft', 'waiting', 'open', 'closed');
--  draft   = faculty is still building the exam
--  waiting = password released, students can enter lobby
--  open    = faculty signals start, students can now answer
--  closed  = exam ended, no more submissions

CREATE TYPE question_type AS ENUM ('mcq', 'identification', 'true_false');
CREATE TYPE session_status AS ENUM ('in_progress', 'submitted', 'expired');
CREATE TYPE cheat_event AS ENUM (
    'alt_tab',
    'copy_attempt',
    'paste_attempt',
    'window_blur',
    'devtools_open',
    'other'
);
CREATE TYPE report_type AS ENUM ('class_results', 'individual', 'item_analysis');

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

CREATE TABLE users (
    uid            SERIAL PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    middle_name    VARCHAR(50)  DEFAULT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    suffix         VARCHAR(10)  DEFAULT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL, -- bcrypt hash, never plaintext
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

CREATE TABLE themes (
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
    ('Slate', '#334155', '#F1F5F9', '#FFFFFF'); -- neutral dark

-- ============================================================
--  SECTION 3: INSTITUTIONS
--  Each institution is a tenant — just a row in this table.
--  Provisioned by super admin only, no self-signup.
--  Instance name shown in the app = acronym || ' ACSIS' (never stored).
-- ============================================================

CREATE TABLE institutions (
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

CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW
    EXECUTE PROCEDURE fn_set_updated_at();

-- ============================================================
--  SECTION 4: INSTITUTION MEMBERS
--  Ties a user to an institution with a role.
--  A user can belong to multiple institutions (e.g. part-time faculty).
--  school_id = institution-issued ID (student number, employee number, etc.)
-- ============================================================

CREATE TABLE institution_members (
    member_id      SERIAL PRIMARY KEY,
    institution_id INT NOT NULL REFERENCES institutions (institution_id) ON DELETE CASCADE,
    uid            INT NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    role           institution_user_role NOT NULL,
    school_id      VARCHAR(50) DEFAULT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, uid) -- one membership per user per institution
);

-- ============================================================
--  SECTION 5: CLASSES
--  Created by faculty. Students join via access_code.
--  Academic year and semester live here.
-- ============================================================

CREATE TABLE classes (
    class_id       SERIAL PRIMARY KEY,
    institution_id INT NOT NULL REFERENCES institutions (institution_id) ON DELETE CASCADE,
    member_id      INT NOT NULL REFERENCES institution_members (member_id),
    class_name     VARCHAR(200) NOT NULL,
    description    TEXT DEFAULT NULL,
    school_year    VARCHAR(10) NOT NULL, -- e.g. "2024-2025"
    semester       semester_type NOT NULL,
    access_code    VARCHAR(20) NOT NULL UNIQUE, -- students enter this to enroll
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE PROCEDURE fn_set_updated_at();

-- ============================================================
--  SECTION 6: CLASS ENROLLMENTS
--  Tracks which students have joined a class via access_code.
-- ============================================================

CREATE TABLE class_enrollments (
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

CREATE TABLE exams (
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

CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE PROCEDURE fn_set_updated_at();

-- ============================================================
--  SECTION 8: QUESTIONS & CHOICES
-- ============================================================

CREATE TABLE questions (
    question_id   SERIAL PRIMARY KEY,
    exam_id       INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    points        NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    order_num     INT NOT NULL DEFAULT 0
    -- order_num is server-side only; not shown to students.
    -- if shuffle_questions = TRUE, app serves a randomized order.
);

CREATE TABLE choices (
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

CREATE TABLE exam_sessions (
    session_id     SERIAL PRIMARY KEY,
    exam_id        INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
    member_id      INT NOT NULL REFERENCES institution_members (member_id),
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at   TIMESTAMPTZ DEFAULT NULL,
    warning_count  SMALLINT NOT NULL DEFAULT 0,
    auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    status         session_status NOT NULL DEFAULT 'in_progress',
    UNIQUE (exam_id, member_id)
);

-- ============================================================
--  SECTION 10: STUDENT ANSWERS
--  Locked after submission — cannot be edited post-submission.
-- ============================================================

CREATE TABLE student_answers (
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

CREATE TABLE cheating_logs (
    log_id      SERIAL PRIMARY KEY,
    session_id  INT NOT NULL REFERENCES exam_sessions (session_id) ON DELETE CASCADE,
    event_type  cheat_event NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details     TEXT DEFAULT NULL
);

-- ============================================================
--  SECTION 12: EXAM RESULTS
-- ============================================================

CREATE TABLE exam_results (
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

CREATE TABLE report_logs (
    report_log_id SERIAL PRIMARY KEY,
    exam_id       INT NOT NULL REFERENCES exams (exam_id),
    generated_by  INT NOT NULL REFERENCES institution_members (member_id),
    report_type   report_type NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_members_institution ON institution_members (institution_id);
CREATE INDEX idx_members_user ON institution_members (uid);
CREATE INDEX idx_classes_institution ON classes (institution_id);
CREATE INDEX idx_classes_member ON classes (member_id);
CREATE INDEX idx_enrollments_class ON class_enrollments (class_id);
CREATE INDEX idx_enrollments_member ON class_enrollments (member_id);
CREATE INDEX idx_exams_class ON exams (class_id);
CREATE INDEX idx_exams_status ON exams (status, is_archived);
CREATE INDEX idx_sessions_exam ON exam_sessions (exam_id);
CREATE INDEX idx_sessions_member ON exam_sessions (member_id);
CREATE INDEX idx_answers_session ON student_answers (session_id);
CREATE INDEX idx_answers_question ON student_answers (question_id);
CREATE INDEX idx_questions_exam ON questions (exam_id);
CREATE INDEX idx_cheat_session ON cheating_logs (session_id);
CREATE INDEX idx_cheat_occurred ON cheating_logs (session_id, occurred_at);
CREATE INDEX idx_results_session ON exam_results (session_id);
CREATE INDEX idx_report_exam ON report_logs (exam_id);
