-- Per-institution sign-in / user-provisioning email domain (e.g. plpasig.edu.ph).
-- NULL falls back to ALLOWED_EMAIL_DOMAIN in application config.

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS email_domain VARCHAR(255) DEFAULT NULL;

COMMENT ON COLUMN institutions.email_domain IS
    'Primary email domain for students and admins at this institution. Faculty may use any email when added by an admin.';
