-- Google OAuth columns for users (run after acsis.sql)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- OAuth-only accounts have no local password
ALTER TABLE users
    ALTER COLUMN password DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub)
    WHERE google_sub IS NOT NULL;
