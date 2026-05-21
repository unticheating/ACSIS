-- PLP institution + administrator account
-- Run AFTER acsis.sql and sql/migrations/002_google_oauth.sql
--
-- 1) Generate password hash (from project root):
--    node server/scripts/hash-password.mjs "YourAdminPassword123"
-- 2) Replace PASTE_BCRYPT_HASH below with the output
-- 3) Run this file in psql or pgAdmin

-- Bootstrap user (also creates PLP institution; same person is institution admin)
INSERT INTO users (first_name, last_name, email, password, is_super_admin)
VALUES (
    'PLP',
    'Administrator',
    'admin@plpasig.edu.ph',
    '$2b$12$qGSSUutLnLovUizi7AcvzeBM7TdqZ3oUAfK06rqnTNuNjOI1qiT/y',
    FALSE
);

INSERT INTO institutions (
    institution_name,
    acronym,
    theme_id,
    max_warnings,
    is_active,
    created_by
)
VALUES (
    'Pamantasan ng Lungsod ng Pasig',
    'PLP',
    1,
    3,
    TRUE,
    (SELECT uid FROM users WHERE email = 'admin@plpasig.edu.ph')
);

INSERT INTO institution_members (institution_id, uid, role, is_active)
SELECT
    i.institution_id,
    u.uid,
    'admin',
    TRUE
FROM users u
CROSS JOIN institutions i
WHERE u.email = 'admin@plpasig.edu.ph'
  AND i.acronym = 'PLP';
