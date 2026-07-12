import { getPool } from '../db.js'

let ensured = false

/** session_status enum value for exams closed while students are still joined. */
export async function ensureSessionOnHoldStatus() {
  if (ensured) return
  const pool = getPool()
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'session_status' AND e.enumlabel = 'on_hold'
      ) THEN
        ALTER TYPE session_status ADD VALUE 'on_hold';
      END IF;
    END
    $$;
  `)
  ensured = true
}
