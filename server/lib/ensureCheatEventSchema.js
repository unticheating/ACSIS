import { getPool } from '../db.js'

let ensured = false

const EXTRA_CHEAT_EVENTS = ['screenshot_attempt', 'win_key']

/**
 * Adds new cheat_event enum labels on existing DBs (migrations 013/014).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a Transaction Pooler connection for ALTER TYPE.
 */
export async function ensureCheatEventSchema() {
  if (ensured) return
  // Production DB is already migrated; DDL is forbidden on Supabase
  // Transaction Pooler and wastes a connection slot on cold starts.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  for (const label of EXTRA_CHEAT_EVENTS) {
    await pool.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'cheat_event' AND e.enumlabel = '${label}'
        ) THEN
          ALTER TYPE cheat_event ADD VALUE '${label}';
        END IF;
      END
      $$`,
    )
  }
  ensured = true
}
