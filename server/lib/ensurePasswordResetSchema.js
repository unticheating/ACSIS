import { getPool } from '../db.js'

let ensured = false

/** Adds password reset flag for existing databases. */
export async function ensurePasswordResetSchema() {
  if (ensured) return
  const pool = getPool()
  if (!pool) return

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE
  `)

  ensured = true
}