import bcrypt from 'bcrypt'
import { isAllowedInstitutionalEmail } from './emailDomain.js'
import { config } from '../config.js'
import {
  getStudentProfile,
  upsertStudentProfile,
  validateStudentYearLevel,
} from './studentProfile.js'

const SCHOOL_ID_REGEX = /^\d{2}-\d{5}$/

function validateSchoolId(schoolId, role) {
  const id = String(schoolId || '').trim()
  if (!id) {
    return role === 'student' ? 'Student / employee ID is required.' : null
  }
  if (!SCHOOL_ID_REGEX.test(id)) {
    return 'ID must follow format 00-00000 (example: 24-00123).'
  }
  return null
}

function formatDisplayName(row) {
  const parts = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function mapRow(row) {
  let status = 'active'
  if (row.is_pending) status = 'pending'
  else if (!row.is_active) status = 'inactive'

  return {
    uid: row.uid,
    memberId: row.member_id,
    name: formatDisplayName(row),
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    status,
    schoolId: row.school_id || '',
    programCode: row.program_code || null,
    yearLevel: row.year_level || null,
    section: row.section_code || null,
    dateCreated: row.created_at,
    isSuperAdmin: row.is_super_admin,
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 */
export async function listInstitutionUsers(pool, institutionId) {
  const { rows } = await pool.query(
    `SELECT u.uid, u.first_name, u.middle_name, u.last_name, u.suffix, u.email, u.created_at, u.is_super_admin,
            im.member_id, im.role, im.school_id, im.is_active, im.is_pending,
            s.program_code, s.year_level, s.section_code
     FROM institution_members im
     INNER JOIN users u ON u.uid = im.uid
     LEFT JOIN students s ON s.member_id = im.member_id
     WHERE im.institution_id = $1
     ORDER BY im.role, u.last_name, u.first_name`,
    [institutionId],
  )
  return rows.map(mapRow)
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 * @param {string} schoolId
 * @param {number | null} excludeUid
 */
async function schoolIdTaken(pool, institutionId, schoolId, excludeUid = null) {
  const id = String(schoolId || '').trim()
  if (!id) return false
  const { rows } = await pool.query(
    `SELECT 1 FROM institution_members
     WHERE institution_id = $1 AND LOWER(school_id) = LOWER($2)
       AND ($3::int IS NULL OR uid <> $3)
     LIMIT 1`,
    [institutionId, id, excludeUid],
  )
  return Boolean(rows[0])
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 * @param {object} body
 */
export async function createInstitutionUser(pool, institutionId, body) {
  const firstName = String(body.firstName || '').trim()
  const lastName = String(body.lastName || '').trim()
  const middleName = body.middleName ? String(body.middleName).trim() : null
  const email = String(body.email || '').trim().toLowerCase()
  const role = body.role
  const schoolId = String(body.schoolId || '').trim() || null
  const programCode = body.programCode ? String(body.programCode).trim() : null
  const yearLevel = body.yearLevel ? String(body.yearLevel).trim() : null
  const sectionCode = body.section ? String(body.section).trim() : null
  const password = typeof body.password === 'string' ? body.password : ''

  if (!firstName || !lastName || !email) {
    return { ok: false, status: 400, error: 'First name, last name, and email are required.' }
  }
  if (!['student', 'faculty', 'admin'].includes(role)) {
    return { ok: false, status: 400, error: 'Invalid role.' }
  }
  if (!isAllowedInstitutionalEmail(email, config.allowedEmailDomain)) {
    return { ok: false, status: 400, error: `Email must be @${config.allowedEmailDomain}.` }
  }
  const schoolIdError = validateSchoolId(schoolId, role)
  if (schoolIdError) {
    return { ok: false, status: 400, error: schoolIdError }
  }
  const yearLevelError = role === 'student' ? validateStudentYearLevel(yearLevel) : null
  if (yearLevelError) {
    return { ok: false, status: 400, error: yearLevelError }
  }
  if (await schoolIdTaken(pool, institutionId, schoolId)) {
    return { ok: false, status: 409, error: 'That student or employee ID is already in use.' }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existingEmail = await client.query(`SELECT uid FROM users WHERE LOWER(email) = $1`, [email])
    if (existingEmail.rows[0]) {
      await client.query('ROLLBACK')
      return { ok: false, status: 409, error: 'Email is already registered.' }
    }

    let passwordHash = null
    if (role === 'admin' && password) {
      passwordHash = await bcrypt.hash(password, 12)
    }

    const userInsert = await client.query(
      `INSERT INTO users (first_name, middle_name, last_name, email, password, is_super_admin)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING uid, created_at`,
      [firstName, middleName, lastName, email, passwordHash],
    )
    const uid = userInsert.rows[0].uid

    const isPending = role === 'faculty' && Boolean(body.pendingFaculty)

    const memberInsert = await client.query(
      `INSERT INTO institution_members (
         institution_id, uid, role, school_id, is_active, is_pending
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING member_id`,
      [institutionId, uid, role, schoolId, !isPending, isPending],
    )
    const memberId = memberInsert.rows[0].member_id

    if (role === 'student') {
      await upsertStudentProfile(client, memberId, {
        programCode,
        yearLevel,
        sectionCode,
      })
    }

    await client.query('COMMIT')
    const users = await listInstitutionUsers(pool, institutionId)
    const created = users.find((u) => u.uid === uid)
    return { ok: true, user: created }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 * @param {number} uid
 * @param {object} body
 */
export async function updateInstitutionUser(pool, institutionId, uid, body) {
  const firstName = String(body.firstName || '').trim()
  const lastName = String(body.lastName || '').trim()
  const middleName = body.middleName !== undefined ? (body.middleName ? String(body.middleName).trim() : null) : undefined
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined
  const schoolId = body.schoolId !== undefined ? String(body.schoolId || '').trim() || null : undefined
  const programCode =
    body.programCode !== undefined
      ? body.programCode
        ? String(body.programCode).trim()
        : null
      : undefined
  const yearLevel =
    body.yearLevel !== undefined ? (body.yearLevel ? String(body.yearLevel).trim() : null) : undefined
  const sectionCode =
    body.section !== undefined ? (body.section ? String(body.section).trim() : null) : undefined

  const member = await pool.query(
    `SELECT im.member_id, im.role, im.school_id FROM institution_members im
     WHERE im.institution_id = $1 AND im.uid = $2`,
    [institutionId, uid],
  )
  if (!member.rows[0]) {
    return { ok: false, status: 404, error: 'User not found in this institution.' }
  }

  if (email && !isAllowedInstitutionalEmail(email, config.allowedEmailDomain)) {
    return { ok: false, status: 400, error: `Email must be @${config.allowedEmailDomain}.` }
  }

  const nextSchoolId = schoolId !== undefined ? schoolId : member.rows[0].school_id
  const role = member.rows[0].role
  const schoolIdError = validateSchoolId(nextSchoolId, role)
  if (schoolIdError) {
    return { ok: false, status: 400, error: schoolIdError }
  }
  if (yearLevel !== undefined && role === 'student') {
    const yearLevelError = validateStudentYearLevel(yearLevel)
    if (yearLevelError) {
      return { ok: false, status: 400, error: yearLevelError }
    }
  }
  if (await schoolIdTaken(pool, institutionId, nextSchoolId, uid)) {
    return { ok: false, status: 409, error: 'That student or employee ID is already in use.' }
  }

  if (email) {
    const dup = await pool.query(`SELECT uid FROM users WHERE LOWER(email) = $1 AND uid <> $2`, [email, uid])
    if (dup.rows[0]) {
      return { ok: false, status: 409, error: 'Email is already registered.' }
    }
  }

  if (firstName) {
    await pool.query(`UPDATE users SET first_name = $1 WHERE uid = $2`, [firstName, uid])
  }
  if (lastName) {
    await pool.query(`UPDATE users SET last_name = $1 WHERE uid = $2`, [lastName, uid])
  }
  if (middleName !== undefined) {
    await pool.query(`UPDATE users SET middle_name = $1 WHERE uid = $2`, [middleName, uid])
  }
  if (email) {
    await pool.query(`UPDATE users SET email = $1 WHERE uid = $2`, [email, uid])
  }

  const memberUpdates = []
  const params = [institutionId, uid]
  let n = 3
  if (schoolId !== undefined) {
    memberUpdates.push(`school_id = $${n++}`)
    params.push(schoolId)
  }
  if (body.approve === true) {
    memberUpdates.push('is_pending = FALSE', 'is_active = TRUE')
  }
  if (body.deactivate === true) {
    memberUpdates.push('is_active = FALSE', 'is_pending = FALSE')
  }
  if (body.activate === true) {
    memberUpdates.push('is_active = TRUE', 'is_pending = FALSE')
  }

  if (memberUpdates.length) {
    await pool.query(
      `UPDATE institution_members SET ${memberUpdates.join(', ')}
       WHERE institution_id = $1 AND uid = $2`,
      params,
    )
  }

  if (role === 'student' && (programCode !== undefined || yearLevel !== undefined || sectionCode !== undefined)) {
    const existing = await getStudentProfile(pool, member.rows[0].member_id)
    await upsertStudentProfile(pool, member.rows[0].member_id, {
      programCode: programCode !== undefined ? programCode : existing.programCode,
      yearLevel: yearLevel !== undefined ? yearLevel : existing.yearLevel,
      sectionCode: sectionCode !== undefined ? sectionCode : existing.sectionCode,
    })
  }

  const users = await listInstitutionUsers(pool, institutionId)
  const updated = users.find((u) => u.uid === uid)
  return { ok: true, user: updated }
}
