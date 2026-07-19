import { getPool } from '../db.js'

let ensured = false

/**
 * Adds password_reset_required flag for existing databases.
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for ALTER TABLE on the Supabase pooler.
 */
export async function ensurePasswordResetSchema() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  if (!pool) return

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE
  `)

  ensured = true
}