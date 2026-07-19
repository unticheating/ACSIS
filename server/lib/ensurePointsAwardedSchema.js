import { getPool } from '../db.js'

let ensured = false

/**
 * Optional per-answer score override for manual / partial credit grading (migration 019).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for ALTER TABLE on the Supabase pooler.
 */
export async function ensurePointsAwardedColumn() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  await pool.query(`
    ALTER TABLE student_answers
      ADD COLUMN IF NOT EXISTS points_awarded NUMERIC(10, 2) DEFAULT NULL
  `)
  ensured = true
}
