-- Student year/section and membership flags for user management

ALTER TABLE institution_members
    ADD COLUMN IF NOT EXISTS year_level VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_institution_school_id
    ON institution_members (institution_id, school_id)
    WHERE school_id IS NOT NULL AND school_id <> '';
