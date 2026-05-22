/** @type {'member_id' | 'student_id' | null} */
let examSessionUserColumn = null

/** @type {boolean} */
let examSessionFkChecked = false

/**
 * Legacy DBs reference students(student_id) but enrollments use institution_members.
 * Repoint FK so student_id stores institution_members.member_id (column name unchanged).
 * @param {import('pg').Pool} pool
 */
export async function ensureExamSessionSchemaCompat(pool) {
  if (examSessionFkChecked) return
  examSessionFkChecked = true

  const { rows: tableRows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'institution_members'`,
  )
  if (!tableRows.length) return

  const { rows: fkRows } = await pool.query(
    `SELECT pg_get_constraintdef(c.oid) AS def
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'exam_sessions'
       AND c.conname = 'exam_sessions_student_id_fkey'`,
  )
  const def = fkRows[0]?.def || ''
  if (!def.includes('students')) return

  try {
    await pool.query('ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_student_id_fkey')
    await pool.query(
      `ALTER TABLE exam_sessions
       ADD CONSTRAINT exam_sessions_student_id_fkey
       FOREIGN KEY (student_id) REFERENCES institution_members(member_id)`,
    )
    console.log('[schemaCompat] exam_sessions.student_id now references institution_members.member_id')
  } catch (err) {
    console.warn('[schemaCompat] Could not repoint exam_sessions FK:', err.message)
  }
}

/**
 * ACSIS v2 uses exam_sessions.member_id; some DBs still have student_id.
 * @param {import('pg').Pool} pool
 * @returns {Promise<'member_id' | 'student_id'>}
 */
export async function getExamSessionUserColumn(pool) {
  if (examSessionUserColumn) return examSessionUserColumn

  await ensureExamSessionSchemaCompat(pool)

  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'exam_sessions'
       AND column_name IN ('member_id', 'student_id')`,
  )
  const names = new Set(rows.map((r) => r.column_name))
  examSessionUserColumn = names.has('member_id') ? 'member_id' : 'student_id'
  return examSessionUserColumn
}
