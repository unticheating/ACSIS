const YEAR_LEVEL_VALUES = new Set(['1st Year', '2nd Year', '3rd Year', '4th Year'])

export function validateStudentYearLevel(yearLevel) {
  const v = String(yearLevel || '').trim()
  if (!v) return 'Year level is required for students.'
  if (!YEAR_LEVEL_VALUES.has(v)) return 'Select a valid year level.'
  return null
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {number} memberId
 */
export async function getStudentProfile(db, memberId) {
  const { rows } = await db.query(
    `SELECT program_code AS "programCode", year_level AS "yearLevel", section_code AS "sectionCode"
     FROM students WHERE member_id = $1`,
    [memberId],
  )
  return (
    rows[0] || {
      programCode: null,
      yearLevel: null,
      sectionCode: null,
    }
  )
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {number} memberId
 * @param {{ programCode?: string | null, yearLevel?: string | null, sectionCode?: string | null }} profile
 */
export async function upsertStudentProfile(db, memberId, profile) {
  const programCode = profile.programCode ? String(profile.programCode).trim() : null
  const yearLevel = profile.yearLevel ? String(profile.yearLevel).trim() : null
  const sectionCode = profile.sectionCode ? String(profile.sectionCode).trim() : null

  await db.query(
    `INSERT INTO students (member_id, program_code, year_level, section_code)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (member_id) DO UPDATE SET
       program_code = EXCLUDED.program_code,
       year_level = EXCLUDED.year_level,
       section_code = EXCLUDED.section_code`,
    [memberId, programCode, yearLevel, sectionCode],
  )
}
