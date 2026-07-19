import { getPool } from '../db.js'

let ensured = false

/**
 * Adds ticket columns to exam_sessions on first use (existing DBs).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for ALTER TABLE on the Supabase pooler.
 */
export async function ensureExamSessionTicketColumns() {
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
      ADD COLUMN IF NOT EXISTS ticket_issued_at TIMESTAMPTZ DEFAULT NULL
  `)
  await pool.query(`
    ALTER TABLE exam_sessions
      ADD COLUMN IF NOT EXISTS ticket_issued_by INT DEFAULT NULL
      REFERENCES institution_members (member_id) ON DELETE SET NULL
  `)
  ensured = true
}
