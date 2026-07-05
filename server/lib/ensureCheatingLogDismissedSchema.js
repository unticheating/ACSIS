import { getPool } from '../db.js'

let ensured = false

async function cheatingLogDismissColumnsPresent(pool) {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'cheating_logs'
       AND column_name IN ('dismissed_at', 'dismissed_by_member_id')`,
  )
  const names = new Set(rows.map((r) => r.column_name))
  return names.has('dismissed_at') && names.has('dismissed_by_member_id')
}

export async function ensureCheatingLogDismissedColumns() {
  if (ensured) return
  const pool = getPool()
  if (!pool) return

  if (await cheatingLogDismissColumnsPresent(pool)) {
    ensured = true
    return
  }

  try {
    await pool.query(`
      ALTER TABLE cheating_logs
        ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL
    `)
    await pool.query(`
      ALTER TABLE cheating_logs
        ADD COLUMN IF NOT EXISTS dismissed_by_member_id INT DEFAULT NULL
    `)
  } catch (err) {
    // Supabase transaction pooler rejects DDL; continue if columns already exist.
    if (await cheatingLogDismissColumnsPresent(pool)) {
      ensured = true
      return
    }
    throw err
  }
  ensured = true
}
