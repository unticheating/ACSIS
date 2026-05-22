-- Email OTP after Google sign-in (and password continue flow)

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
