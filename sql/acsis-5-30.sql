--
-- PostgreSQL database dump
--

\restrict 6mMPKhisfcZMZ8RG95XxtGR8jqPrnbWlDcS9sYhURCmFdIYChssY6QdLYIpq5p8

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-30 06:21:36

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

ALTER TABLE IF EXISTS ONLY public.teaching_terms DROP CONSTRAINT IF EXISTS teaching_terms_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.teaching_terms DROP CONSTRAINT IF EXISTS teaching_terms_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_answers DROP CONSTRAINT IF EXISTS student_answers_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_answers DROP CONSTRAINT IF EXISTS student_answers_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_answers DROP CONSTRAINT IF EXISTS student_answers_choice_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_answers DROP CONSTRAINT IF EXISTS student_answers_checked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.report_logs DROP CONSTRAINT IF EXISTS report_logs_generated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.report_logs DROP CONSTRAINT IF EXISTS report_logs_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_section_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_dept_id_fkey;
ALTER TABLE IF EXISTS ONLY public.institutions DROP CONSTRAINT IF EXISTS institutions_theme_id_fkey;
ALTER TABLE IF EXISTS ONLY public.institutions DROP CONSTRAINT IF EXISTS institutions_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.institution_members DROP CONSTRAINT IF EXISTS institution_members_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.institution_members DROP CONSTRAINT IF EXISTS institution_members_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_dept_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exams DROP CONSTRAINT IF EXISTS exams_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_ticket_issued_by_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_sections DROP CONSTRAINT IF EXISTS exam_sections_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_results DROP CONSTRAINT IF EXISTS exam_results_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.email_verification_codes DROP CONSTRAINT IF EXISTS email_verification_codes_uid_fkey;
ALTER TABLE IF EXISTS ONLY public.course_assignments DROP CONSTRAINT IF EXISTS course_assignments_program_id_fkey;
ALTER TABLE IF EXISTS ONLY public.course_assignments DROP CONSTRAINT IF EXISTS course_assignments_faculty_id_fkey;
ALTER TABLE IF EXISTS ONLY public.course_assignments DROP CONSTRAINT IF EXISTS course_assignments_course_id_fkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_term_id_fkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_institution_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.choices DROP CONSTRAINT IF EXISTS choices_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cheating_logs DROP CONSTRAINT IF EXISTS cheating_logs_session_id_fkey;
DROP TRIGGER IF EXISTS trg_teaching_terms_updated_at ON public.teaching_terms;
DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
DROP TRIGGER IF EXISTS trg_institutions_updated_at ON public.institutions;
DROP TRIGGER IF EXISTS trg_exams_updated_at ON public.exams;
DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
DROP INDEX IF EXISTS public.idx_users_google_sub;
DROP INDEX IF EXISTS public.idx_teaching_terms_program;
DROP INDEX IF EXISTS public.idx_teaching_terms_member;
DROP INDEX IF EXISTS public.idx_students_institution_student_number;
DROP INDEX IF EXISTS public.idx_sessions_student;
DROP INDEX IF EXISTS public.idx_sessions_exam;
DROP INDEX IF EXISTS public.idx_results_session;
DROP INDEX IF EXISTS public.idx_report_exam;
DROP INDEX IF EXISTS public.idx_questions_section;
DROP INDEX IF EXISTS public.idx_questions_exam;
DROP INDEX IF EXISTS public.idx_members_user;
DROP INDEX IF EXISTS public.idx_members_institution;
DROP INDEX IF EXISTS public.idx_exams_status;
DROP INDEX IF EXISTS public.idx_exam_sections_exam;
DROP INDEX IF EXISTS public.idx_enrollments_member;
DROP INDEX IF EXISTS public.idx_enrollments_class;
DROP INDEX IF EXISTS public.idx_email_verification_uid_active;
DROP INDEX IF EXISTS public.idx_classes_term;
DROP INDEX IF EXISTS public.idx_classes_member;
DROP INDEX IF EXISTS public.idx_classes_institution;
DROP INDEX IF EXISTS public.idx_cheat_session;
DROP INDEX IF EXISTS public.idx_cheat_occurred;
DROP INDEX IF EXISTS public.idx_answers_session;
DROP INDEX IF EXISTS public.idx_answers_question;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_google_sub_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.themes DROP CONSTRAINT IF EXISTS themes_theme_name_key;
ALTER TABLE IF EXISTS ONLY public.themes DROP CONSTRAINT IF EXISTS themes_pkey;
ALTER TABLE IF EXISTS ONLY public.teaching_terms DROP CONSTRAINT IF EXISTS teaching_terms_pkey;
ALTER TABLE IF EXISTS ONLY public.teaching_terms DROP CONSTRAINT IF EXISTS teaching_terms_member_program_section_term_key;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_setting_key_key;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_pkey;
ALTER TABLE IF EXISTS ONLY public.students DROP CONSTRAINT IF EXISTS students_member_id_key;
ALTER TABLE IF EXISTS ONLY public.student_answers DROP CONSTRAINT IF EXISTS student_answers_session_id_question_id_key;
ALTER TABLE IF EXISTS ONLY public.student_answers DROP CONSTRAINT IF EXISTS student_answers_pkey;
ALTER TABLE IF EXISTS ONLY public.report_logs DROP CONSTRAINT IF EXISTS report_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_pkey;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_program_code_key;
ALTER TABLE IF EXISTS ONLY public.programs DROP CONSTRAINT IF EXISTS programs_pkey;
ALTER TABLE IF EXISTS ONLY public.institutions DROP CONSTRAINT IF EXISTS institutions_pkey;
ALTER TABLE IF EXISTS ONLY public.institutions DROP CONSTRAINT IF EXISTS institutions_acronym_key;
ALTER TABLE IF EXISTS ONLY public.institution_members DROP CONSTRAINT IF EXISTS institution_members_pkey;
ALTER TABLE IF EXISTS ONLY public.institution_members DROP CONSTRAINT IF EXISTS institution_members_institution_id_uid_key;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_uid_key;
ALTER TABLE IF EXISTS ONLY public.faculty DROP CONSTRAINT IF EXISTS faculty_pkey;
ALTER TABLE IF EXISTS ONLY public.exams DROP CONSTRAINT IF EXISTS exams_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_student_id_key;
ALTER TABLE IF EXISTS ONLY public.exam_sections DROP CONSTRAINT IF EXISTS exam_sections_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_results DROP CONSTRAINT IF EXISTS exam_results_session_id_key;
ALTER TABLE IF EXISTS ONLY public.exam_results DROP CONSTRAINT IF EXISTS exam_results_pkey;
ALTER TABLE IF EXISTS ONLY public.email_verification_codes DROP CONSTRAINT IF EXISTS email_verification_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_department_code_key;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_pkey;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_course_code_key;
ALTER TABLE IF EXISTS ONLY public.course_assignments DROP CONSTRAINT IF EXISTS course_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.course_assignments DROP CONSTRAINT IF EXISTS course_assignments_course_id_faculty_id_program_id_year_lev_key;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_pkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_access_code_key;
ALTER TABLE IF EXISTS ONLY public.class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_pkey;
ALTER TABLE IF EXISTS ONLY public.class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_class_id_member_id_key;
ALTER TABLE IF EXISTS ONLY public.choices DROP CONSTRAINT IF EXISTS choices_pkey;
ALTER TABLE IF EXISTS ONLY public.cheating_logs DROP CONSTRAINT IF EXISTS cheating_logs_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN uid DROP DEFAULT;
ALTER TABLE IF EXISTS public.themes ALTER COLUMN theme_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.teaching_terms ALTER COLUMN term_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_settings ALTER COLUMN setting_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.students ALTER COLUMN student_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.student_answers ALTER COLUMN answer_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.report_logs ALTER COLUMN report_log_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.questions ALTER COLUMN question_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.programs ALTER COLUMN program_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.institutions ALTER COLUMN institution_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.institution_members ALTER COLUMN member_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faculty ALTER COLUMN faculty_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exams ALTER COLUMN exam_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_sessions ALTER COLUMN session_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_sections ALTER COLUMN section_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_results ALTER COLUMN result_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_verification_codes ALTER COLUMN verification_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.departments ALTER COLUMN dept_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.courses ALTER COLUMN course_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.course_assignments ALTER COLUMN assignment_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.classes ALTER COLUMN class_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.class_enrollments ALTER COLUMN enrollment_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.choices ALTER COLUMN choice_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cheating_logs ALTER COLUMN log_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_uid_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.themes_theme_id_seq;
DROP TABLE IF EXISTS public.themes;
DROP SEQUENCE IF EXISTS public.teaching_terms_term_id_seq;
DROP TABLE IF EXISTS public.teaching_terms;
DROP SEQUENCE IF EXISTS public.system_settings_setting_id_seq;
DROP TABLE IF EXISTS public.system_settings;
DROP SEQUENCE IF EXISTS public.students_student_id_seq;
DROP TABLE IF EXISTS public.students;
DROP SEQUENCE IF EXISTS public.student_answers_answer_id_seq;
DROP TABLE IF EXISTS public.student_answers;
DROP SEQUENCE IF EXISTS public.report_logs_report_log_id_seq;
DROP TABLE IF EXISTS public.report_logs;
DROP SEQUENCE IF EXISTS public.questions_question_id_seq;
DROP TABLE IF EXISTS public.questions;
DROP SEQUENCE IF EXISTS public.programs_program_id_seq;
DROP TABLE IF EXISTS public.programs;
DROP SEQUENCE IF EXISTS public.institutions_institution_id_seq;
DROP TABLE IF EXISTS public.institutions;
DROP SEQUENCE IF EXISTS public.institution_members_member_id_seq;
DROP TABLE IF EXISTS public.institution_members;
DROP SEQUENCE IF EXISTS public.faculty_faculty_id_seq;
DROP TABLE IF EXISTS public.faculty;
DROP SEQUENCE IF EXISTS public.exams_exam_id_seq;
DROP TABLE IF EXISTS public.exams;
DROP SEQUENCE IF EXISTS public.exam_sessions_session_id_seq;
DROP TABLE IF EXISTS public.exam_sessions;
DROP SEQUENCE IF EXISTS public.exam_sections_section_id_seq;
DROP TABLE IF EXISTS public.exam_sections;
DROP SEQUENCE IF EXISTS public.exam_results_result_id_seq;
DROP TABLE IF EXISTS public.exam_results;
DROP SEQUENCE IF EXISTS public.email_verification_codes_verification_id_seq;
DROP TABLE IF EXISTS public.email_verification_codes;
DROP SEQUENCE IF EXISTS public.departments_dept_id_seq;
DROP TABLE IF EXISTS public.departments;
DROP SEQUENCE IF EXISTS public.courses_course_id_seq;
DROP TABLE IF EXISTS public.courses;
DROP SEQUENCE IF EXISTS public.course_assignments_assignment_id_seq;
DROP TABLE IF EXISTS public.course_assignments;
DROP SEQUENCE IF EXISTS public.classes_class_id_seq;
DROP TABLE IF EXISTS public.classes;
DROP SEQUENCE IF EXISTS public.class_enrollments_enrollment_id_seq;
DROP TABLE IF EXISTS public.class_enrollments;
DROP SEQUENCE IF EXISTS public.choices_choice_id_seq;
DROP TABLE IF EXISTS public.choices;
DROP SEQUENCE IF EXISTS public.cheating_logs_log_id_seq;
DROP TABLE IF EXISTS public.cheating_logs;
DROP FUNCTION IF EXISTS public.fn_set_updated_at();
DROP FUNCTION IF EXISTS public.acsis_safe_index(p_index_name text, p_table_name text, p_columns text[]);
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.session_status;
DROP TYPE IF EXISTS public.semester_type;
DROP TYPE IF EXISTS public.report_type;
DROP TYPE IF EXISTS public.question_type;
DROP TYPE IF EXISTS public.institution_user_role;
DROP TYPE IF EXISTS public.exam_status;
DROP TYPE IF EXISTS public.cheat_event;
--
-- TOC entry 916 (class 1247 OID 16432)
-- Name: cheat_event; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cheat_event AS ENUM (
    'alt_tab',
    'copy_attempt',
    'paste_attempt',
    'window_blur',
    'devtools_open',
    'other',
    'screenshot_attempt',
    'win_key'
);


ALTER TYPE public.cheat_event OWNER TO postgres;

--
-- TOC entry 907 (class 1247 OID 16406)
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
-- TOC entry 967 (class 1247 OID 17162)
-- Name: institution_user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.institution_user_role AS ENUM (
    'admin',
    'faculty',
    'student'
);


ALTER TYPE public.institution_user_role OWNER TO postgres;

--
-- TOC entry 910 (class 1247 OID 16416)
-- Name: question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type AS ENUM (
    'mcq',
    'identification',
    'true_false',
    'coding'
);


ALTER TYPE public.question_type OWNER TO postgres;

--
-- TOC entry 919 (class 1247 OID 16446)
-- Name: report_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_type AS ENUM (
    'class_results',
    'individual',
    'item_analysis'
);


ALTER TYPE public.report_type OWNER TO postgres;

--
-- TOC entry 904 (class 1247 OID 16398)
-- Name: semester_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.semester_type AS ENUM (
    '1st',
    '2nd',
    'Summer'
);


ALTER TYPE public.semester_type OWNER TO postgres;

--
-- TOC entry 913 (class 1247 OID 16424)
-- Name: session_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.session_status AS ENUM (
    'in_progress',
    'submitted',
    'expired'
);


ALTER TYPE public.session_status OWNER TO postgres;

--
-- TOC entry 901 (class 1247 OID 16390)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'faculty',
    'student'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 279 (class 1255 OID 17307)
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
-- TOC entry 267 (class 1255 OID 16453)
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
-- TOC entry 244 (class 1259 OID 16769)
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
-- TOC entry 243 (class 1259 OID 16768)
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
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 243
-- Name: cheating_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cheating_logs_log_id_seq OWNED BY public.cheating_logs.log_id;


--
-- TOC entry 238 (class 1259 OID 16682)
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
-- TOC entry 237 (class 1259 OID 16681)
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
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 237
-- Name: choices_choice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.choices_choice_id_seq OWNED BY public.choices.choice_id;


--
-- TOC entry 258 (class 1259 OID 17283)
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
-- TOC entry 257 (class 1259 OID 17282)
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
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 257
-- Name: class_enrollments_enrollment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_enrollments_enrollment_id_seq OWNED BY public.class_enrollments.enrollment_id;


--
-- TOC entry 256 (class 1259 OID 17248)
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    term_id integer,
    course_code character varying(20) NOT NULL,
    header_pattern character varying(20) DEFAULT 'grid'::character varying NOT NULL,
    header_color character varying(7) DEFAULT NULL::character varying,
    CONSTRAINT classes_header_pattern_check CHECK (((header_pattern)::text = ANY ((ARRAY['grid'::character varying, 'honeycomb'::character varying, 'diamond'::character varying, 'floral'::character varying, 'ruled'::character varying])::text[])))
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 17247)
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
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 255
-- Name: classes_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classes_class_id_seq OWNED BY public.classes.class_id;


--
-- TOC entry 230 (class 1259 OID 16567)
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
-- TOC entry 229 (class 1259 OID 16566)
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
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 229
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
-- TOC entry 5431 (class 0 OID 0)
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
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 219
-- Name: departments_dept_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_dept_id_seq OWNED BY public.departments.dept_id;


--
-- TOC entry 264 (class 1259 OID 18244)
-- Name: email_verification_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verification_codes (
    verification_id integer NOT NULL,
    uid integer NOT NULL,
    email character varying(255) NOT NULL,
    code_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_verification_codes OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 18243)
-- Name: email_verification_codes_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_verification_codes_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_verification_codes_verification_id_seq OWNER TO postgres;

--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 263
-- Name: email_verification_codes_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_verification_codes_verification_id_seq OWNED BY public.email_verification_codes.verification_id;


--
-- TOC entry 246 (class 1259 OID 16788)
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
-- TOC entry 245 (class 1259 OID 16787)
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
-- TOC entry 5434 (class 0 OID 0)
-- Dependencies: 245
-- Name: exam_results_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_results_result_id_seq OWNED BY public.exam_results.result_id;


--
-- TOC entry 266 (class 1259 OID 18274)
-- Name: exam_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_sections (
    section_id integer NOT NULL,
    exam_id integer NOT NULL,
    title character varying(200) DEFAULT ''::character varying NOT NULL,
    description text,
    order_num integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.exam_sections OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 18273)
-- Name: exam_sections_section_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_sections_section_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_sections_section_id_seq OWNER TO postgres;

--
-- TOC entry 5435 (class 0 OID 0)
-- Dependencies: 265
-- Name: exam_sections_section_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_sections_section_id_seq OWNED BY public.exam_sections.section_id;


--
-- TOC entry 240 (class 1259 OID 16703)
-- Name: exam_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_sessions (
    session_id integer NOT NULL,
    exam_id integer NOT NULL,
    member_id integer CONSTRAINT exam_sessions_student_id_not_null NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    warning_count smallint DEFAULT 0 NOT NULL,
    auto_submitted boolean DEFAULT false NOT NULL,
    status public.session_status DEFAULT 'in_progress'::public.session_status NOT NULL,
    ticket_issued_at timestamp with time zone,
    ticket_issued_by integer,
    question_order jsonb,
    choice_orders jsonb,
    locked_at timestamp with time zone,
    lock_reason character varying(32) DEFAULT NULL::character varying
);


ALTER TABLE public.exam_sessions OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16702)
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
-- TOC entry 5436 (class 0 OID 0)
-- Dependencies: 239
-- Name: exam_sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_sessions_session_id_seq OWNED BY public.exam_sessions.session_id;


--
-- TOC entry 234 (class 1259 OID 16623)
-- Name: exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exams (
    exam_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    status public.exam_status DEFAULT 'draft'::public.exam_status NOT NULL,
    shuffle_questions boolean DEFAULT false NOT NULL,
    shuffle_choices boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    class_id integer NOT NULL,
    password text,
    scheduled_start timestamp with time zone,
    scheduled_end timestamp with time zone,
    is_auto_publish boolean DEFAULT false
);


ALTER TABLE public.exams OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16622)
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
-- TOC entry 5437 (class 0 OID 0)
-- Dependencies: 233
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
-- TOC entry 5438 (class 0 OID 0)
-- Dependencies: 227
-- Name: faculty_faculty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faculty_faculty_id_seq OWNED BY public.faculty.faculty_id;


--
-- TOC entry 254 (class 1259 OID 17220)
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
    is_pending boolean DEFAULT false
);


ALTER TABLE public.institution_members OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 17219)
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
-- TOC entry 5439 (class 0 OID 0)
-- Dependencies: 253
-- Name: institution_members_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institution_members_member_id_seq OWNED BY public.institution_members.member_id;


--
-- TOC entry 252 (class 1259 OID 17184)
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
-- TOC entry 251 (class 1259 OID 17183)
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
-- TOC entry 5440 (class 0 OID 0)
-- Dependencies: 251
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
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 221
-- Name: programs_program_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.programs_program_id_seq OWNED BY public.programs.program_id;


--
-- TOC entry 236 (class 1259 OID 16660)
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    question_id integer NOT NULL,
    exam_id integer NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type NOT NULL,
    points numeric(5,2) DEFAULT 1.00 NOT NULL,
    order_num integer DEFAULT 0 NOT NULL,
    section_id integer,
    image_url text
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16659)
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
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 235
-- Name: questions_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_question_id_seq OWNED BY public.questions.question_id;


--
-- TOC entry 248 (class 1259 OID 16815)
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
-- TOC entry 247 (class 1259 OID 16814)
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
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 247
-- Name: report_logs_report_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_logs_report_log_id_seq OWNED BY public.report_logs.report_log_id;


--
-- TOC entry 242 (class 1259 OID 16733)
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
-- TOC entry 241 (class 1259 OID 16732)
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
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 241
-- Name: student_answers_answer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_answers_answer_id_seq OWNED BY public.student_answers.answer_id;


--
-- TOC entry 262 (class 1259 OID 18216)
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    student_id integer NOT NULL,
    member_id integer NOT NULL,
    institution_id integer NOT NULL,
    student_number character varying(50)
);


ALTER TABLE public.students OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 18215)
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
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 261
-- Name: students_student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_student_id_seq OWNED BY public.students.student_id;


--
-- TOC entry 232 (class 1259 OID 16602)
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
-- TOC entry 231 (class 1259 OID 16601)
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
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 231
-- Name: system_settings_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_setting_id_seq OWNED BY public.system_settings.setting_id;


--
-- TOC entry 260 (class 1259 OID 18180)
-- Name: teaching_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teaching_terms (
    term_id integer NOT NULL,
    institution_id integer NOT NULL,
    member_id integer NOT NULL,
    school_year character varying(10) NOT NULL,
    semester public.semester_type NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    program_code character varying(20) NOT NULL,
    section_code character varying(20) NOT NULL
);


ALTER TABLE public.teaching_terms OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 18179)
-- Name: teaching_terms_term_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teaching_terms_term_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teaching_terms_term_id_seq OWNER TO postgres;

--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 259
-- Name: teaching_terms_term_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teaching_terms_term_id_seq OWNED BY public.teaching_terms.term_id;


--
-- TOC entry 250 (class 1259 OID 17170)
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
-- TOC entry 249 (class 1259 OID 17169)
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
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 249
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
    created_at timestamp with time zone DEFAULT now(),
    password_reset_required boolean DEFAULT false NOT NULL
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
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_uid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_uid_seq OWNED BY public.users.uid;


--
-- TOC entry 5034 (class 2604 OID 16772)
-- Name: cheating_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cheating_logs ALTER COLUMN log_id SET DEFAULT nextval('public.cheating_logs_log_id_seq'::regclass);


--
-- TOC entry 5023 (class 2604 OID 16685)
-- Name: choices choice_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices ALTER COLUMN choice_id SET DEFAULT nextval('public.choices_choice_id_seq'::regclass);


--
-- TOC entry 5063 (class 2604 OID 17286)
-- Name: class_enrollments enrollment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments ALTER COLUMN enrollment_id SET DEFAULT nextval('public.class_enrollments_enrollment_id_seq'::regclass);


--
-- TOC entry 5057 (class 2604 OID 17251)
-- Name: classes class_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes ALTER COLUMN class_id SET DEFAULT nextval('public.classes_class_id_seq'::regclass);


--
-- TOC entry 5008 (class 2604 OID 16570)
-- Name: course_assignments assignment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments ALTER COLUMN assignment_id SET DEFAULT nextval('public.course_assignments_assignment_id_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 16488)
-- Name: courses course_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN course_id SET DEFAULT nextval('public.courses_course_id_seq'::regclass);


--
-- TOC entry 4997 (class 2604 OID 16458)
-- Name: departments dept_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN dept_id SET DEFAULT nextval('public.departments_dept_id_seq'::regclass);


--
-- TOC entry 5070 (class 2604 OID 18247)
-- Name: email_verification_codes verification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_codes ALTER COLUMN verification_id SET DEFAULT nextval('public.email_verification_codes_verification_id_seq'::regclass);


--
-- TOC entry 5036 (class 2604 OID 16791)
-- Name: exam_results result_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results ALTER COLUMN result_id SET DEFAULT nextval('public.exam_results_result_id_seq'::regclass);


--
-- TOC entry 5072 (class 2604 OID 18277)
-- Name: exam_sections section_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections ALTER COLUMN section_id SET DEFAULT nextval('public.exam_sections_section_id_seq'::regclass);


--
-- TOC entry 5026 (class 2604 OID 16706)
-- Name: exam_sessions session_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions ALTER COLUMN session_id SET DEFAULT nextval('public.exam_sessions_session_id_seq'::regclass);


--
-- TOC entry 5012 (class 2604 OID 16626)
-- Name: exams exam_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams ALTER COLUMN exam_id SET DEFAULT nextval('public.exams_exam_id_seq'::regclass);


--
-- TOC entry 5007 (class 2604 OID 16520)
-- Name: faculty faculty_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty ALTER COLUMN faculty_id SET DEFAULT nextval('public.faculty_faculty_id_seq'::regclass);


--
-- TOC entry 5052 (class 2604 OID 17223)
-- Name: institution_members member_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members ALTER COLUMN member_id SET DEFAULT nextval('public.institution_members_member_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 17187)
-- Name: institutions institution_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions ALTER COLUMN institution_id SET DEFAULT nextval('public.institutions_institution_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 16470)
-- Name: programs program_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs ALTER COLUMN program_id SET DEFAULT nextval('public.programs_program_id_seq'::regclass);


--
-- TOC entry 5020 (class 2604 OID 16663)
-- Name: questions question_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN question_id SET DEFAULT nextval('public.questions_question_id_seq'::regclass);


--
-- TOC entry 5043 (class 2604 OID 16818)
-- Name: report_logs report_log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs ALTER COLUMN report_log_id SET DEFAULT nextval('public.report_logs_report_log_id_seq'::regclass);


--
-- TOC entry 5032 (class 2604 OID 16736)
-- Name: student_answers answer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers ALTER COLUMN answer_id SET DEFAULT nextval('public.student_answers_answer_id_seq'::regclass);


--
-- TOC entry 5069 (class 2604 OID 18219)
-- Name: students student_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN student_id SET DEFAULT nextval('public.students_student_id_seq'::regclass);


--
-- TOC entry 5010 (class 2604 OID 16605)
-- Name: system_settings setting_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN setting_id SET DEFAULT nextval('public.system_settings_setting_id_seq'::regclass);


--
-- TOC entry 5065 (class 2604 OID 18183)
-- Name: teaching_terms term_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_terms ALTER COLUMN term_id SET DEFAULT nextval('public.teaching_terms_term_id_seq'::regclass);


--
-- TOC entry 5045 (class 2604 OID 17173)
-- Name: themes theme_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.themes ALTER COLUMN theme_id SET DEFAULT nextval('public.themes_theme_id_seq'::regclass);


--
-- TOC entry 5000 (class 2604 OID 16500)
-- Name: users uid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN uid SET DEFAULT nextval('public.users_uid_seq'::regclass);


--
-- TOC entry 5398 (class 0 OID 16769)
-- Dependencies: 244
-- Data for Name: cheating_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5392 (class 0 OID 16682)
-- Dependencies: 238
-- Data for Name: choices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.choices VALUES (1, 1, 'asdas', true, 1);
INSERT INTO public.choices VALUES (2, 1, 'dasdasd', false, 2);
INSERT INTO public.choices VALUES (3, 1, 'asdasd', false, 3);
INSERT INTO public.choices VALUES (4, 1, 'asdasdasd', false, 4);
INSERT INTO public.choices VALUES (5, 2, 'asdasdsad', true, 1);
INSERT INTO public.choices VALUES (6, 3, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (7, 4, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (8, 5, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (9, 6, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (10, 7, 'asdasd', true, 1);
INSERT INTO public.choices VALUES (11, 8, 'asdasdasdasd', true, 1);
INSERT INTO public.choices VALUES (12, 9, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (13, 10, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (14, 11, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (15, 12, 'asdasdasd', true, 1);
INSERT INTO public.choices VALUES (16, 13, 'asdasdsd', true, 1);
INSERT INTO public.choices VALUES (24, 18, '23', true, 1);
INSERT INTO public.choices VALUES (25, 19, 'adwadwa', true, 1);
INSERT INTO public.choices VALUES (99, 79, 'SELECT * from users;', true, 1);
INSERT INTO public.choices VALUES (100, 80, 'Jose Rizal', true, 1);
INSERT INTO public.choices VALUES (40, 34, 'SELECT * from users;', true, 1);
INSERT INTO public.choices VALUES (41, 35, 'Jose Rizal', true, 1);


--
-- TOC entry 5412 (class 0 OID 17283)
-- Dependencies: 258
-- Data for Name: class_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.class_enrollments VALUES (1, 1, 999, '2026-05-22 04:32:10.048+08');
INSERT INTO public.class_enrollments VALUES (9, 11, 1007, '2026-05-24 00:34:28.129832+08');


--
-- TOC entry 5410 (class 0 OID 17248)
-- Dependencies: 256
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.classes VALUES (3, 1, 2, 'TESTING', NULL, '2025-2026', '1st', '56SN7DFH', true, '2026-05-22 05:16:44.69+08', '2026-05-22 20:15:53.123332+08', 2, 'TESTING', 'grid', NULL);
INSERT INTO public.classes VALUES (7, 1, 2, 'Test Course', NULL, '2025-2026', '1st', '9D7LVADN', true, '2026-05-22 20:41:42.702188+08', '2026-05-22 20:41:42.702188+08', 2, 'IT 108', 'grid', NULL);
INSERT INTO public.classes VALUES (9, 1, 888, 'Another', NULL, '2024-2025', '1st', 'J4NYTAFV', false, '2026-05-22 20:43:33.484395+08', '2026-05-30 05:01:13.691608+08', 3, 'IT 110', 'grid', NULL);
INSERT INTO public.classes VALUES (12, 1, 888, 'Intro to Computing', NULL, '2024-2025', '1st', 'Q3SYH5HW', false, '2026-05-30 05:37:39.239959+08', '2026-05-30 05:38:10.107325+08', 3, 'COMP 101', 'grid', NULL);
INSERT INTO public.classes VALUES (10, 1, 888, 'Integ', NULL, '2024-2025', '1st', '6KRKGK5U', true, '2026-05-22 21:06:06.88361+08', '2026-05-30 05:40:51.650316+08', 3, 'IT  207', 'honeycomb', '#334155');
INSERT INTO public.classes VALUES (13, 1, 888, 'Intro to Computing', NULL, '2024-2025', '1st', 'MBF4XD43', true, '2026-05-30 05:38:18.483227+08', '2026-05-30 05:47:12.925914+08', 3, 'COMP 101', 'ruled', '#b52170');
INSERT INTO public.classes VALUES (1, 1, 888, 'Information Assurance and Security', NULL, '2024-2025', '1st', 'PLP-DEFAULT', true, '2026-05-22 04:30:10.809+08', '2026-05-30 06:03:50.430612+08', 3, 'IT 108', 'grid', '#0f766e');
INSERT INTO public.classes VALUES (11, 1, 888, 'InfoSec', NULL, '2025-2026', '1st', 'K7RE8GD4', true, '2026-05-23 16:09:54.174295+08', '2026-05-30 06:16:29.332362+08', 4, 'IT 108', 'honeycomb', '#b45309');


--
-- TOC entry 5384 (class 0 OID 16567)
-- Dependencies: 230
-- Data for Name: course_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5378 (class 0 OID 16485)
-- Dependencies: 224
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5374 (class 0 OID 16455)
-- Dependencies: 220
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5418 (class 0 OID 18244)
-- Dependencies: 264
-- Data for Name: email_verification_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.email_verification_codes VALUES (1, 1000, 'superadmin@acsis.dev', '$2b$10$JGatffM6R1JmH9Lvwj6leOcgV8M2Wn3UxNjyia9JTbxHrginIKO5m', '2026-05-23 03:14:35.666+08', NULL, '2026-05-23 02:59:35.672889+08');


--
-- TOC entry 5400 (class 0 OID 16788)
-- Dependencies: 246
-- Data for Name: exam_results; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5420 (class 0 OID 18274)
-- Dependencies: 266
-- Data for Name: exam_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.exam_sections VALUES (9, 14, 'Set 1', NULL, 1);
INSERT INTO public.exam_sections VALUES (36, 19, 'Set 1', NULL, 1);


--
-- TOC entry 5394 (class 0 OID 16703)
-- Dependencies: 240
-- Data for Name: exam_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5388 (class 0 OID 16623)
-- Dependencies: 234
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.exams VALUES (3, 'asdasdasd', NULL, 'draft', false, false, false, 888, '2026-05-22 05:49:53.317+08', '2026-05-23 01:57:21.176495+08', 2, NULL, NULL, NULL, false);
INSERT INTO public.exams VALUES (4, 'asdasdasd', NULL, 'draft', false, false, false, 888, '2026-05-22 05:50:19.276+08', '2026-05-23 01:57:21.176495+08', 2, NULL, NULL, NULL, false);
INSERT INTO public.exams VALUES (1, 'asdasdasd', NULL, 'open', false, false, false, 888, '2026-05-22 05:48:51.83+08', '2026-05-23 01:57:21.176495+08', 2, NULL, NULL, NULL, false);
INSERT INTO public.exams VALUES (5, 'asdasdasd', NULL, 'open', false, false, false, 888, '2026-05-22 05:56:51.586+08', '2026-05-23 01:57:21.176495+08', 2, NULL, NULL, NULL, false);
INSERT INTO public.exams VALUES (6, 'a3123124124', NULL, 'open', false, false, false, 888, '2026-05-22 05:58:12.29+08', '2026-05-23 01:57:21.176495+08', 2, NULL, NULL, NULL, false);
INSERT INTO public.exams VALUES (2, 'asdasdasdasd', NULL, 'waiting', false, false, false, 888, '2026-05-22 05:49:28.121+08', '2026-05-23 01:57:21.176495+08', 2, NULL, NULL, NULL, false);
INSERT INTO public.exams VALUES (9, 'Quiz1', NULL, 'closed', false, false, false, 888, '2026-05-23 01:58:21.24055+08', '2026-05-24 00:44:45.544871+08', 1, 'CJC3P9', NULL, NULL, false);
INSERT INTO public.exams VALUES (19, 'Copy of Quiz1', NULL, 'closed', false, true, false, 888, '2026-05-29 10:28:46.906721+08', '2026-05-30 06:19:47.253567+08', 1, '2E6QV4', '2026-05-29 10:28:29.886+08', NULL, false);
INSERT INTO public.exams VALUES (14, 'Quiz1', NULL, 'waiting', false, true, false, 888, '2026-05-24 22:22:49.656455+08', '2026-05-30 06:19:47.25924+08', 11, 'OK', NULL, NULL, false);


--
-- TOC entry 5382 (class 0 OID 16517)
-- Dependencies: 228
-- Data for Name: faculty; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5408 (class 0 OID 17220)
-- Dependencies: 254
-- Data for Name: institution_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.institution_members VALUES (1, 1, 1, 'admin', '23-47879', true, '2026-05-22 03:54:50.949+08', false);
INSERT INTO public.institution_members VALUES (888, 1, 888, 'faculty', '23-45687', true, '2026-05-22 04:30:10.808+08', false);
INSERT INTO public.institution_members VALUES (2, 1, 2, 'faculty', '19-45478', true, '2026-05-22 04:50:18.806+08', false);
INSERT INTO public.institution_members VALUES (999, 1, 999, 'student', NULL, true, '2026-05-22 04:30:10.792+08', false);
INSERT INTO public.institution_members VALUES (1007, 1, 1010, 'student', NULL, true, '2026-05-24 00:34:28.110563+08', false);


--
-- TOC entry 5406 (class 0 OID 17184)
-- Dependencies: 252
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.institutions VALUES (1, 'Pamantasan ng Lungsod ng Pasig', 'PLP', 'data:image/png;base64,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', 1, 3, true, 1, '2026-05-22 03:54:50.945+08', '2026-05-30 04:33:56.4554+08');


--
-- TOC entry 5376 (class 0 OID 16467)
-- Dependencies: 222
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5390 (class 0 OID 16660)
-- Dependencies: 236
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.questions VALUES (1, 1, 'qer1241q2r', 'mcq', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (2, 1, 'asdadasd', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (3, 1, 'asdasdasd', 'identification', 1.00, 3, NULL, NULL);
INSERT INTO public.questions VALUES (4, 2, 'asdasdasd', 'identification', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (5, 2, 'asdasdasdasd', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (6, 3, 'asdasda', 'identification', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (7, 3, 'asdasdsad', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (8, 4, 'asdadasd', 'identification', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (9, 4, 'asdasdasd', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (10, 5, 'asdasd', 'identification', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (11, 5, 'asdasdasd', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (12, 6, 'asdasdasd', 'identification', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (13, 6, 'asdasd', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (79, 19, 'Ano ka ngarod', 'identification', 1.00, 1, 36, NULL);
INSERT INTO public.questions VALUES (80, 19, 'Sino c RPJ', 'identification', 1.00, 2, 36, NULL);
INSERT INTO public.questions VALUES (18, 9, '2323', 'identification', 1.00, 1, NULL, NULL);
INSERT INTO public.questions VALUES (19, 9, 'awdawdw', 'identification', 1.00, 2, NULL, NULL);
INSERT INTO public.questions VALUES (34, 14, 'Ano ka ngarod', 'identification', 1.00, 1, 9, NULL);
INSERT INTO public.questions VALUES (35, 14, 'Sino c RPJ', 'identification', 1.00, 2, 9, NULL);


--
-- TOC entry 5402 (class 0 OID 16815)
-- Dependencies: 248
-- Data for Name: report_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5396 (class 0 OID 16733)
-- Dependencies: 242
-- Data for Name: student_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5416 (class 0 OID 18216)
-- Dependencies: 262
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.students VALUES (1, 999, 1, '23-01256');
INSERT INTO public.students VALUES (16, 1007, 1, '23-00157');


--
-- TOC entry 5386 (class 0 OID 16602)
-- Dependencies: 232
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5414 (class 0 OID 18180)
-- Dependencies: 260
-- Data for Name: teaching_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.teaching_terms VALUES (2, 1, 2, '2025-2026', '1st', false, '2026-05-22 19:35:47.711456+08', '2026-05-22 20:15:53.123332+08', 'BSIT', '3D');
INSERT INTO public.teaching_terms VALUES (3, 1, 888, '2024-2025', '1st', false, '2026-05-22 19:35:47.711456+08', '2026-05-22 20:15:53.123332+08', 'BSIT', '3D');
INSERT INTO public.teaching_terms VALUES (4, 1, 888, '2025-2026', '1st', false, '2026-05-23 00:17:43.11482+08', '2026-05-23 14:50:16.219056+08', 'BSIT', '3E');
INSERT INTO public.teaching_terms VALUES (6, 1, 888, '2025-2026', '1st', true, '2026-05-30 05:22:39.020264+08', '2026-05-30 05:22:48.081476+08', 'BSIT', '3C');


--
-- TOC entry 5404 (class 0 OID 17170)
-- Dependencies: 250
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.themes VALUES (1, 'Emerald', '#16A34A', '#DDEEE4', '#FFFFFF');
INSERT INTO public.themes VALUES (2, 'Ocean', '#1D4ED8', '#DBEAFE', '#FFFFFF');
INSERT INTO public.themes VALUES (3, 'Crimson', '#B91C1C', '#FEE2E2', '#FFFFFF');
INSERT INTO public.themes VALUES (4, 'Violet', '#7C3AED', '#EDE9FE', '#FFFFFF');
INSERT INTO public.themes VALUES (5, 'Amber', '#D97706', '#FEF3C7', '#FFFFFF');
INSERT INTO public.themes VALUES (6, 'Slate', '#334155', '#F1F5F9', '#FFFFFF');


--
-- TOC entry 5380 (class 0 OID 16497)
-- Dependencies: 226
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (1, 'PLP', NULL, 'Administrator', NULL, NULL, 'admin@plpasig.edu.ph', '$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa', NULL, NULL, false, '2026-05-22 03:54:50.94+08', false);
INSERT INTO public.users VALUES (888, 'Demo', NULL, 'Teacher', NULL, NULL, 'teacher@plpasig.edu.ph', '$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa', NULL, NULL, false, '2026-05-22 04:30:10.807+08', false);
INSERT INTO public.users VALUES (2, 'CARL AJ', 'MASIPAG AKO', 'JUNIO', NULL, NULL, 'junio_carlaj@plpasig.edu.ph', NULL, '107099310791384241180', 'https://lh3.googleusercontent.com/a/ACg8ocKFyGYFYm9JVeoHNvr6dqUn60_aUhsQUL1eBpwSnvzUh2qD_xM=s96-c', false, '2026-05-22 04:50:18.806+08', false);
INSERT INTO public.users VALUES (999, 'Demo', NULL, 'Student', NULL, NULL, 'student@plpasig.edu.ph', '$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa', NULL, NULL, false, '2026-05-22 04:30:10.788+08', false);
INSERT INTO public.users VALUES (1010, 'RICHELLE DOROTHY', NULL, 'BENITEZ', NULL, NULL, 'benitez_richelledorothy@plpasig.edu.ph', '', '109936860963595421786', 'https://lh3.googleusercontent.com/a/ACg8ocISjE0HfBBm764qkuqfsiY-I6nXdTLrNQO_uJgdVvXXGO9OqwAx=s96-c', false, '2026-05-24 00:34:17.736594+08', false);
INSERT INTO public.users VALUES (1000, 'ACSIS', NULL, 'Super Admin', NULL, NULL, 'superadmin@acsis.dev', '$2b$12$7Yygm3qVU/NYSDAGXiiw2eotRqQwqNeJoxIijtLPnGO9dXTPH/Mqi', NULL, NULL, true, '2026-05-22 19:35:08.913225+08', false);


--
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 243
-- Name: cheating_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cheating_logs_log_id_seq', 14, true);


--
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 237
-- Name: choices_choice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.choices_choice_id_seq', 100, true);


--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 257
-- Name: class_enrollments_enrollment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_enrollments_enrollment_id_seq', 9, true);


--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 255
-- Name: classes_class_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classes_class_id_seq', 13, true);


--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 229
-- Name: course_assignments_assignment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_assignments_assignment_id_seq', 1, false);


--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 223
-- Name: courses_course_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_course_id_seq', 1, false);


--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 219
-- Name: departments_dept_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_dept_id_seq', 1, false);


--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 263
-- Name: email_verification_codes_verification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_verification_codes_verification_id_seq', 3, true);


--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 245
-- Name: exam_results_result_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_results_result_id_seq', 11, true);


--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 265
-- Name: exam_sections_section_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_sections_section_id_seq', 36, true);


--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 239
-- Name: exam_sessions_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exam_sessions_session_id_seq', 11, true);


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 233
-- Name: exams_exam_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exams_exam_id_seq', 19, true);


--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 227
-- Name: faculty_faculty_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faculty_faculty_id_seq', 1, false);


--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 253
-- Name: institution_members_member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institution_members_member_id_seq', 1007, true);


--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 251
-- Name: institutions_institution_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institutions_institution_id_seq', 1, true);


--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 221
-- Name: programs_program_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.programs_program_id_seq', 1, false);


--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 235
-- Name: questions_question_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_question_id_seq', 80, true);


--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 247
-- Name: report_logs_report_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.report_logs_report_log_id_seq', 1, true);


--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 241
-- Name: student_answers_answer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_answers_answer_id_seq', 13, true);


--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 261
-- Name: students_student_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_student_id_seq', 17, true);


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 231
-- Name: system_settings_setting_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_setting_id_seq', 1, false);


--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 259
-- Name: teaching_terms_term_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.teaching_terms_term_id_seq', 6, true);


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 249
-- Name: themes_theme_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.themes_theme_id_seq', 6, true);


--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_uid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_uid_seq', 1010, true);


--
-- TOC entry 5130 (class 2606 OID 16781)
-- Name: cheating_logs cheating_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cheating_logs
    ADD CONSTRAINT cheating_logs_pkey PRIMARY KEY (log_id);


--
-- TOC entry 5116 (class 2606 OID 16696)
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_pkey PRIMARY KEY (choice_id);


--
-- TOC entry 5163 (class 2606 OID 17295)
-- Name: class_enrollments class_enrollments_class_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_class_id_member_id_key UNIQUE (class_id, member_id);


--
-- TOC entry 5165 (class 2606 OID 17293)
-- Name: class_enrollments class_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- TOC entry 5156 (class 2606 OID 17270)
-- Name: classes classes_access_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_access_code_key UNIQUE (access_code);


--
-- TOC entry 5158 (class 2606 OID 17268)
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (class_id);


--
-- TOC entry 5101 (class 2606 OID 16585)
-- Name: course_assignments course_assignments_course_id_faculty_id_program_id_year_lev_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_course_id_faculty_id_program_id_year_lev_key UNIQUE (course_id, faculty_id, program_id, year_level, section, school_year, semester);


--
-- TOC entry 5103 (class 2606 OID 16583)
-- Name: course_assignments course_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_pkey PRIMARY KEY (assignment_id);


--
-- TOC entry 5086 (class 2606 OID 16495)
-- Name: courses courses_course_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_code_key UNIQUE (course_code);


--
-- TOC entry 5088 (class 2606 OID 16493)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (course_id);


--
-- TOC entry 5078 (class 2606 OID 16465)
-- Name: departments departments_department_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_department_code_key UNIQUE (department_code);


--
-- TOC entry 5080 (class 2606 OID 16463)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (dept_id);


--
-- TOC entry 5180 (class 2606 OID 18258)
-- Name: email_verification_codes email_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_pkey PRIMARY KEY (verification_id);


--
-- TOC entry 5134 (class 2606 OID 16806)
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (result_id);


--
-- TOC entry 5136 (class 2606 OID 16808)
-- Name: exam_results exam_results_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_session_id_key UNIQUE (session_id);


--
-- TOC entry 5183 (class 2606 OID 18287)
-- Name: exam_sections exam_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_pkey PRIMARY KEY (section_id);


--
-- TOC entry 5118 (class 2606 OID 16721)
-- Name: exam_sessions exam_sessions_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_student_id_key UNIQUE (exam_id, member_id);


--
-- TOC entry 5120 (class 2606 OID 16719)
-- Name: exam_sessions exam_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 5109 (class 2606 OID 16647)
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (exam_id);


--
-- TOC entry 5097 (class 2606 OID 16525)
-- Name: faculty faculty_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_pkey PRIMARY KEY (faculty_id);


--
-- TOC entry 5099 (class 2606 OID 16527)
-- Name: faculty faculty_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_uid_key UNIQUE (uid);


--
-- TOC entry 5152 (class 2606 OID 17236)
-- Name: institution_members institution_members_institution_id_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_institution_id_uid_key UNIQUE (institution_id, uid);


--
-- TOC entry 5154 (class 2606 OID 17234)
-- Name: institution_members institution_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_pkey PRIMARY KEY (member_id);


--
-- TOC entry 5146 (class 2606 OID 17207)
-- Name: institutions institutions_acronym_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_acronym_key UNIQUE (acronym);


--
-- TOC entry 5148 (class 2606 OID 17205)
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (institution_id);


--
-- TOC entry 5082 (class 2606 OID 16476)
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (program_id);


--
-- TOC entry 5084 (class 2606 OID 16478)
-- Name: programs programs_program_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_program_code_key UNIQUE (program_code);


--
-- TOC entry 5114 (class 2606 OID 16675)
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- TOC entry 5140 (class 2606 OID 16826)
-- Name: report_logs report_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_pkey PRIMARY KEY (report_log_id);


--
-- TOC entry 5126 (class 2606 OID 16745)
-- Name: student_answers student_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_pkey PRIMARY KEY (answer_id);


--
-- TOC entry 5128 (class 2606 OID 16747)
-- Name: student_answers student_answers_session_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_session_id_question_id_key UNIQUE (session_id, question_id);


--
-- TOC entry 5176 (class 2606 OID 18228)
-- Name: students students_member_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_member_id_key UNIQUE (member_id);


--
-- TOC entry 5178 (class 2606 OID 18226)
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- TOC entry 5105 (class 2606 OID 16613)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 5107 (class 2606 OID 16615)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 5171 (class 2606 OID 18239)
-- Name: teaching_terms teaching_terms_member_program_section_term_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_terms
    ADD CONSTRAINT teaching_terms_member_program_section_term_key UNIQUE (member_id, program_code, section_code, school_year, semester);


--
-- TOC entry 5173 (class 2606 OID 18196)
-- Name: teaching_terms teaching_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_terms
    ADD CONSTRAINT teaching_terms_pkey PRIMARY KEY (term_id);


--
-- TOC entry 5142 (class 2606 OID 17180)
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (theme_id);


--
-- TOC entry 5144 (class 2606 OID 17182)
-- Name: themes themes_theme_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_theme_name_key UNIQUE (theme_name);


--
-- TOC entry 5091 (class 2606 OID 16515)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5093 (class 2606 OID 16848)
-- Name: users users_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);


--
-- TOC entry 5095 (class 2606 OID 16513)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uid);


--
-- TOC entry 5123 (class 1259 OID 17314)
-- Name: idx_answers_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_question ON public.student_answers USING btree (question_id);


--
-- TOC entry 5124 (class 1259 OID 16841)
-- Name: idx_answers_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_answers_session ON public.student_answers USING btree (session_id);


--
-- TOC entry 5131 (class 1259 OID 16843)
-- Name: idx_cheat_occurred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cheat_occurred ON public.cheating_logs USING btree (session_id, occurred_at);


--
-- TOC entry 5132 (class 1259 OID 16842)
-- Name: idx_cheat_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cheat_session ON public.cheating_logs USING btree (session_id);


--
-- TOC entry 5159 (class 1259 OID 17310)
-- Name: idx_classes_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_institution ON public.classes USING btree (institution_id);


--
-- TOC entry 5160 (class 1259 OID 17311)
-- Name: idx_classes_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_member ON public.classes USING btree (member_id);


--
-- TOC entry 5161 (class 1259 OID 18235)
-- Name: idx_classes_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_term ON public.classes USING btree (term_id);


--
-- TOC entry 5181 (class 1259 OID 18264)
-- Name: idx_email_verification_uid_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_uid_active ON public.email_verification_codes USING btree (uid, created_at DESC) WHERE (used_at IS NULL);


--
-- TOC entry 5166 (class 1259 OID 17312)
-- Name: idx_enrollments_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_class ON public.class_enrollments USING btree (class_id);


--
-- TOC entry 5167 (class 1259 OID 17313)
-- Name: idx_enrollments_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_member ON public.class_enrollments USING btree (member_id);


--
-- TOC entry 5184 (class 1259 OID 18298)
-- Name: idx_exam_sections_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_sections_exam ON public.exam_sections USING btree (exam_id);


--
-- TOC entry 5110 (class 1259 OID 16838)
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exams_status ON public.exams USING btree (status, is_archived);


--
-- TOC entry 5149 (class 1259 OID 17308)
-- Name: idx_members_institution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_institution ON public.institution_members USING btree (institution_id);


--
-- TOC entry 5150 (class 1259 OID 17309)
-- Name: idx_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_user ON public.institution_members USING btree (uid);


--
-- TOC entry 5111 (class 1259 OID 17315)
-- Name: idx_questions_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_exam ON public.questions USING btree (exam_id);


--
-- TOC entry 5112 (class 1259 OID 18299)
-- Name: idx_questions_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_questions_section ON public.questions USING btree (section_id);


--
-- TOC entry 5138 (class 1259 OID 16845)
-- Name: idx_report_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exam ON public.report_logs USING btree (exam_id);


--
-- TOC entry 5137 (class 1259 OID 16844)
-- Name: idx_results_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_results_session ON public.exam_results USING btree (session_id);


--
-- TOC entry 5121 (class 1259 OID 16839)
-- Name: idx_sessions_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_exam ON public.exam_sessions USING btree (exam_id);


--
-- TOC entry 5122 (class 1259 OID 16840)
-- Name: idx_sessions_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_student ON public.exam_sessions USING btree (member_id);


--
-- TOC entry 5174 (class 1259 OID 18306)
-- Name: idx_students_institution_student_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_students_institution_student_number ON public.students USING btree (institution_id, student_number) WHERE ((student_number IS NOT NULL) AND ((student_number)::text <> ''::text));


--
-- TOC entry 5168 (class 1259 OID 18234)
-- Name: idx_teaching_terms_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_terms_member ON public.teaching_terms USING btree (member_id);


--
-- TOC entry 5169 (class 1259 OID 18241)
-- Name: idx_teaching_terms_program; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_terms_program ON public.teaching_terms USING btree (program_code, section_code);


--
-- TOC entry 5089 (class 1259 OID 16849)
-- Name: idx_users_google_sub; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_users_google_sub ON public.users USING btree (google_sub) WHERE (google_sub IS NOT NULL);


--
-- TOC entry 5224 (class 2620 OID 17422)
-- Name: classes trg_classes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5222 (class 2620 OID 17423)
-- Name: exams trg_exams_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5223 (class 2620 OID 17421)
-- Name: institutions trg_institutions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5221 (class 2620 OID 16621)
-- Name: system_settings trg_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5225 (class 2620 OID 18209)
-- Name: teaching_terms trg_teaching_terms_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_teaching_terms_updated_at BEFORE UPDATE ON public.teaching_terms FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 5202 (class 2606 OID 16782)
-- Name: cheating_logs cheating_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cheating_logs
    ADD CONSTRAINT cheating_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5195 (class 2606 OID 16697)
-- Name: choices choices_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE;


--
-- TOC entry 5213 (class 2606 OID 17296)
-- Name: class_enrollments class_enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id) ON DELETE CASCADE;


--
-- TOC entry 5214 (class 2606 OID 17301)
-- Name: class_enrollments class_enrollments_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_enrollments
    ADD CONSTRAINT class_enrollments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.institution_members(member_id) ON DELETE CASCADE;


--
-- TOC entry 5210 (class 2606 OID 17271)
-- Name: classes classes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;


--
-- TOC entry 5211 (class 2606 OID 17276)
-- Name: classes classes_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.institution_members(member_id);


--
-- TOC entry 5212 (class 2606 OID 18210)
-- Name: classes classes_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.teaching_terms(term_id) ON DELETE SET NULL;


--
-- TOC entry 5188 (class 2606 OID 16586)
-- Name: course_assignments course_assignments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


--
-- TOC entry 5189 (class 2606 OID 16591)
-- Name: course_assignments course_assignments_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculty(faculty_id);


--
-- TOC entry 5190 (class 2606 OID 16596)
-- Name: course_assignments course_assignments_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_assignments
    ADD CONSTRAINT course_assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(program_id);


--
-- TOC entry 5219 (class 2606 OID 18259)
-- Name: email_verification_codes email_verification_codes_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 5203 (class 2606 OID 16809)
-- Name: exam_results exam_results_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5220 (class 2606 OID 18288)
-- Name: exam_sections exam_sections_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- TOC entry 5196 (class 2606 OID 16722)
-- Name: exam_sessions exam_sessions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id);


--
-- TOC entry 5197 (class 2606 OID 18265)
-- Name: exam_sessions exam_sessions_ticket_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_ticket_issued_by_fkey FOREIGN KEY (ticket_issued_by) REFERENCES public.institution_members(member_id) ON DELETE SET NULL;


--
-- TOC entry 5192 (class 2606 OID 16653)
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(uid);


--
-- TOC entry 5186 (class 2606 OID 16533)
-- Name: faculty faculty_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.departments(dept_id);


--
-- TOC entry 5187 (class 2606 OID 16528)
-- Name: faculty faculty_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT faculty_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 5208 (class 2606 OID 17237)
-- Name: institution_members institution_members_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;


--
-- TOC entry 5209 (class 2606 OID 17242)
-- Name: institution_members institution_members_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT institution_members_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 5206 (class 2606 OID 17213)
-- Name: institutions institutions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(uid);


--
-- TOC entry 5207 (class 2606 OID 17208)
-- Name: institutions institutions_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(theme_id);


--
-- TOC entry 5185 (class 2606 OID 16479)
-- Name: programs programs_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.departments(dept_id);


--
-- TOC entry 5193 (class 2606 OID 16676)
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE;


--
-- TOC entry 5194 (class 2606 OID 18293)
-- Name: questions questions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.exam_sections(section_id) ON DELETE CASCADE;


--
-- TOC entry 5204 (class 2606 OID 16827)
-- Name: report_logs report_logs_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id);


--
-- TOC entry 5205 (class 2606 OID 16832)
-- Name: report_logs report_logs_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_logs
    ADD CONSTRAINT report_logs_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(uid);


--
-- TOC entry 5198 (class 2606 OID 16763)
-- Name: student_answers student_answers_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.users(uid) ON DELETE SET NULL;


--
-- TOC entry 5199 (class 2606 OID 16758)
-- Name: student_answers student_answers_choice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_choice_id_fkey FOREIGN KEY (choice_id) REFERENCES public.choices(choice_id) ON DELETE SET NULL;


--
-- TOC entry 5200 (class 2606 OID 16753)
-- Name: student_answers student_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(question_id);


--
-- TOC entry 5201 (class 2606 OID 16748)
-- Name: student_answers student_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(session_id) ON DELETE CASCADE;


--
-- TOC entry 5217 (class 2606 OID 18301)
-- Name: students students_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;


--
-- TOC entry 5218 (class 2606 OID 18229)
-- Name: students students_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.institution_members(member_id) ON DELETE CASCADE;


--
-- TOC entry 5191 (class 2606 OID 16616)
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(uid) ON DELETE SET NULL;


--
-- TOC entry 5215 (class 2606 OID 18199)
-- Name: teaching_terms teaching_terms_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_terms
    ADD CONSTRAINT teaching_terms_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;


--
-- TOC entry 5216 (class 2606 OID 18204)
-- Name: teaching_terms teaching_terms_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_terms
    ADD CONSTRAINT teaching_terms_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.institution_members(member_id) ON DELETE CASCADE;


-- Completed on 2026-05-30 06:21:37

--
-- PostgreSQL database dump complete
--

\unrestrict 6mMPKhisfcZMZ8RG95XxtGR8jqPrnbWlDcS9sYhURCmFdIYChssY6QdLYIpq5p8

