import { getPool } from '../db.js'

let ensured = false

/**
 * locked_at / lock_reason for manual-submit flow (existing DBs — migration 012).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for ALTER TABLE on the Supabase pooler.
 */
export async function ensureExamSessionLockedColumns() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  await pool.query(`
    ALTER TABLE exam_sessions
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL
  `)
  await pool.query(`
    ALTER TABLE exam_sessions
      ADD COLUMN IF NOT EXISTS lock_reason VARCHAR(32) DEFAULT NULL
  `)
  ensured = true
}
