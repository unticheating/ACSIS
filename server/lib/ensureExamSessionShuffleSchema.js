import { getPool } from '../db.js'

let ensured = false

/**
 * Per-session question/choice shuffle order (existing DBs — migration 007).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for ALTER TABLE on the Supabase pooler.
 */
export async function ensureExamSessionShuffleColumns() {
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
      ADD COLUMN IF NOT EXISTS question_order JSONB DEFAULT NULL
  `)
  await pool.query(`
    ALTER TABLE exam_sessions
      ADD COLUMN IF NOT EXISTS choice_orders JSONB DEFAULT NULL
  `)
  ensured = true
}
