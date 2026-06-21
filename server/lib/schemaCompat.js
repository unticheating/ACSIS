/** @type {Promise<'member_id' | 'student_id'> | null} */
let examSessionUserColumnPromise = null

/** @type {Promise<void> | null} */
let examSessionFkCheckedPromise = null

/**
 * Legacy DBs reference students(student_id) but enrollments use institution_members.
 * Repoint FK so student_id stores institution_members.member_id (column name unchanged).
 * @param {import('pg').Pool} pool
 */
export function ensureExamSessionSchemaCompat(pool) {
  if (!examSessionFkCheckedPromise) {
    examSessionFkCheckedPromise = (async () => {
      try {
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
    })();
  }
  return examSessionFkCheckedPromise
}

export function getExamSessionUserColumn(pool) {
  if (!examSessionUserColumnPromise) {
    examSessionUserColumnPromise = (async () => {
      try {
        await ensureExamSessionSchemaCompat(pool)
        const { rows } = await pool.query(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'exam_sessions'
             AND column_name IN ('member_id', 'student_id')`,
        )
        const names = new Set(rows.map((r) => r.column_name))
        return names.has('member_id') ? 'member_id' : 'student_id'
      } catch (err) {
        examSessionUserColumnPromise = null
        throw err
      }
    })();
  }
  return examSessionUserColumnPromise
}

let examSessionJoinConditionPromise = null

/**
 * Returns a robust JOIN condition for exam_sessions to institution_members.
 * Handles DBs in transition where both member_id and student_id exist.
 * @param {import('pg').Pool} pool
 * @param {string} esAlias Alias for exam_sessions table
 * @param {string} imAlias Alias for institution_members table
 */
export async function getExamSessionJoinCondition(pool, esAlias = 'es', imAlias = 'im') {
  if (!examSessionJoinConditionPromise) {
    examSessionJoinConditionPromise = (async () => {
      try {
        await ensureExamSessionSchemaCompat(pool)
        const { rows } = await pool.query(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'exam_sessions'
             AND column_name IN ('member_id', 'student_id')`,
        )
        const names = new Set(rows.map((r) => r.column_name))
        
        if (names.has('member_id') && names.has('student_id')) {
          return \`COALESCE(ES_ALIAS.member_id, ES_ALIAS.student_id) = IM_ALIAS.member_id\`
        } else if (names.has('member_id')) {
          return \`ES_ALIAS.member_id = IM_ALIAS.member_id\`
        } else {
          return \`ES_ALIAS.student_id = IM_ALIAS.member_id\`
        }
      } catch (err) {
        examSessionJoinConditionPromise = null
        throw err
      }
    })();
  }
  
  const condition = await examSessionJoinConditionPromise;
  return condition.replace(/ES_ALIAS/g, esAlias).replace(/IM_ALIAS/g, imAlias)
}
