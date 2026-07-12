import { getPool } from '../db.js'

let ensured = false

/** Optional per-answer score override for manual / partial credit grading. */
export async function ensurePointsAwardedColumn() {
  if (ensured) return
  const pool = getPool()
  await pool.query(`
    ALTER TABLE student_answers
      ADD COLUMN IF NOT EXISTS points_awarded NUMERIC(10, 2) DEFAULT NULL
  `)
  ensured = true
}
