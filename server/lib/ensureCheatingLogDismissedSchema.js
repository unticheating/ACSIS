import { getPool } from '../db.js'

let ensuredPromise = null

export function ensureCheatingLogDismissedColumns() {
  if (ensuredPromise) return ensuredPromise

  ensuredPromise = (async () => {
    try {
      const pool = getPool()
      await pool.query(`
        ALTER TABLE cheating_logs
          ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL
      `)
      await pool.query(`
        ALTER TABLE cheating_logs
          ADD COLUMN IF NOT EXISTS dismissed_by_member_id INT DEFAULT NULL
      `)
    } catch (err) {
      ensuredPromise = null
      throw err
    }
  })()

  return ensuredPromise
}
