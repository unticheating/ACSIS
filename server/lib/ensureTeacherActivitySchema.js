import { getPool } from '../db.js'

let ensured = false

/** Adds the teacher activity log table on first use. */
export async function ensureTeacherActivitySchema() {
  if (ensured) return
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_activity_logs (
      log_id SERIAL PRIMARY KEY,
      teacher_member_id INT NOT NULL REFERENCES institution_members (member_id) ON DELETE CASCADE,
      class_id INT DEFAULT NULL REFERENCES classes (class_id) ON DELETE CASCADE,
      exam_id INT DEFAULT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
      student_member_id INT DEFAULT NULL REFERENCES institution_members (member_id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      details TEXT DEFAULT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_teacher_activity_actor ON teacher_activity_logs (teacher_member_id, occurred_at DESC)`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_teacher_activity_exam ON teacher_activity_logs (exam_id, occurred_at DESC)`,
  )
  ensured = true
}