/**
 * Student subtype row: institution-scoped student number (00-00000).
 * Cohort (program, section, A.Y.) belongs on teaching_terms / classes, not here.
 */

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {number} memberId
 * @param {number} institutionId
 */
export async function ensureStudentRow(db, memberId, institutionId) {
  await db.query(
    `INSERT INTO students (member_id, institution_id)
     VALUES ($1, $2)
     ON CONFLICT (member_id) DO NOTHING`,
    [memberId, institutionId],
  )
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {number} memberId
 */
export async function getStudentNumber(db, memberId) {
  const { rows } = await db.query(
    `SELECT student_number AS "studentNumber" FROM students WHERE member_id = $1`,
    [memberId],
  )
  return rows[0]?.studentNumber ? String(rows[0].studentNumber).trim() : null
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {number} memberId
 * @param {number} institutionId
 * @param {string | null | undefined} studentNumber
 */
export async function upsertStudentNumber(db, memberId, institutionId, studentNumber) {
  const num = studentNumber ? String(studentNumber).trim() : null
  await db.query(
    `INSERT INTO students (member_id, institution_id, student_number)
     VALUES ($1, $2, $3)
     ON CONFLICT (member_id) DO UPDATE SET
       institution_id = EXCLUDED.institution_id,
       student_number = EXCLUDED.student_number`,
    [memberId, institutionId, num],
  )
}
