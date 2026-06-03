import { getPool } from '../db.js'

let ensured = false

export async function ensureCheatingLogDismissedColumns() {
  if (ensured) return
  const pool = getPool()
  await pool.query(`
    ALTER TABLE cheating_logs
      ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL
  `)
  await pool.query(`
    ALTER TABLE cheating_logs
      ADD COLUMN IF NOT EXISTS dismissed_by_member_id INT DEFAULT NULL
  `)
  ensured = true
}
