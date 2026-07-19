import { getPool } from '../db.js'

let ensured = false

/**
 * exam_sections table + questions.section_id/image_url/presentation_answer/answer_explanation
 * columns (migration 008 / 016).
 * On Vercel (production) the DB is fully migrated — skip DDL entirely to
 * avoid holding a connection for CREATE TABLE on the Supabase pooler.
 */
export async function ensureExamSectionsSchema() {
  if (ensured) return
  // Production DB is already migrated; skip DDL on Vercel to prevent
  // connection exhaustion on Supabase pooler.
  if (process.env.VERCEL) {
    ensured = true
    return
  }
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_sections (
      section_id   SERIAL PRIMARY KEY,
      exam_id      INT NOT NULL REFERENCES exams (exam_id) ON DELETE CASCADE,
      title        VARCHAR(200) NOT NULL DEFAULT '',
      description  TEXT DEFAULT NULL,
      order_num    INT NOT NULL DEFAULT 0
    )
  `)
  await pool.query(`
    ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS section_id INT DEFAULT NULL
      REFERENCES exam_sections (section_id) ON DELETE CASCADE
  `)
  await pool.query(`
    ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL
  `)
  await pool.query(`
    ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS presentation_answer TEXT DEFAULT NULL
  `)
  await pool.query(`
    ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS answer_explanation TEXT DEFAULT NULL
  `)
  ensured = true
}
