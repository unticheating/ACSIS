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

/**
 * Adds dismissed_at / dismissed_by_member_id columns on existing DBs (migration 015).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for information_schema + ALTER TABLE.
 */
export async function ensureCheatingLogDismissedColumns() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
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
