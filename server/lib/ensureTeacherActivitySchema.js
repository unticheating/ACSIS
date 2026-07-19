import { getPool } from '../db.js'

let ensured = false

/**
 * Adds the teacher activity log table on first use.
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for CREATE TABLE on the Supabase pooler.
 */
export async function ensureTeacherActivitySchema() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_activity_logs (
      log_id SERIAL PRIMARY KEY,
      teacher_member_id INT NOT NULL REFERENCES institution_members (member_id) ON DELETE CASCADE,
      class_id INT DEFAULT NULL REFERENCES classes (class_id) ON DELETE CASCADE,
      exam_id INT DEFAULT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
      section_id INT DEFAULT NULL REFERENCES exam_sections (section_id) ON DELETE SET NULL,
      student_member_id INT DEFAULT NULL REFERENCES institution_members (member_id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      details TEXT DEFAULT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `ALTER TABLE teacher_activity_logs
     ADD COLUMN IF NOT EXISTS section_id INT DEFAULT NULL REFERENCES exam_sections (section_id) ON DELETE SET NULL`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_teacher_activity_actor ON teacher_activity_logs (teacher_member_id, occurred_at DESC)`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_teacher_activity_exam ON teacher_activity_logs (exam_id, occurred_at DESC)`,
  )
  ensured = true
}