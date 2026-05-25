import { getPool } from '../db.js'

let ensured = false

const EXTRA_CHEAT_EVENTS = ['screenshot_attempt', 'win_key']

/**
 * Adds new cheat_event enum labels on existing DBs (migrations 013/014).
 */
export async function ensureCheatEventSchema() {
  if (ensured) return
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
