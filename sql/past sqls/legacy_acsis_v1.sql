-- ============================================================
--  ANTI-CHEATING EXAM SYSTEM — PostgreSQL Schema
-- ============================================================

-- ============================================================
--  ENUM TYPES  (must be created before tables that use them)
-- ============================================================

CREATE TYPE user_role       AS ENUM ('admin', 'faculty', 'student');
CREATE TYPE semester_type   AS ENUM ('1st', '2nd', 'Summer');
CREATE TYPE exam_status     AS ENUM ('draft', 'waiting', 'open', 'closed');
--  draft   = faculty is still building the exam
--  waiting = access code released, students are in lobby, waiting for faculty signal
--  open    = exam is live, students can answer
--  closed  = exam ended, no more submissions

CREATE TYPE question_type   AS ENUM ('mcq', 'identification', 'true_false');
CREATE TYPE session_status  AS ENUM ('in_progress', 'submitted', 'expired');
CREATE TYPE cheat_event     AS ENUM ('alt_tab', 'copy_attempt', 'paste_attempt',
                                     'window_blur', 'devtools_open', 'other');
CREATE TYPE report_type     AS ENUM ('class_results', 'individual', 'item_analysis');

-- ============================================================
--  REUSABLE TRIGGER: auto-update updated_at columns
--  Apply this to every table that has an updated_at column.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================
--  SECTION 1: CORE TABLES
-- ============================================================

CREATE TABLE departments (
    dept_id         SERIAL PRIMARY KEY,
    department_code VARCHAR(20)  NOT NULL UNIQUE,
    department_name VARCHAR(100) NOT NULL
);

CREATE TABLE programs (
    program_id   SERIAL PRIMARY KEY,
    program_code VARCHAR(20)  NOT NULL UNIQUE,
    program_name VARCHAR(100) NOT NULL,
    dept_id      INT          NOT NULL REFERENCES departments(dept_id)
);

CREATE TABLE courses (
    course_id   SERIAL PRIMARY KEY,
    course_code VARCHAR(20)  NOT NULL UNIQUE,
    course_name VARCHAR(100) NOT NULL
);

CREATE TABLE users (
    uid         SERIAL PRIMARY KEY,
    first_name  VARCHAR(50)  NOT NULL,
    middle_name VARCHAR(50)  DEFAULT NULL,
    last_name   VARCHAR(50)  NOT NULL,
    suffix      VARCHAR(10)  DEFAULT NULL,
    plp         VARCHAR(50)  DEFAULT NULL,        -- school-issued ID / employee number
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,            -- bcrypt hash, never plaintext
    role        user_role    NOT NULL
);

CREATE TABLE faculty (
    faculty_id  SERIAL PRIMARY KEY,
    uid         INT NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
    dept_id     INT NOT NULL REFERENCES departments(dept_id)
);

CREATE TABLE students (
    student_id     SERIAL PRIMARY KEY,
    uid            INT         NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
    student_number VARCHAR(20) NOT NULL UNIQUE,   -- serves as unique identifier per requirements
    program_id     INT         NOT NULL REFERENCES programs(program_id),
    year_level     SMALLINT    NOT NULL CHECK (year_level BETWEEN 1 AND 5),
    section        VARCHAR(20) DEFAULT NULL
);

-- ============================================================
--  SECTION 2: COURSE ASSIGNMENTS
--  Ties course + faculty + program + year_level + section + semester
-- ============================================================

CREATE TABLE course_assignments (
    assignment_id SERIAL PRIMARY KEY,
    course_id     INT         NOT NULL REFERENCES courses(course_id),
    faculty_id    INT         NOT NULL REFERENCES faculty(faculty_id),
    program_id    INT         NOT NULL REFERENCES programs(program_id),
    year_level    SMALLINT    NOT NULL CHECK (year_level BETWEEN 1 AND 5),
    section       VARCHAR(20) NOT NULL,
    school_year   VARCHAR(10) NOT NULL,           -- e.g. "2024-2025"
    semester      semester_type NOT NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (course_id, faculty_id, program_id, year_level, section, school_year, semester)
);

-- ============================================================
--  SECTION 3: SYSTEM SETTINGS
--  Global config: logo (base64), school name, max warnings, etc.
-- ============================================================

CREATE TABLE system_settings (
    setting_id    SERIAL PRIMARY KEY,
    setting_key   VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT         DEFAULT NULL,
    updated_by    INT          DEFAULT NULL REFERENCES users(uid) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Default config rows
INSERT INTO system_settings (setting_key, setting_value) VALUES
    ('school_name',    'Your School Name'),
    ('school_logo',    NULL),              -- store as base64 data URI
    ('system_title',   'Online Examination System'),
    ('max_warnings',   '3');               -- change here to adjust strike limit globally

-- ============================================================
--  SECTION 4: EXAMS
-- ============================================================

CREATE TABLE exams (
    exam_id          SERIAL PRIMARY KEY,
    assignment_id    INT          NOT NULL REFERENCES course_assignments(assignment_id),
    title            VARCHAR(200) NOT NULL,
    description      TEXT         DEFAULT NULL,
    access_code      VARCHAR(20)  DEFAULT NULL,   -- faculty releases this to students
    time_limit       INT          DEFAULT NULL,   -- minutes; NULL = no limit
    status           exam_status  NOT NULL DEFAULT 'draft',
    shuffle_questions BOOLEAN     NOT NULL DEFAULT FALSE, -- randomize question order per student
    shuffle_choices   BOOLEAN     NOT NULL DEFAULT FALSE, -- randomize MCQ choice order per student
    is_archived      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by       INT          NOT NULL REFERENCES users(uid),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
--  SECTION 5: QUESTIONS & CHOICES
-- ============================================================

CREATE TABLE questions (
    question_id   SERIAL PRIMARY KEY,
    exam_id       INT           NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    question_text TEXT          NOT NULL,
    question_type question_type NOT NULL,
    points        NUMERIC(5,2)  NOT NULL DEFAULT 1.00,
    order_num     INT           NOT NULL DEFAULT 0
    -- NOTE: question numbers are NOT shown to students per requirements.
    --       order_num is used server-side only for original ordering;
    --       if shuffle_questions = TRUE, the app serves a randomized order.
);

-- Only populated for MCQ and True/False questions
CREATE TABLE choices (
    choice_id   SERIAL PRIMARY KEY,
    question_id INT          NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    choice_text VARCHAR(500) NOT NULL,
    is_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
    order_num   INT          NOT NULL DEFAULT 0
    -- NOTE: Traditional A/B/C/D labels are NOT used per requirements.
    --       If shuffle_choices = TRUE, the app randomizes choice order.
    --       Correct answer is identified by is_correct = TRUE, not by position.
);

-- ============================================================
--  SECTION 6: EXAM SESSIONS
--  One row per student per exam attempt
-- ============================================================

CREATE TABLE exam_sessions (
    session_id     SERIAL PRIMARY KEY,
    exam_id        INT            NOT NULL REFERENCES exams(exam_id),
    student_id     INT            NOT NULL REFERENCES students(student_id),
    started_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    submitted_at   TIMESTAMPTZ    DEFAULT NULL,
    warning_count  SMALLINT       NOT NULL DEFAULT 0,
    auto_submitted BOOLEAN        NOT NULL DEFAULT FALSE,  -- TRUE if submitted by 3-strike rule
    status         session_status NOT NULL DEFAULT 'in_progress',
    UNIQUE (exam_id, student_id)   -- enforces one attempt per student per exam
);

-- ============================================================
--  SECTION 7: STUDENT ANSWERS
--  Locked after submission — admin/faculty CANNOT edit post-submission
-- ============================================================

CREATE TABLE student_answers (
    answer_id        SERIAL PRIMARY KEY,
    session_id       INT          NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    question_id      INT          NOT NULL REFERENCES questions(question_id),
    -- MCQ / True-False: populate choice_id; identification: populate answer_text
    choice_id        INT          DEFAULT NULL REFERENCES choices(choice_id) ON DELETE SET NULL,
    answer_text      TEXT         DEFAULT NULL,
    -- NOTE: answer_text MUST be stored in UPPER CASE by the application layer
    --       to maintain consistency (per requirements). The DB accepts whatever it receives.
    is_correct       BOOLEAN      DEFAULT NULL,   -- NULL = not yet checked
    manually_checked BOOLEAN      NOT NULL DEFAULT FALSE,
    checked_by       INT          DEFAULT NULL REFERENCES users(uid) ON DELETE SET NULL,
    checked_at       TIMESTAMPTZ  DEFAULT NULL,
    UNIQUE (session_id, question_id)
);

-- ============================================================
--  SECTION 8: CHEATING / ANTI-CHEAT LOGS
-- ============================================================

CREATE TABLE cheating_logs (
    log_id      SERIAL PRIMARY KEY,
    session_id  INT         NOT NULL REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    event_type  cheat_event NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details     TEXT        DEFAULT NULL     -- optional: which tab, what was copied, etc.
);

-- ============================================================
--  SECTION 9: EXAM RESULTS
--  Computed once all answers are checked.
--  score_released controls student visibility.
--  email_sent tracks whether result email has been dispatched.
-- ============================================================

CREATE TABLE exam_results (
    result_id      SERIAL PRIMARY KEY,
    session_id     INT          NOT NULL UNIQUE REFERENCES exam_sessions(session_id) ON DELETE CASCADE,
    raw_score      NUMERIC(7,2) NOT NULL DEFAULT 0.00,
    total_points   NUMERIC(7,2) NOT NULL DEFAULT 0.00,
    -- percentage is computed automatically; never store it manually
    percentage     NUMERIC(5,2) GENERATED ALWAYS AS (
                       CASE WHEN total_points > 0
                            THEN ROUND((raw_score / total_points) * 100, 2)
                            ELSE 0
                       END
                   ) STORED,
    rank           INT          DEFAULT NULL,   -- rank within the class for this exam (Top 1 etc.)
    score_released BOOLEAN      NOT NULL DEFAULT FALSE,  -- faculty flips this to show student their score
    email_sent     BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE after result + correct answers emailed
    computed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    released_at    TIMESTAMPTZ  DEFAULT NULL
);

-- ============================================================
--  SECTION 10: REPORT LOGS
--  Records who generated a PDF report and when.
--  Used to populate: "Report generated by Prof. X as of [date] at [time]"
-- ============================================================

CREATE TABLE report_logs (
    report_log_id SERIAL PRIMARY KEY,
    exam_id       INT         NOT NULL REFERENCES exams(exam_id),
    generated_by  INT         NOT NULL REFERENCES users(uid),
    report_type   report_type NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_exams_assignment     ON exams(assignment_id);
CREATE INDEX idx_exams_status         ON exams(status, is_archived);
CREATE INDEX idx_sessions_exam        ON exam_sessions(exam_id);
CREATE INDEX idx_sessions_student     ON exam_sessions(student_id);
CREATE INDEX idx_answers_session      ON student_answers(session_id);
CREATE INDEX idx_cheat_session        ON cheating_logs(session_id);
CREATE INDEX idx_cheat_occurred       ON cheating_logs(session_id, occurred_at);
CREATE INDEX idx_results_session      ON exam_results(session_id);
CREATE INDEX idx_report_exam          ON report_logs(exam_id);