-- ACSIS PostgreSQL export
-- Generated: 2026-05-21T23:34:30.403Z
-- Import: see sql/IMPORT_DATABASE.md

BEGIN;

-- Clear existing public data (safe on a dev copy of acsis)
TRUNCATE TABLE
  report_logs, exam_results, cheating_logs, student_answers, exam_sessions,
  choices, questions, exams, class_enrollments, classes,
  institution_members, institutions, users, themes
RESTART IDENTITY CASCADE;

-- themes (6 rows)
INSERT INTO "themes" ("theme_id", "theme_name", "primary_color", "secondary_color", "base_color") VALUES (1, 'Emerald', '#16A34A', '#DDEEE4', '#FFFFFF');
INSERT INTO "themes" ("theme_id", "theme_name", "primary_color", "secondary_color", "base_color") VALUES (2, 'Ocean', '#1D4ED8', '#DBEAFE', '#FFFFFF');
INSERT INTO "themes" ("theme_id", "theme_name", "primary_color", "secondary_color", "base_color") VALUES (3, 'Crimson', '#B91C1C', '#FEE2E2', '#FFFFFF');
INSERT INTO "themes" ("theme_id", "theme_name", "primary_color", "secondary_color", "base_color") VALUES (4, 'Violet', '#7C3AED', '#EDE9FE', '#FFFFFF');
INSERT INTO "themes" ("theme_id", "theme_name", "primary_color", "secondary_color", "base_color") VALUES (5, 'Amber', '#D97706', '#FEF3C7', '#FFFFFF');
INSERT INTO "themes" ("theme_id", "theme_name", "primary_color", "secondary_color", "base_color") VALUES (6, 'Slate', '#334155', '#F1F5F9', '#FFFFFF');

-- users (4 rows)
INSERT INTO "users" ("uid", "first_name", "middle_name", "last_name", "suffix", "email", "password", "google_sub", "avatar_url", "is_super_admin", "created_at") VALUES (1, 'PLP', NULL, 'Administrator', NULL, 'admin@plpasig.edu.ph', '$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa', NULL, NULL, FALSE, '2026-05-21T19:54:50.940Z');
INSERT INTO "users" ("uid", "first_name", "middle_name", "last_name", "suffix", "email", "password", "google_sub", "avatar_url", "is_super_admin", "created_at") VALUES (888, 'Demo', NULL, 'Teacher', NULL, 'teacher@plpasig.edu.ph', '$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa', NULL, NULL, FALSE, '2026-05-21T20:30:10.807Z');
INSERT INTO "users" ("uid", "first_name", "middle_name", "last_name", "suffix", "email", "password", "google_sub", "avatar_url", "is_super_admin", "created_at") VALUES (2, 'CARL AJ', 'MASIPAG AKO', 'JUNIO', NULL, 'junio_carlaj@plpasig.edu.ph', NULL, '107099310791384241180', 'https://lh3.googleusercontent.com/a/ACg8ocKFyGYFYm9JVeoHNvr6dqUn60_aUhsQUL1eBpwSnvzUh2qD_xM=s96-c', FALSE, '2026-05-21T20:50:18.806Z');
INSERT INTO "users" ("uid", "first_name", "middle_name", "last_name", "suffix", "email", "password", "google_sub", "avatar_url", "is_super_admin", "created_at") VALUES (999, 'Demo', NULL, 'Student', NULL, 'student@plpasig.edu.ph', '$2b$12$Fj2E8sbVklxoi0lpZVms8uYyvCBhL/o6pe37e08XixCcF.ak9UdGa', NULL, NULL, FALSE, '2026-05-21T20:30:10.788Z');

-- institutions (1 rows)
INSERT INTO "institutions" ("institution_id", "institution_name", "acronym", "logo", "theme_id", "max_warnings", "is_active", "created_by", "created_at", "updated_at") VALUES (1, 'Pamantasan ng Lungsod ng Pasig', 'PLP', NULL, 1, 3, TRUE, 1, '2026-05-21T19:54:50.945Z', '2026-05-21T19:54:50.945Z');

-- institution_members (4 rows)
INSERT INTO "institution_members" ("member_id", "institution_id", "uid", "role", "school_id", "year_level", "section", "is_pending", "is_active", "joined_at") VALUES (1, 1, 1, 'admin', '23-47879', NULL, NULL, FALSE, TRUE, '2026-05-21T19:54:50.949Z');
INSERT INTO "institution_members" ("member_id", "institution_id", "uid", "role", "school_id", "year_level", "section", "is_pending", "is_active", "joined_at") VALUES (888, 1, 888, 'faculty', '23-45687', NULL, NULL, FALSE, TRUE, '2026-05-21T20:30:10.808Z');
INSERT INTO "institution_members" ("member_id", "institution_id", "uid", "role", "school_id", "year_level", "section", "is_pending", "is_active", "joined_at") VALUES (2, 1, 2, 'faculty', '19-45478', NULL, NULL, FALSE, TRUE, '2026-05-21T20:50:18.806Z');
INSERT INTO "institution_members" ("member_id", "institution_id", "uid", "role", "school_id", "year_level", "section", "is_pending", "is_active", "joined_at") VALUES (999, 1, 999, 'student', '23-01256', '1st Year', 'A', FALSE, TRUE, '2026-05-21T20:30:10.792Z');

-- classes (4 rows)
INSERT INTO "classes" ("class_id", "institution_id", "member_id", "class_name", "description", "school_year", "semester", "access_code", "is_active", "created_at", "updated_at") VALUES (1, 1, 888, 'Information Assurance and Security', NULL, '2024-2025', '1st', 'PLP-DEFAULT', TRUE, '2026-05-21T20:30:10.809Z', '2026-05-21T20:30:10.809Z');
INSERT INTO "classes" ("class_id", "institution_id", "member_id", "class_name", "description", "school_year", "semester", "access_code", "is_active", "created_at", "updated_at") VALUES (2, 1, 888, 'HEY TEST', NULL, '2025-2026', '1st', 'SXMKB363', TRUE, '2026-05-21T21:16:32.733Z', '2026-05-21T21:16:32.733Z');
INSERT INTO "classes" ("class_id", "institution_id", "member_id", "class_name", "description", "school_year", "semester", "access_code", "is_active", "created_at", "updated_at") VALUES (3, 1, 2, 'TESTING', NULL, '2025-2026', '1st', '56SN7DFH', TRUE, '2026-05-21T21:16:44.690Z', '2026-05-21T21:16:44.690Z');
INSERT INTO "classes" ("class_id", "institution_id", "member_id", "class_name", "description", "school_year", "semester", "access_code", "is_active", "created_at", "updated_at") VALUES (4, 1, 888, 'TESTING', NULL, '2025-2026', '1st', '2AVL5RDS', TRUE, '2026-05-21T21:16:57.865Z', '2026-05-21T21:16:57.865Z');

-- class_enrollments (2 rows)
INSERT INTO "class_enrollments" ("enrollment_id", "class_id", "member_id", "enrolled_at") VALUES (1, 1, 999, '2026-05-21T20:32:10.048Z');
INSERT INTO "class_enrollments" ("enrollment_id", "class_id", "member_id", "enrolled_at") VALUES (2, 2, 999, '2026-05-21T21:23:41.951Z');

-- exams (6 rows)
INSERT INTO "exams" ("exam_id", "class_id", "title", "description", "password", "time_limit", "status", "shuffle_questions", "shuffle_choices", "is_archived", "created_by", "created_at", "updated_at") VALUES (3, 2, 'asdasdasd', NULL, NULL, 185, 'draft', FALSE, FALSE, FALSE, 888, '2026-05-21T21:49:53.317Z', '2026-05-21T21:49:53.317Z');
INSERT INTO "exams" ("exam_id", "class_id", "title", "description", "password", "time_limit", "status", "shuffle_questions", "shuffle_choices", "is_archived", "created_by", "created_at", "updated_at") VALUES (4, 2, 'asdasdasd', NULL, NULL, 185, 'draft', FALSE, FALSE, FALSE, 888, '2026-05-21T21:50:19.276Z', '2026-05-21T21:50:19.276Z');
INSERT INTO "exams" ("exam_id", "class_id", "title", "description", "password", "time_limit", "status", "shuffle_questions", "shuffle_choices", "is_archived", "created_by", "created_at", "updated_at") VALUES (1, 2, 'asdasdasd', NULL, NULL, 125, 'open', FALSE, FALSE, FALSE, 888, '2026-05-21T21:48:51.830Z', '2026-05-21T22:04:12.608Z');
INSERT INTO "exams" ("exam_id", "class_id", "title", "description", "password", "time_limit", "status", "shuffle_questions", "shuffle_choices", "is_archived", "created_by", "created_at", "updated_at") VALUES (5, 2, 'asdasdasd', NULL, NULL, 65, 'open', FALSE, FALSE, FALSE, 888, '2026-05-21T21:56:51.586Z', '2026-05-21T22:44:01.144Z');
INSERT INTO "exams" ("exam_id", "class_id", "title", "description", "password", "time_limit", "status", "shuffle_questions", "shuffle_choices", "is_archived", "created_by", "created_at", "updated_at") VALUES (6, 2, 'a3123124124', NULL, NULL, 60, 'open', FALSE, FALSE, FALSE, 888, '2026-05-21T21:58:12.290Z', '2026-05-21T22:47:44.371Z');
INSERT INTO "exams" ("exam_id", "class_id", "title", "description", "password", "time_limit", "status", "shuffle_questions", "shuffle_choices", "is_archived", "created_by", "created_at", "updated_at") VALUES (2, 2, 'asdasdasdasd', NULL, NULL, 185, 'waiting', FALSE, FALSE, FALSE, 888, '2026-05-21T21:49:28.121Z', '2026-05-21T23:21:17.859Z');

-- questions (13 rows)
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (1, 1, 'qer1241q2r', 'mcq', '1.00', 1);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (2, 1, 'asdadasd', 'identification', '1.00', 2);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (3, 1, 'asdasdasd', 'identification', '1.00', 3);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (4, 2, 'asdasdasd', 'identification', '1.00', 1);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (5, 2, 'asdasdasdasd', 'identification', '1.00', 2);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (6, 3, 'asdasda', 'identification', '1.00', 1);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (7, 3, 'asdasdsad', 'identification', '1.00', 2);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (8, 4, 'asdadasd', 'identification', '1.00', 1);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (9, 4, 'asdasdasd', 'identification', '1.00', 2);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (10, 5, 'asdasd', 'identification', '1.00', 1);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (11, 5, 'asdasdasd', 'identification', '1.00', 2);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (12, 6, 'asdasdasd', 'identification', '1.00', 1);
INSERT INTO "questions" ("question_id", "exam_id", "question_text", "question_type", "points", "order_num") VALUES (13, 6, 'asdasd', 'identification', '1.00', 2);

-- choices (16 rows)
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (1, 1, 'asdas', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (2, 1, 'dasdasd', FALSE, 2);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (3, 1, 'asdasd', FALSE, 3);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (4, 1, 'asdasdasd', FALSE, 4);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (5, 2, 'asdasdsad', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (6, 3, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (7, 4, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (8, 5, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (9, 6, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (10, 7, 'asdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (11, 8, 'asdasdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (12, 9, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (13, 10, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (14, 11, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (15, 12, 'asdasdasd', TRUE, 1);
INSERT INTO "choices" ("choice_id", "question_id", "choice_text", "is_correct", "order_num") VALUES (16, 13, 'asdasdsd', TRUE, 1);

-- exam_sessions (0 rows)

-- student_answers (0 rows)

-- cheating_logs (0 rows)

-- exam_results (0 rows)

-- report_logs (0 rows)

-- Reset serial sequences
SELECT setval('public.class_enrollments_enrollment_id_seq', COALESCE((SELECT MAX("enrollment_id") FROM "class_enrollments"), 1), true);
SELECT setval('public.themes_theme_id_seq', COALESCE((SELECT MAX("theme_id") FROM "themes"), 1), true);
SELECT setval('public.institutions_institution_id_seq', COALESCE((SELECT MAX("institution_id") FROM "institutions"), 1), true);
SELECT setval('public.users_uid_seq', COALESCE((SELECT MAX("uid") FROM "users"), 1), true);
SELECT setval('public.institution_members_member_id_seq', COALESCE((SELECT MAX("member_id") FROM "institution_members"), 1), true);
SELECT setval('public.classes_class_id_seq', COALESCE((SELECT MAX("class_id") FROM "classes"), 1), true);
SELECT setval('public.exams_exam_id_seq', COALESCE((SELECT MAX("exam_id") FROM "exams"), 1), true);
SELECT setval('public.questions_question_id_seq', COALESCE((SELECT MAX("question_id") FROM "questions"), 1), true);
SELECT setval('public.choices_choice_id_seq', COALESCE((SELECT MAX("choice_id") FROM "choices"), 1), true);
SELECT setval('public.exam_sessions_session_id_seq', COALESCE((SELECT MAX("session_id") FROM "exam_sessions"), 1), true);
SELECT setval('public.student_answers_answer_id_seq', COALESCE((SELECT MAX("answer_id") FROM "student_answers"), 1), true);
SELECT setval('public.cheating_logs_log_id_seq', COALESCE((SELECT MAX("log_id") FROM "cheating_logs"), 1), true);
SELECT setval('public.exam_results_result_id_seq', COALESCE((SELECT MAX("result_id") FROM "exam_results"), 1), true);
SELECT setval('public.report_logs_report_log_id_seq', COALESCE((SELECT MAX("report_log_id") FROM "report_logs"), 1), true);

COMMIT;
