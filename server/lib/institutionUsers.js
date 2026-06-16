import bcrypt from 'bcrypt'
import {
  getInstitutionEmailDomain,
  validateUserEmailForRole,
} from './institutionEmailDomain.js'
import { SQL_JOIN_STUDENTS, SQL_MEMBER_SCHOOL_ID } from './memberSql.js'
import { ensureStudentRow, upsertStudentNumber } from './studentProfile.js'

const SCHOOL_ID_REGEX = /^\d{2}-\d{5}$/

function validateSchoolId(schoolId, role) {
  const id = String(schoolId || '').trim()
  if (!id) {
    return role === 'student' ? 'Student number is required.' : null
  }
  if (role === 'student') {
    if (!SCHOOL_ID_REGEX.test(id)) {
      return 'Student number must follow format 00-00000 (example: 24-00123).'
    }
    return null
  }
  if (id.length > 50) {
    return 'Employee ID must be 50 characters or fewer.'
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
    dateCreated: row.created_at,
    isSuperAdmin: row.is_super_admin,
    avatarUrl: row.avatar_url || null,
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 */
export async function listInstitutionUsers(pool, institutionId) {
  const { rows } = await pool.query(
    `SELECT u.uid, u.first_name, u.middle_name, u.last_name, u.suffix, u.email, u.created_at, u.is_super_admin, u.avatar_url,
            im.member_id, im.role, ${SQL_MEMBER_SCHOOL_ID} AS school_id, im.is_active, im.is_pending
     FROM institution_members im
     INNER JOIN users u ON u.uid = im.uid
     ${SQL_JOIN_STUDENTS}
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
    `SELECT 1
     FROM institution_members im
     ${SQL_JOIN_STUDENTS}
     WHERE im.institution_id = $1
       AND (
         (im.role = 'student' AND LOWER(st.student_number) = LOWER($2))
         OR (im.role <> 'student' AND LOWER(im.school_id) = LOWER($2))
       )
       AND ($3::int IS NULL OR im.uid <> $3)
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
  const password = typeof body.password === 'string' ? body.password : ''

  if (!firstName || !lastName || !email) {
    return { ok: false, status: 400, error: 'First name, last name, and email are required.' }
  }
  if (!['student', 'faculty', 'admin'].includes(role)) {
    return { ok: false, status: 400, error: 'Invalid role.' }
  }
  const institutionDomain = await getInstitutionEmailDomain(pool, institutionId)
  const emailCheck = validateUserEmailForRole(email, role, institutionDomain)
  if (!emailCheck.ok) {
    return { ok: false, status: 400, error: emailCheck.error }
  }
  const schoolIdError = validateSchoolId(schoolId, role)
  if (schoolIdError) {
    return { ok: false, status: 400, error: schoolIdError }
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
    const memberSchoolId = role === 'student' ? null : schoolId

    const memberInsert = await client.query(
      `INSERT INTO institution_members (
         institution_id, uid, role, school_id, is_active, is_pending
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING member_id`,
      [institutionId, uid, role, memberSchoolId, !isPending, isPending],
    )
    const memberId = memberInsert.rows[0].member_id

    if (role === 'student') {
      await upsertStudentNumber(client, memberId, institutionId, schoolId)
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
  const firstName = body.firstName !== undefined ? String(body.firstName || '').trim() : undefined
  const lastName = body.lastName !== undefined ? String(body.lastName || '').trim() : undefined
  const middleName = body.middleName !== undefined ? (body.middleName ? String(body.middleName).trim() : null) : undefined
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined
  const schoolId = body.schoolId !== undefined ? String(body.schoolId || '').trim() || null : undefined
  const requestedRole =
    body.role && ['student', 'faculty', 'admin'].includes(body.role) ? body.role : null

  const member = await pool.query(
    `SELECT im.member_id, im.role, im.is_pending, ${SQL_MEMBER_SCHOOL_ID} AS school_id, u.is_super_admin
     FROM institution_members im
     INNER JOIN users u ON u.uid = im.uid
     ${SQL_JOIN_STUDENTS}
     WHERE im.institution_id = $1 AND im.uid = $2`,
    [institutionId, uid],
  )
  if (!member.rows[0]) {
    return { ok: false, status: 404, error: 'User not found in this institution.' }
  }

  if (body.reject === true) {
    if (!member.rows[0].is_pending) {
      return { ok: false, status: 400, error: 'Only pending requests can be rejected.' }
    }
    await pool.query(`DELETE FROM institution_members WHERE institution_id = $1 AND uid = $2`, [
      institutionId,
      uid,
    ])
    return { ok: true, rejected: true }
  }

  if (member.rows[0].is_super_admin && requestedRole && requestedRole !== member.rows[0].role) {
    return { ok: false, status: 400, error: 'Super administrator role cannot be changed here.' }
  }

  const currentRole = member.rows[0].role
  const memberId = member.rows[0].member_id
  const role = requestedRole || currentRole
  const roleChanged = Boolean(requestedRole && requestedRole !== currentRole)

  if (email) {
    const institutionDomain = await getInstitutionEmailDomain(pool, institutionId)
    const emailCheck = validateUserEmailForRole(email, role, institutionDomain)
    if (!emailCheck.ok) {
      return { ok: false, status: 400, error: emailCheck.error }
    }
  }

  const nextSchoolId =
    schoolId !== undefined ? schoolId : role === 'student' ? member.rows[0].school_id : member.rows[0].school_id
  const schoolIdError = validateSchoolId(nextSchoolId, role)
  if (schoolIdError) {
    return { ok: false, status: 400, error: schoolIdError }
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

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (firstName) {
      await client.query(`UPDATE users SET first_name = $1 WHERE uid = $2`, [firstName, uid])
    }
    if (lastName) {
      await client.query(`UPDATE users SET last_name = $1 WHERE uid = $2`, [lastName, uid])
    }
    if (middleName !== undefined) {
      await client.query(`UPDATE users SET middle_name = $1 WHERE uid = $2`, [middleName, uid])
    }
    if (email) {
      await client.query(`UPDATE users SET email = $1 WHERE uid = $2`, [email, uid])
    }

    const memberUpdates = []
    const params = [institutionId, uid]
    let n = 3

    if (roleChanged) {
      memberUpdates.push(`role = $${n++}`)
      params.push(requestedRole)
      if (requestedRole === 'student') {
        memberUpdates.push('school_id = NULL')
      } else if (currentRole === 'student') {
        memberUpdates.push(`school_id = $${n++}`)
        params.push(schoolId !== undefined ? schoolId : null)
      }
    } else if (schoolId !== undefined && role !== 'student') {
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
      await client.query(
        `UPDATE institution_members SET ${memberUpdates.join(', ')}
         WHERE institution_id = $1 AND uid = $2`,
        params,
      )
    }

    if (role === 'student' && (schoolId !== undefined || roleChanged)) {
      await upsertStudentNumber(client, memberId, institutionId, nextSchoolId)
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const users = await listInstitutionUsers(pool, institutionId)
  const updated = users.find((u) => u.uid === uid)
  return { ok: true, user: updated }
}
