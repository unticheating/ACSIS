import { getPool } from '../db.js'

let ensured = false

/**
 * session_status enum value for exams closed while students are still joined (migration 018).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for ALTER TYPE on the Supabase pooler.
 */
export async function ensureSessionOnHoldStatus() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
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
