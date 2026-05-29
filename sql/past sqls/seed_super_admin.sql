-- Platform super administrator (no institution membership required)
-- Run AFTER sql/acsis.sql
--
-- Login: superadmin@plpasig.edu.ph / password123
-- Portal: /super-admin (dev portals page also lists this account)

INSERT INTO users (first_name, last_name, email, password, is_super_admin)
VALUES (
    'ACSIS',
    'Super Admin',
    'superadmin@plpasig.edu.ph',
    '$2b$12$kdOU7KgIRa2iSnsKBT9KvO/NNvKenMlywucaUtpLamnNBUKFNkcDu',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    is_super_admin = TRUE;
