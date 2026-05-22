--
-- PostgreSQL database dump (LEGACY — see sql/BACKUP_GWEN.md)
--
-- After import, run: sql/backup_gwen_post_import.sql
-- Fresh installs should use sql/acsis.sql instead.
--

\restrict Yn7HJjZ5aGyhUdetFfMbOq9YNV1MLkFmug53FvJK6PSiuFdu7pcudC5ftzZWKQT

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-22 18:57:54

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 910 (class 1247 OID 16432)
-- Name: cheat_event; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cheat_event AS ENUM (
    'alt_tab',
    'copy_attempt',
    'paste_attempt',
    'window_blur',
    'devtools_open',
    'other'
);


ALTER TYPE public.cheat_event OWNER TO postgres;

--
-- TOC entry 901 (class 1247 OID 16406)
-- Name: exam_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.exam_status AS ENUM (
    'draft',
    'waiting',
    'open',
    'closed'
);


ALTER TYPE public.exam_status OWNER TO postgres;

--
-- TOC entry 964 (class 1247 OID 17162)
-- Name: institution_user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.institution_user_role AS ENUM (
    'admin',
    'faculty',
    'student'
);


ALTER TYPE public.institution_user_role OWNER TO postgres;

--
-- TOC entry 904 (class 1247 OID 16416)
-- Name: question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type AS ENUM (
    'mcq',
    'identification',
    'true_false'
);


ALTER TYPE public.question_type OWNER TO postgres;

--
-- TOC entry 913 (class 1247 OID 16446)
-- Name: report_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_type AS ENUM (
    'class_results',
    'individual',
    'item_analysis'
);


ALTER TYPE public.report_type OWNER TO postgres;

--
-- TOC entry 898 (class 1247 OID 16398)
-- Name: semester_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.semester_type AS ENUM (
    '1st',
    '2nd',
    'Summer'
);


ALTER TYPE public.semester_type OWNER TO postgres;

--
-- TOC entry 907 (class 1247 OID 16424)
-- Name: session_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.session_status AS ENUM (
    'in_progress',
    'submitted',
    'expired'
);


ALTER TYPE public.session_status OWNER TO postgres;

--
-- TOC entry 895 (class 1247 OID 16390)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'faculty',
    'student'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 273 (class 1255 OID 17307)
-- Name: acsis_safe_index(text, text, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.acsis_safe_index(p_index_name text, p_table_name text, p_columns text[]) RETURNS void
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


ALTER FUNCTION public.acsis_safe_index(p_index_name text, p_table_name text, p_columns text[]) OWNER TO postgres;

--
-- TOC entry 261 (class 1255 OID 16453)
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 246 (class 1259 OID 16769)
-- Name: cheating_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cheating_logs (
    log_id integer NOT NULL,
    session_id integer NOT NULL,
    event_type public.cheat_event NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    details text
);


ALTER TABLE public.cheating_logs OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16768)
-- Name: cheating_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cheating_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cheating_logs_log_id_seq OWNER TO postgres;

--
-- TOC entry 5373 (class 0 OID 0)
-- Dependencies: 245
-- Name: cheating_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cheating_logs_log_id_seq OWNED BY public.cheating_logs.log_id;


--
-- TOC entry 240 (class 1259 OID 16682)
-- Name: choices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.choices (
    choice_id integer NOT NULL,
    question_id integer NOT NULL,
    choice_text character varying(500) NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    order_num integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.choices OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16681)
-- Name: choices_choice_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.choices_choice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.choices_choice_id_seq OWNER TO postgres;

--
-- TOC entry 5374 (class 0 OID 0)
-- Dependencies: 239
-- Name: choices_choice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.choices_choice_id_seq OWNED BY public.choices.choice_id;


--
-- TOC entry 260 (class 1259 OID 17283)
-- Name: class_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_enrollments (
    enrollment_id integer NOT NULL,
    class_id integer NOT NULL,
    member_id integer NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.class_enrollments OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 17282)
-- Name: class_enrollments_enrollment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_enrollments_enrollment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_enrollments_enrollment_id_seq OWNER TO postgres;

--
-- TOC entry 5375 (class 0 OID 0)
-- Dependencies: 259
-- Name: class_enrollments_enrollment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_enrollments_enrollment_id_seq OWNED BY public.class_enrollments.enrollment_id;


--
-- TOC entry 258 (class 1259 OID 17248)
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    class_id integer NOT NULL,
    institution_id integer NOT NULL,
    member_id integer NOT NULL,
    class_name character varying(200) NOT NULL,
    description text,
    school_year character varying(10) NOT NULL,
    semester public.semester_type NOT NULL,
    access_code character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 17247)
-- Name: classes_class_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classes_class_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classes_class_id_seq OWNER TO postgres;

--
-- TOC entry 5376 (class 0 OID 0)
-- Dependencies: 257
-- Name: classes_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classes_class_id_seq OWNED BY public.classes.class_id;


--
-- TOC entry 232 (class 1259 OID 16567)
-- Name: course_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_assignments (
    assignment_id integer NOT NULL,
    course_id integer NOT NULL,
    faculty_id integer NOT NULL,
    program_id integer NOT NULL,
    year_level smallint NOT NULL,
    section character varying(20) NOT NULL,
    school_year character varying(10) NOT NULL,
    semester public.semester_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT course_assignments_year_level_check CHECK (((year_level >= 1) AND (year_level <= 5)))
);


ALTER TABLE public.course_assignments OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16566)
-- Name: course_assignments_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_assignments_assignment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_assignments_assignment_id_seq OWNER TO postgres;

--
-- TOC entry 5377 (class 0 OID 0)
-- Dependencies: 231
-- Name: course_assignments_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_assignments_assignment_id_seq OWNED BY public.course_assignments.assignment_id;


--
-- TOC entry 224 (class 1259 OID 16485)
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    course_id integer NOT NULL,
    course_code character varying(20) NOT NULL,
    course_name character varying(100) NOT NULL
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16484)
-- Name: courses_course_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_course_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_course_id_seq OWNER TO postgres;

--
-- TOC entry 5378 (class 0 OID 0)
-- Dependencies: 223
-- Name: courses_course_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_course_id_seq OWNED BY public.courses.course_id;


--
-- TOC entry 220 (class 1259 OID 16455)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    dept_id integer NOT NULL,
    department_code character varying(20) NOT NULL,
    department_name character varying(100) NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16454)
-- Name: departments_dept_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_dept_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_dept_id_seq OWNER TO postgres;

--
-- TOC entry 5379 (class 0 OID 0)
-- Dependencies: 219
-- Name: departments_dept_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_dept_id_seq OWNED BY public.departments.dept_id;


--
-- TOC entry 248 (class 1259 OID 16788)
-- Name: exam_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_results (
    result_id integer NOT NULL,
    session_id integer NOT NULL,
    raw_score numeric(7,2) DEFAULT 0.00 NOT NULL,
    total_points numeric(7,2) DEFAULT 0.00 NOT NULL,
    percentage numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (total_points > (0)::numeric) THEN round(((raw_score / total_points) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    rank integer,
    score_released boolean DEFAULT false NOT NULL,
    email_sent boolean DEFAULT false NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone
);


ALTER TABLE public.exam_results OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16787)
-- Name: exam_results_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_results_result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_results_result_id_seq OWNER TO postgres;

--
-- TOC entry 5380 (class 0 OID 0)
-- Dependencies: 247
-- Name: exam_results_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_results_result_id_seq OWNED BY public.exam_results.result_id;


--
-- TOC entry 242 (class 1259 OID 16703)
-- Name: exam_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_sessions (
    session_id integer NOT NULL,
    exam_id integer NOT NULL,
    student_id integer NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    warning_count smallint DEFAULT 0 NOT NULL,
    auto_submitted boolean DEFAULT false NOT NULL,
    status public.session_status DEFAULT 'in_progress'::public.session_status NOT NULL
);


ALTER TABLE public.exam_sessions OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16702)
-- Name: exam_sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_sessions_session_id_seq OWNER TO postgres;

--
-- TOC entry 5381 (class 0 OID 0)
-- Dependencies: 241
-- Name: exam_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_sessions_session_id_seq OWNED BY public.exam_sessions.session_id;


--
-- TOC entry 236 (class 1259 OID 16623)
-- Name: exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exams (
    exam_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    access_code character varying(20) DEFAULT NULL::character varying,
    time_limit integer,
    status public.exam_status DEFAULT 'draft'::public.exam_status NOT NULL,
    shuffle_questions boolean DEFAULT false NOT NULL,
    shuffle_choices boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    class_id integer,
    password text
);


ALTER TABLE public.exams OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16622)
-- Name: exams_exam_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exams_exam_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exams_exam_id_seq OWNER TO postgres;

--
-- TOC entry 5382 (class 0 OID 0)
-- Dependencies: 235
-- Name: exams_exam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exams_exam_id_seq OWNED BY public.exams.exam_id;


--
-- TOC entry 228 (class 1259 OID 16517)
-- Name: faculty; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculty (
    faculty_id integer NOT NULL,
    uid integer NOT NULL,
    dept_id integer NOT NULL
);


ALTER TABLE public.faculty OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16516)
-- Name: faculty_faculty_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faculty_faculty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faculty_faculty_id_seq OWNER TO postgres;

--
-- TOC entry 5383 (class 0 OID 0)
-- Dependencies: 227
-- Name: faculty_faculty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_faculty_id_seq OWNED BY public.faculty.faculty_id;


--
-- TOC entry 256 (class 1259 OID 17220)
-- Name: institution_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.institution_members (
    member_id integer NOT NULL,
    institution_id integer NOT NULL,
    uid integer NOT NULL,
    role public.institution_user_role NOT NULL,
    school_id character varying(50) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    year_level text,
    section text,
    is_pending boolean DEFAULT false
);


ALTER TABLE public.institution_members OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 17219)
-- Name: institution_members_member_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.institution_members_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.institution_members_member_id_seq OWNER TO postgres;

--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 255
-- Name: institution_members_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institution_members_member_id_seq OWNED BY public.institution_members.member_id;


--
-- TOC entry 254 (class 1259 OID 17184)
-- Name: institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.institutions (
    institution_id integer NOT NULL,
    institution_name character varying(100) NOT NULL,
    acronym character varying(20) NOT NULL,
    logo text,
    theme_id integer DEFAULT 1 NOT NULL,
    max_warnings smallint DEFAULT 3 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.institutions OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 17183)
-- Name: institutions_institution_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.institutions_institution_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.institutions_institution_id_seq OWNER TO postgres;

--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 253
-- Name: institutions_institution_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institutions_institution_id_seq OWNED BY public.institutions.institution_id;


--
-- TOC entry 222 (class 1259 OID 16467)
-- Name: programs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.programs (
    program_id integer NOT NULL,
    program_code character varying(20) NOT NULL,
    program_name character varying(100) NOT NULL,
    dept_id integer NOT NULL
);


ALTER TABLE public.programs OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16466)
-- Name: programs_program_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.programs_program_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.programs_program_id_seq OWNER TO postgres;

--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 221
-- Name: programs_program_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programs_program_id_seq OWNED BY public.programs.program_id;


--
-- TOC entry 238 (class 1259 OID 16660)
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    question_id integer NOT NULL,
    exam_id integer NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type NOT NULL,
    points numeric(5,2) DEFAULT 1.00 NOT NULL,
    order_num integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16659)
-- Name: questions_question_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_question_id_seq OWNER TO postgres;

--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 237
-- Name: questions_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_question_id_seq OWNED BY public.questions.question_id;


--
-- TOC entry 250 (class 1259 OID 16815)
-- Name: report_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_logs (
    report_log_id integer NOT NULL,
    exam_id integer NOT NULL,
    generated_by integer NOT NULL,
    report_type public.report_type NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_logs OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16814)
-- Name: report_logs_report_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_logs_report_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_logs_report_log_id_seq OWNER TO postgres;

--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 249
-- Name: report_logs_report_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_logs_report_log_id_seq OWNED BY public.report_logs.report_log_id;


--
-- TOC entry 244 (class 1259 OID 16733)
-- Name: student_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_answers (
    answer_id integer NOT NULL,
    session_id integer NOT NULL,
    question_id integer NOT NULL,
    choice_id integer,
    answer_text text,
    is_correct boolean,
    manually_checked boolean DEFAULT false NOT NULL,
    checked_by integer,
    checked_at timestamp with time zone
);


ALTER TABLE public.student_answers OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16732)
-- Name: student_answers_answer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_answers_answer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_answers_answer_id_seq OWNER TO postgres;

--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 243
-- Name: student_answers_answer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_answers_answer_id_seq OWNED BY public.student_answers.answer_id;


--
-- TOC entry 230 (class 1259 OID 16539)
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    student_id integer NOT NULL,
    uid integer NOT NULL,
    student_number character varying(20) NOT NULL,
    program_id integer NOT NULL,
    year_level smallint NOT NULL,
    section character varying(20) DEFAULT NULL::character varying,
    CONSTRAINT students_year_level_check CHECK (((year_level >= 1) AND (year_level <= 5)))
);


ALTER TABLE public.students OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16538)
-- Name: students_student_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_student_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_student_id_seq OWNER TO postgres;

--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 229
-- Name: students_student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_student_id_seq OWNED BY public.students.student_id;


--
-- TOC entry 234 (class 1259 OID 16602)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    setting_id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    updated_by integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16601)
-- Name: system_settings_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_setting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_setting_id_seq OWNER TO postgres;

--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 233
-- Name: system_settings_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_setting_id_seq OWNED BY public.system_settings.setting_id;


--
-- TOC entry 252 (class 1259 OID 17170)
-- Name: themes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.themes (
    theme_id integer NOT NULL,
    theme_name character varying(50) NOT NULL,
    primary_color character varying(7) NOT NULL,
    secondary_color character varying(7) NOT NULL,
    base_color character varying(7) NOT NULL
);


ALTER TABLE public.themes OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 17169)
-- Name: themes_theme_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.themes_theme_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.themes_theme_id_seq OWNER TO postgres;

--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 251
-- Name: themes_theme_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.themes_theme_id_seq OWNED BY public.themes.theme_id;


--
-- TOC entry 226 (class 1259 OID 16497)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    uid integer NOT NULL,
    first_name character varying(50) NOT NULL,
    middle_name character varying(50) DEFAULT NULL::character varying,
    last_name character varying(50) NOT NULL,
    suffix character varying(10) DEFAULT NULL::character varying,
    plp character varying(50) DEFAULT NULL::character varying,
    email character varying(100) NOT NULL,
    password character varying(255),
    google_sub character varying(255),
    avatar_url text,
    is_super_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16496)
-- Name: users_uid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_uid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_uid_seq OWNER TO postgres;

--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_uid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_uid_seq OWNED BY public.users.uid;


--
-- TOC entry 5019 (class 2604 OID 16772)
-- Name: cheating_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cheating_logs ALTER COLUMN log_id SET DEFAULT nextval('public.cheating_logs_log_id_seq'::regclass);


--
-- TOC entry 5009 (class 2604 OID 16685)
-- Name: choices choice_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices ALTER COLUMN choice_id SET DEFAULT nextval('public.choices_choice_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 17286)
-- Name: class_enrollments enrollment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments ALTER COLUMN enrollment_id SET DEFAULT nextval('public.class_enrollments_enrollment_id_seq'::regclass);


--
-- TOC entry 5042 (class 2604 OID 17251)
-- Name: classes class_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes ALTER COLUMN class_id SET DEFAULT nextval('public.classes_class_id_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 16570)
-- Name: course_assignments assignment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments ALTER COLUMN assignment_id SET DEFAULT nextval('public.course_assignments_assignment_id_seq'::regclass);


--
-- TOC entry 4984 (class 2604 OID 16488)
-- Name: courses course_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN course_id SET DEFAULT nextval('public.courses_course_id_seq'::regclass);


--
-- TOC entry 4982 (class 2604 OID 16458)
-- Name: departments dept_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN dept_id SET DEFAULT nextval('public.departments_dept_id_seq'::regclass);


--
-- TOC entry 5021 (class 2604 OID 16791)
-- Name: exam_results result_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results ALTER COLUMN result_id SET DEFAULT nextval('public.exam_results_result_id_seq'::regclass);


--
-- TOC entry 5012 (class 2604 OID 16706)
-- Name: exam_sessions session_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions ALTER COLUMN session_id SET DEFAULT nextval('public.exam_sessions_session_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 16626)
-- Name: exams exam_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams ALTER COLUMN exam_id SET DEFAULT nextval('public.exams_exam_id_seq'::regclass);


--
-- TOC entry 4991 (class 2604 OID 16520)
-- Name: faculty faculty_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty ALTER COLUMN faculty_id SET DEFAULT nextval('public.faculty_faculty_id_seq'::regclass);


--
-- TOC entry 5037 (class 2604 OID 17223)
-- Name: institution_members member_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members ALTER COLUMN member_id SET DEFAULT nextval('public.institution_members_member_id_seq'::regclass);


--
-- TOC entry 5031 (class 2604 OID 17187)
-- Name: institutions institution_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions ALTER COLUMN institution_id SET DEFAULT nextval('public.institutions_institution_id_seq'::regclass);


--
-- TOC entry 4983 (class 2604 OID 16470)
-- Name: programs program_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs ALTER COLUMN program_id SET DEFAULT nextval('public.programs_program_id_seq'::regclass);


--
-- TOC entry 5006 (class 2604 OID 16663)
-- Name: questions question_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN question_id SET DEFAULT nextval('public.questions_question_id_seq'::regclass);


--
-- TOC entry 5028 (class 2604 OID 16818)
-- Name: report_logs report_log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs ALTER COLUMN report_log_id SET DEFAULT nextval('public.report_logs_report_log_id_seq'::regclass);


--
-- TOC entry 5017 (class 2604 OID 16736)
-- Name: student_answers answer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers ALTER COLUMN answer_id SET DEFAULT nextval('public.student_answers_answer_id_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 16542)
-- Name: students student_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN student_id SET DEFAULT nextval('public.students_student_id_seq'::regclass);


--
-- TOC entry 4996 (class 2604 OID 16605)
-- Name: system_settings setting_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN setting_id SET DEFAULT nextval('public.system_settings_setting_id_seq'::regclass);


--
-- TOC entry 5030 (class 2604 OID 17173)
-- Name: themes theme_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.themes ALTER COLUMN theme_id SET DEFAULT nextval('public.themes_theme_id_seq'::regclass);


--
-- TOC entry 4985 (class 2604 OID 16500)
-- Name: users uid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN uid SET DEFAULT nextval('public.users_uid_seq'::regclass);


--
-- TOC entry 5353 (class 0 OID 16769)
-- Dependencies: 246
-- Data for Name: cheating_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cheating_logs (log_id, session_id, event_type, occurred_at, details) FROM stdin;
\.


--
-- TOC entry 5347 (class 0 OID 16682)
-- Dependencies: 240
-- Data for Name: choices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.choices (choice_id, question_id, choice_text, is_correct, order_num) FROM stdin;
1	1	asdas	t	1
2	1	dasdasd	f	2
3	1	asdasd	f	3
4	1	asdasdasd	f	4
5	2	asdasdsad	t	1
6	3	asdasdasd	t	1
7	4	asdasdasd	t	1
8	5	asdasdasd	t	1
9	6	asdasdasd	t	1
10	7	asdasd	t	1
11	8	asdasdasdasd	t	1
12	9	asdasdasd	t	1
13	10	asdasdasd	t	1
14	11	asdasdasd	t	1
15	12	asdasdasd	t	1
16	13	asdasdsd	t	1
\.


--
-- TOC entry 5367 (class 0 OID 17283)
-- Dependencies: 260
-- Data for Name: class_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_enrollments (enrollment_id, class_id, member_id, enrolled_at) FROM stdin;
1	1	999	2026-05-22 04:32:10.048+08
2	2	999	2026-05-22 05:23:41.951+08
\.


--
-- TOC entry 5365 (class 0 OID 17248)
-- Dependencies: 258
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classes (class_id, institution_id, member_id, class_name, description, school_year, semester, access_code, is_active, created_at, updated_at) FROM stdin;
1	1	888	Information Assurance and Security	\N	2024-2025	1st	PLP-DEFAULT	t	2026-05-22 04:30:10.809+08	2026-05-22 04:30:10.809+08
2	1	888	HEY TEST	\N	2025-2026	1st	SXMKB363	t	2026-05-22 05:16:32.733+08	2026-05-22 05:16:32.733+08
3	1	2	TESTING	\N	2025-2026	1st	56SN7DFH	t	2026-05-22 05:16:44.69+08	2026-05-22 05:16:44.69+08
4	1	888	TESTING	\N	2025-2026	1st	2AVL5RDS	t	2026-05-22 05:16:57.865+08	2026-05-22 05:16:57.865+08
\.


--
-- TOC entry 5339 (class 0 OID 16567)
-- Dependencies: 232
-- Data for Name: course_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_assignments (assignment_id, course_id, faculty_id, program_id, year_level, section, school_year, semester, is_active) FROM stdin;
\.


--
-- TOC entry 5331 (class 0 OID 16485)
-- Dependencies: 224
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (course_id, course_code, course_name) FROM stdin;
\.


--
-- TOC entry 5327 (class 0 OID 16455)
-- Dependencies: 220
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (dept_id, department_code, department_name) FROM stdin;
\.


--
-- TOC entry 5355 (class 0 OID 16788)
-- Dependencies: 248
-- Data for Name: exam_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_results (result_id, session_id, raw_score, total_points, rank, score_released, email_sent, computed_at, released_at) FROM stdin;
\.


--
-- TOC entry 5349 (class 0 OID 16703)
-- Dependencies: 242
-- Data for Name: exam_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exam_sessions (session_id, exam_id, student_id, started_at, submitted_at, warning_count, auto_submitted, status) FROM stdin;
\.


--
-- TOC entry 5343 (class 0 OID 16623)
-- Dependencies: 236
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exams (exam_id, title, description, access_code, time_limit, status, shuffle_questions, shuffle_choices, is_archived, created_by, created_at, updated_at, class_id, password) FROM stdin;
3	asdasdasd	\N	\N	185	draft	f	f	f	888	2026-05-22 05:49:53.317+08	2026-05-22 05:49:53.317+08	2	\N
4	asdasdasd	\N	\N	185	draft	f	f	f	888	2026-05-22 05:50:19.276+08	2026-05-22 05:50:19.276+08	2	\N
1	asdasdasd	\N	\N	125	open	f	f	f	888	2026-05-22 05:48:51.83+08	2026-05-22 06:04:12.608+08	2	\N
5	asdasdasd	\N	\N	65	open	f	f	f	888	2026-05-22 05:56:51.586+08	2026-05-22 06:44:01.144+08	2	\N
6	a3123124124	\N	\N	60	open	f	f	f	888	2026-05-22 05:58:12.29+08	2026-05-22 06:47:44.371+08	2	\N
2	asdasdasdasd	\N	\N	185	waiting	f	f	f	888	2026-05-22 05:49:28.121+08	2026-05-22 07:21:17.859+08	2	\N
\.


--
-- TOC entry 5335 (class 0 OID 16517)
-- Dependencies: 228
-- Data for Name: faculty; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculty (faculty_id, uid, dept_id) FROM stdin;
\.


--
-- TOC entry 5363 (class 0 OID 17220)
-- Dependencies: 256
-- Data for Name: institution_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.institution_members (member_id, institution_id, uid, role, school_id, is_active, joined_at, year_level, section, is_pending) FROM stdin;
1	1	1	admin	23-47879	t	2026-05-22 03:54:50.949+08	\N	\N	f
888	1	888	faculty	23-45687	t	2026-05-22 04:30:10.808+08	\N	\N	f
2	1	2	faculty	19-45478	t	2026-05-22 04:50:18.806+08	\N	\N	f
999	1	999	student	23-01256	t	2026-05-22 04:30:10.792+08	1st Year	A	f
\.


--
-- TOC entry 5361 (class 0 OID 17184)
-- Dependencies: 254
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.institutions (institution_id, institution_name, acronym, logo, theme_id, max_warnings, is_active, created_by, created_at, updated_at) FROM stdin;
1	Pamantasan ng Lungsod ng Pasig	PLP	\N	1	3	t	1	2026-05-22 03:54:50.945+08	2026-05-22 18:42:01.394735+08
\.


--
-- TOC entry 5329 (class 0 OID 16467)
-- Dependencies: 222
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.programs (program_id, program_code, program_name, dept_id) FROM stdin;
\.


--
-- TOC entry 5345 (class 0 OID 16660)
-- Dependencies: 238
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (question_id, exam_id, question_text, question_type, points, order_num) FROM stdin;
1	1	qer1241q2r	mcq	1.00	1
2	1	asdadasd	identification	1.00	2
3	1	asdasdasd	identification	1.00	3
4	2	asdasdasd	identification	1.00	1
5	2	asdasdasdasd	identification	1.00	2
6	3	asdasda	identification	1.00	1
7	3	asdasdsad	identification	1.00	2
8	4	asdadasd	identification	1.00	1
9	4	asdasdasd	identification	1.00	2
10	5	asdasd	identification	1.00	1
11	5	asdasdasd	identification	1.00	2
12	6	asdasdasd	identification	1.00	1
13	6	asdasd	identification	1.00	2
\.


--
-- TOC entry 5357 (class 0 OID 16815)
-- Dependencies: 250
-- Data for Name: report_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_logs (report_log_id, exam_id, generated_by, report_type, generated_at) FROM stdin;
\.


--
-- TOC entry 5351 (class 0 OID 16733)
-- Dependencies: 244
-- Data for Name: student_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_answers (answer_id, session_id, question_id, choice_id, answer_text, is_correct, manually_checked, checked_by, checked_at) FROM stdin;
\.


--
-- TOC entry 5337 (class 0 OID 16539)
-- Dependencies: 230
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (student_id, uid, student_number, program_id, year_level, section) FROM stdin;
\.


--
-- TOC entry 5341 (class 0 OID 16602)
-- Dependencies: 234
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (setting_id, setting_key, setting_value, updated_by, updated_at) FROM stdin;
\.


--
-- TOC entry 5359 (class 0 OID 17170)
-- Dependencies: 252
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.themes (theme_id, theme_name, primary_color, secondary_color, base_color) FROM stdin;
1	Emerald	#16A34A	#DDEEE4	#FFFFFF
2	Ocean	#1D4ED8	#DBEAFE	#FFFFFF
3	Crimson	#B91C1C	#FEE2E2	#FFFFFF
4	Violet	#7C3AED	#EDE9FE	#FFFFFF
5	Amber	#D97706	#FEF3C7	#FFFFFF
6	Slate	#334155	#F1F5F9	#FFFFFF
\.


--
-- TOC entry 5333 (class 0 OID 16497)
-- Dependencies: 226
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (uid, first_name, middle_name, last_name, suffix, plp, email, password, google_sub, avatar_url, is_super_admin, created_at) FROM stdin;
1	PLP	\N	Administrator	\N	\N	admin@plpasig.edu.ph	$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa	\N	\N	f	2026-05-22 03:54:50.94+08
888	Demo	\N	Teacher	\N	\N	teacher@plpasig.edu.ph	$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa	\N	\N	f	2026-05-22 04:30:10.807+08
2	CARL AJ	MASIPAG AKO	JUNIO	\N	\N	junio_carlaj@plpasig.edu.ph	\N	107099310791384241180	https://lh3.googleusercontent.com/a/ACg8ocKFyGYFYm9JVeoHNvr6dqUn60_aUhsQUL1eBpwSnvzUh2qD_xM=s96-c	f	2026-05-22 04:50:18.806+08
999	Demo	\N	Student	\N	\N	student@plpasig.edu.ph	$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa	\N	\N	f	2026-05-22 04:30:10.788+08
\.


--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 245
-- Name: cheating_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cheating_logs_log_id_seq', 1, true);


--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 239
-- Name: choices_choice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.choices_choice_id_seq', 16, true);


--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 259
-- Name: class_enrollments_enrollment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_enrollments_enrollment_id_seq', 2, true);


--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 257
-- Name: classes_class_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classes_class_id_seq', 4, true);


--
-- TOC entry 5398 (class 0 OID 0)
-- Dependencies: 231
-- Name: course_assignments_assignment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_assignments_assignment_id_seq', 1, false);


--
-- TOC entry 5399 (class 0 OID 0)
-- Dependencies: 223
-- Name: courses_course_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_course_id_seq', 1, false);


--
-- TOC entry 5400 (class 0 OID 0)
-- Dependencies: 219
-- Name: departments_dept_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_dept_id_seq', 1, false);


--
-- TOC entry 5401 (class 0 OID 0)
-- Dependencies: 247
-- Name: exam_results_result_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_results_result_id_seq', 1, true);


--
-- TOC entry 5402 (class 0 OID 0)
-- Dependencies: 241
-- Name: exam_sessions_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_sessions_session_id_seq', 1, true);


--
-- TOC entry 5403 (class 0 OID 0)
-- Dependencies: 235
-- Name: exams_exam_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exams_exam_id_seq', 6, true);


--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 227
-- Name: faculty_faculty_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_faculty_id_seq', 1, false);


--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 255
-- Name: institution_members_member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institution_members_member_id_seq', 999, true);


--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 253
-- Name: institutions_institution_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institutions_institution_id_seq', 1, true);


--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 221
-- Name: programs_program_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programs_program_id_seq', 1, false);


--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 237
-- Name: questions_question_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_question_id_seq', 13, true);


--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 249
-- Name: report_logs_report_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_logs_report_log_id_seq', 1, true);


--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 243
-- Name: student_answers_answer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_answers_answer_id_seq', 1, true);


--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 229
-- Name: students_student_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_student_id_seq', 1, false);


--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 233
-- Name: system_settings_setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_setting_id_seq', 1, false);


--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 251
-- Name: themes_theme_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.themes_theme_id_seq', 6, true);


--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_uid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_uid_seq', 999, true);


--
-- TOC entry 5108 (class 2606 OID 16781)
-- Name: cheating_logs cheating_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cheating_logs
    ADD CONSTRAINT cheating_logs_pkey PRIMARY KEY (log_id);


--
-- TOC entry 5094 (class 2606 OID 16696)
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_pkey PRIMARY KEY (choice_id);


--
-- TOC entry 5140 (class 2606 OID 17295)
-- Name: class_enrollments class_enrollments_class_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_class_id_member_id_key UNIQUE (class_id, member_id);


--
-- TOC entry 5142 (class 2606 OID 17293)
-- Name: class_enrollments class_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- TOC entry 5134 (class 2606 OID 17270)
-- Name: classes classes_access_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_access_code_key UNIQUE (access_code);


--
-- TOC entry 5136 (class 2606 OID 17268)
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (class_id);


--
-- TOC entry 5080 (class 2606 OID 16585)
-- Name: course_assignments course_assignments_course_id_faculty_id_program_id_year_lev_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_course_id_faculty_id_program_id_year_lev_key UNIQUE (course_id, faculty_id, program_id, year_level, section, school_year, semester);


--
-- TOC entry 5082 (class 2606 OID 16583)
-- Name: course_assignments course_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_pkey PRIMARY KEY (assignment_id);


--
-- TOC entry 5059 (class 2606 OID 16495)
-- Name: courses courses_course_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_code_key UNIQUE (course_code);


--
-- TOC entry 5061 (class 2606 OID 16493)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (course_id);


--
-- TOC entry 5051 (class 2606 OID 16465)
-- Name: departments departments_department_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_department_code_key UNIQUE (department_code);


--
-- TOC entry 5053 (class 2606 OID 16463)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (dept_id);


--
-- TOC entry 5112 (class 2606 OID 16806)
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (result_id);


--
-- TOC entry 5114 (class 2606 OID 16808)
-- Name: exam_results exam_results_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_session_id_key UNIQUE (session_id);


--
-- TOC entry 5096 (class 2606 OID 16721)
-- Name: exam_sessions exam_sessions_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_student_id_key UNIQUE (exam_id, student_id);


--
-- TOC entry 5098 (class 2606 OID 16719)
-- Name: exam_sessions exam_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 5088 (class 2606 OID 16647)
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (exam_id);


--
-- TOC entry 5070 (class 2606 OID 16525)
-- Name: faculty faculty_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_pkey PRIMARY KEY (faculty_id);


--
-- TOC entry 5072 (class 2606 OID 16527)
-- Name: faculty faculty_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_uid_key UNIQUE (uid);


--
-- TOC entry 5130 (class 2606 OID 17236)
-- Name: institution_members institution_members_institution_id_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_institution_id_uid_key UNIQUE (institution_id, uid);


--
-- TOC entry 5132 (class 2606 OID 17234)
-- Name: institution_members institution_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_pkey PRIMARY KEY (member_id);


--
-- TOC entry 5124 (class 2606 OID 17207)
-- Name: institutions institutions_acronym_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_acronym_key UNIQUE (acronym);


--
-- TOC entry 5126 (class 2606 OID 17205)
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (institution_id);


--
-- TOC entry 5055 (class 2606 OID 16476)
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (program_id);


--
-- TOC entry 5057 (class 2606 OID 16478)
-- Name: programs programs_program_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_program_code_key UNIQUE (program_code);


--
-- TOC entry 5092 (class 2606 OID 16675)
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- TOC entry 5118 (class 2606 OID 16826)
-- Name: report_logs report_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_pkey PRIMARY KEY (report_log_id);


--
-- TOC entry 5104 (class 2606 OID 16745)
-- Name: student_answers student_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_pkey PRIMARY KEY (answer_id);


--
-- TOC entry 5106 (class 2606 OID 16747)
-- Name: student_answers student_answers_session_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_session_id_question_id_key UNIQUE (session_id, question_id);


--
-- TOC entry 5074 (class 2606 OID 16551)
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- TOC entry 5076 (class 2606 OID 16555)
-- Name: students students_student_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_number_key UNIQUE (student_number);


--
-- TOC entry 5078 (class 2606 OID 16553)
-- Name: students students_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_uid_key UNIQUE (uid);


--
-- TOC entry 5084 (class 2606 OID 16613)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 5086 (class 2606 OID 16615)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 5120 (class 2606 OID 17180)
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (theme_id);


--
-- TOC entry 5122 (class 2606 OID 17182)
-- Name: themes themes_theme_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_theme_name_key UNIQUE (theme_name);


--
-- TOC entry 5064 (class 2606 OID 16515)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5066 (class 2606 OID 16848)
-- Name: users users_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);


--
-- TOC entry 5068 (class 2606 OID 16513)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uid);


--
-- TOC entry 5101 (class 1259 OID 17314)
-- Name: idx_answers_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_question ON public.student_answers USING btree (question_id);


--
-- TOC entry 5102 (class 1259 OID 16841)
-- Name: idx_answers_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_session ON public.student_answers USING btree (session_id);


--
-- TOC entry 5109 (class 1259 OID 16843)
-- Name: idx_cheat_occurred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cheat_occurred ON public.cheating_logs USING btree (session_id, occurred_at);


--
-- TOC entry 5110 (class 1259 OID 16842)
-- Name: idx_cheat_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cheat_session ON public.cheating_logs USING btree (session_id);


--
-- TOC entry 5137 (class 1259 OID 17310)
-- Name: idx_classes_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_institution ON public.classes USING btree (institution_id);


--
-- TOC entry 5138 (class 1259 OID 17311)
-- Name: idx_classes_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_member ON public.classes USING btree (member_id);


--
-- TOC entry 5143 (class 1259 OID 17312)
-- Name: idx_enrollments_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_class ON public.class_enrollments USING btree (class_id);


--
-- TOC entry 5144 (class 1259 OID 17313)
-- Name: idx_enrollments_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_member ON public.class_enrollments USING btree (member_id);


--
-- TOC entry 5089 (class 1259 OID 16838)
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exams_status ON public.exams USING btree (status, is_archived);


--
-- TOC entry 5127 (class 1259 OID 17308)
-- Name: idx_members_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_institution ON public.institution_members USING btree (institution_id);


--
-- TOC entry 5128 (class 1259 OID 17309)
-- Name: idx_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_user ON public.institution_members USING btree (uid);


--
-- TOC entry 5090 (class 1259 OID 17315)
-- Name: idx_questions_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_exam ON public.questions USING btree (exam_id);


--
-- TOC entry 5116 (class 1259 OID 16845)
-- Name: idx_report_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exam ON public.report_logs USING btree (exam_id);


--
-- TOC entry 5115 (class 1259 OID 16844)
-- Name: idx_results_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_results_session ON public.exam_results USING btree (session_id);


--
-- TOC entry 5099 (class 1259 OID 16839)
-- Name: idx_sessions_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_exam ON public.exam_sessions USING btree (exam_id);


--
-- TOC entry 5100 (class 1259 OID 16840)
-- Name: idx_sessions_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_student ON public.exam_sessions USING btree (student_id);


--
-- TOC entry 5062 (class 1259 OID 16849)
-- Name: idx_users_google_sub; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_google_sub ON public.users USING btree (google_sub) WHERE (google_sub IS NOT NULL);


--
-- TOC entry 5178 (class 2620 OID 17422)
-- Name: classes trg_classes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5176 (class 2620 OID 17423)
-- Name: exams trg_exams_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5177 (class 2620 OID 17421)
-- Name: institutions trg_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5175 (class 2620 OID 16621)
-- Name: system_settings trg_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5163 (class 2606 OID 16782)
-- Name: cheating_logs cheating_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cheating_logs
    ADD CONSTRAINT cheating_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5156 (class 2606 OID 16697)
-- Name: choices choices_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE;


--
-- TOC entry 5173 (class 2606 OID 17296)
-- Name: class_enrollments class_enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id) ON DELETE CASCADE;


--
-- TOC entry 5174 (class 2606 OID 17301)
-- Name: class_enrollments class_enrollments_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.institution_members(member_id) ON DELETE CASCADE;


--
-- TOC entry 5171 (class 2606 OID 17271)
-- Name: classes classes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;


--
-- TOC entry 5172 (class 2606 OID 17276)
-- Name: classes classes_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.institution_members(member_id);


--
-- TOC entry 5150 (class 2606 OID 16586)
-- Name: course_assignments course_assignments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


--
-- TOC entry 5151 (class 2606 OID 16591)
-- Name: course_assignments course_assignments_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(faculty_id);


--
-- TOC entry 5152 (class 2606 OID 16596)
-- Name: course_assignments course_assignments_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(program_id);


--
-- TOC entry 5164 (class 2606 OID 16809)
-- Name: exam_results exam_results_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5157 (class 2606 OID 16722)
-- Name: exam_sessions exam_sessions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id);


--
-- TOC entry 5158 (class 2606 OID 16727)
-- Name: exam_sessions exam_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- TOC entry 5154 (class 2606 OID 16653)
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(uid);


--
-- TOC entry 5146 (class 2606 OID 16533)
-- Name: faculty faculty_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.departments(dept_id);


--
-- TOC entry 5147 (class 2606 OID 16528)
-- Name: faculty faculty_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 5169 (class 2606 OID 17237)
-- Name: institution_members institution_members_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;


--
-- TOC entry 5170 (class 2606 OID 17242)
-- Name: institution_members institution_members_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 5167 (class 2606 OID 17213)
-- Name: institutions institutions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(uid);


--
-- TOC entry 5168 (class 2606 OID 17208)
-- Name: institutions institutions_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(theme_id);


--
-- TOC entry 5145 (class 2606 OID 16479)
-- Name: programs programs_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.departments(dept_id);


--
-- TOC entry 5155 (class 2606 OID 16676)
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- TOC entry 5165 (class 2606 OID 16827)
-- Name: report_logs report_logs_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id);


--
-- TOC entry 5166 (class 2606 OID 16832)
-- Name: report_logs report_logs_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(uid);


--
-- TOC entry 5159 (class 2606 OID 16763)
-- Name: student_answers student_answers_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.users(uid) ON DELETE SET NULL;


--
-- TOC entry 5160 (class 2606 OID 16758)
-- Name: student_answers student_answers_choice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_choice_id_fkey FOREIGN KEY (choice_id) REFERENCES public.choices(choice_id) ON DELETE SET NULL;


--
-- TOC entry 5161 (class 2606 OID 16753)
-- Name: student_answers student_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(question_id);


--
-- TOC entry 5162 (class 2606 OID 16748)
-- Name: student_answers student_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5148 (class 2606 OID 16561)
-- Name: students students_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(program_id);


--
-- TOC entry 5149 (class 2606 OID 16556)
-- Name: students students_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 5153 (class 2606 OID 16616)
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(uid) ON DELETE SET NULL;


-- Completed on 2026-05-22 18:57:55

--
-- PostgreSQL database dump complete
--

\unrestrict Yn7HJjZ5aGyhUdetFfMbOq9YNV1MLkFmug53FvJK6PSiuFdu7pcudC5ftzZWKQT

