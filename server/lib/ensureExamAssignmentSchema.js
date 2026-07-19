import { getPool } from '../db.js'

let ensured = false

/**
 * Adds the exam assignment allowlist table on first use.
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for CREATE TABLE on the Supabase pooler.
 */
export async function ensureExamAssignmentSchema() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_assignments (
      assignment_id SERIAL PRIMARY KEY,
      exam_id INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
      member_id INT NOT NULL REFERENCES institution_members (member_id) ON DELETE CASCADE,
      assigned_by INT DEFAULT NULL REFERENCES institution_members (member_id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (exam_id, member_id)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam ON exam_assignments (exam_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_exam_assignments_member ON exam_assignments (member_id)`)
  ensured = true
}