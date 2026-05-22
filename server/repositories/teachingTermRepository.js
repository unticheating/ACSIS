import { getPool } from '../db.js'

function mapTermRow(row) {
  return {
    id: String(row.term_id),
    programCode: row.program_code,
    sectionCode: row.section_code,
    academicYear: row.school_year,
    semester: row.semester,
    isArchived: Boolean(row.is_archived),
    classCount: Number(row.class_count || 0),
  }
}

export async function listTeachingTermsQuery(memberId, { includeArchived = false } = {}) {
  const pool = getPool()
  const result = await pool.query(
    `SELECT t.term_id, t.program_code, t.section_code, t.school_year, t.semester, t.is_archived,
            COUNT(c.class_id)::int AS class_count
     FROM teaching_terms t
     LEFT JOIN classes c ON c.term_id = t.term_id AND c.is_active = TRUE
     WHERE t.member_id = $1
       AND ($2::boolean OR t.is_archived = FALSE)
     GROUP BY t.term_id
     ORDER BY t.is_archived ASC, t.school_year DESC, t.semester DESC, t.program_code, t.section_code`,
    [memberId, includeArchived],
  )
  return result.rows.map(mapTermRow)
}

export async function getTeachingTermQuery(termId, memberId) {
  const pool = getPool()
  const result = await pool.query(
    `SELECT t.term_id, t.program_code, t.section_code, t.school_year, t.semester, t.is_archived,
            COUNT(c.class_id)::int AS class_count
     FROM teaching_terms t
     LEFT JOIN classes c ON c.term_id = t.term_id AND c.is_active = TRUE
     WHERE t.term_id = $1 AND t.member_id = $2
     GROUP BY t.term_id`,
    [termId, memberId],
  )
  return result.rows[0] ? mapTermRow(result.rows[0]) : null
}

export async function createTeachingTermQuery(institutionId, memberId, programCode, sectionCode, schoolYear, semester) {
  const pool = getPool()
  const result = await pool.query(
    `INSERT INTO teaching_terms (institution_id, member_id, program_code, section_code, school_year, semester)
     VALUES ($1, $2, $3, $4, $5, $6::semester_type)
     RETURNING term_id, program_code, section_code, school_year, semester, is_archived`,
    [institutionId, memberId, programCode, sectionCode, schoolYear, semester],
  )
  const row = result.rows[0]
  return {
    id: String(row.term_id),
    programCode: row.program_code,
    sectionCode: row.section_code,
    academicYear: row.school_year,
    semester: row.semester,
    isArchived: Boolean(row.is_archived),
    classCount: 0,
  }
}

export async function updateTeachingTermQuery(termId, memberId, { isArchived }) {
  const pool = getPool()
  const result = await pool.query(
    `UPDATE teaching_terms
     SET is_archived = COALESCE($3, is_archived)
     WHERE term_id = $1 AND member_id = $2
     RETURNING term_id, program_code, section_code, school_year, semester, is_archived`,
    [termId, memberId, isArchived],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: String(row.term_id),
    programCode: row.program_code,
    sectionCode: row.section_code,
    academicYear: row.school_year,
    semester: row.semester,
    isArchived: Boolean(row.is_archived),
  }
}

export async function deleteTeachingTermQuery(termId, memberId) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const owned = await client.query(
      `SELECT term_id FROM teaching_terms WHERE term_id = $1 AND member_id = $2`,
      [termId, memberId],
    )
    if (!owned.rows[0]) {
      await client.query('ROLLBACK')
      return false
    }
    await client.query(
      `DELETE FROM classes WHERE term_id = $1 AND member_id = $2`,
      [termId, memberId],
    )
    await client.query(`DELETE FROM teaching_terms WHERE term_id = $1 AND member_id = $2`, [termId, memberId])
    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function listClassesByTermQuery(termId, memberId) {
  const pool = getPool()
  const result = await pool.query(
    `SELECT class_id AS id, course_code AS "courseCode", class_name AS name,
            school_year AS "academicYear", semester, access_code AS "accessCode", term_id AS "termId"
     FROM classes
     WHERE term_id = $1 AND member_id = $2 AND is_active = TRUE
     ORDER BY course_code, class_name`,
    [termId, memberId],
  )
  return result.rows
}
