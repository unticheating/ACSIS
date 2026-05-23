import { getPool } from '../db.js'

let ensured = false

/** Per-session question/choice order (existing DBs). */
export async function ensureExamSessionShuffleColumns() {
  if (ensured) return
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
