import { getPool } from '../db.js'

let ensured = false

/** locked_at / lock_reason for manual-submit flow (existing DBs). */
export async function ensureExamSessionLockedColumns() {
  if (ensured) return
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
