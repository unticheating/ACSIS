import { ensureStudentRow, getStudentNumber } from './studentProfile.js'

/** @typedef {'admin' | 'teacher' | 'student' | 'super_admin'} Portal */

/**
 * @param {import('google-auth-library').TokenPayload} profile
 */
export function parseNameFromGoogleProfile(profile) {
  const given = (profile.given_name || '').trim()
  const family = (profile.family_name || '').trim()
  if (given || family) {
    return {
      firstName: given || 'User',
      middleName: null,
      lastName: family || given || 'Account',
      displayName: [given, family].filter(Boolean).join(' ') || profile.name || profile.email,
    }
  }
  const full = (profile.name || profile.email || 'User').trim()
  const parts = full.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: null, lastName: 'User', displayName: full }
  }
  return {
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
    lastName: parts[parts.length - 1],
    displayName: full,
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('google-auth-library').TokenPayload} profile
 */
export async function findOrCreateGoogleUser(pool, profile) {
  const email = profile.email.toLowerCase()
  const googleSub = profile.sub
  const { firstName, middleName, lastName, displayName } = parseNameFromGoogleProfile(profile)
  const avatarUrl = profile.picture || null

  const existing = await pool.query(
    `SELECT uid, first_name, middle_name, last_name, email, is_super_admin, google_sub, avatar_url
     FROM users
     WHERE google_sub = $1 OR LOWER(email) = $2
     LIMIT 1`,
    [googleSub, email],
  )

  if (existing.rows[0]) {
    const row = existing.rows[0]
    await pool.query(
      `UPDATE users
       SET google_sub = $1,
           avatar_url = COALESCE($2, avatar_url),
           first_name = COALESCE(NULLIF($3, ''), first_name),
           last_name = COALESCE(NULLIF($4, ''), last_name)
       WHERE uid = $5`,
      [googleSub, avatarUrl, firstName, lastName, row.uid],
    )
    return {
      uid: row.uid,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      isSuperAdmin: row.is_super_admin,
      displayName: displayName || `${row.first_name} ${row.last_name}`.trim(),
      avatarUrl: avatarUrl || row.avatar_url,
    }
  }

  const inserted = await pool.query(
    `INSERT INTO users (first_name, middle_name, last_name, email, password, is_super_admin, google_sub, avatar_url)
     VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
     RETURNING uid, first_name, last_name, email, is_super_admin, avatar_url`,
    [firstName, middleName, lastName, email, '', googleSub, avatarUrl],
  )
  const row = inserted.rows[0]
  return {
    uid: row.uid,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    isSuperAdmin: row.is_super_admin,
    displayName,
    avatarUrl: row.avatar_url,
  }
}

// ensureGoogleStudentMembership removed for dynamic onboarding

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @returns {Promise<{ portal: Portal | null, roleLabel: string | null, entryPath: string | null, membershipStatus: 'pending' | 'active' }>}
 */
export async function resolveUserPortal(pool, uid, isSuperAdmin) {
  if (isSuperAdmin) {
    return {
      portal: 'super_admin',
      roleLabel: 'Super administrator',
      entryPath: '/super-admin',
      membershipStatus: 'active',
    }
  }

  const { rows } = await pool.query(
    `SELECT im.role, im.member_id
     FROM institution_members im
     JOIN institutions i ON i.institution_id = im.institution_id
     WHERE im.uid = $1 AND im.is_active = TRUE AND im.is_pending = FALSE AND i.is_active = TRUE
     ORDER BY
       CASE im.role WHEN 'admin' THEN 1 WHEN 'faculty' THEN 2 ELSE 3 END,
       im.joined_at ASC
     LIMIT 1`,
    [uid],
  )

  if (!rows[0]) {
    return {
      portal: null,
      roleLabel: null,
      entryPath: null,
      membershipStatus: 'pending',
      memberId: null,
    }
  }

  const role = rows[0].role
  const memberId = rows[0].member_id
  if (role === 'admin') {
    return {
      portal: 'admin',
      roleLabel: 'Administrator',
      entryPath: '/admin',
      membershipStatus: 'active',
      memberId,
    }
  }
  if (role === 'faculty') {
    return {
      portal: 'teacher',
      roleLabel: 'Faculty',
      entryPath: '/teacher',
      membershipStatus: 'active',
      memberId,
    }
  }
  return {
    portal: 'student',
    roleLabel: 'Student',
    entryPath: '/student/my-classes',
    membershipStatus: 'active',
    memberId,
  }
}

/**
 * @param {import('google-auth-library').TokenPayload} profile
 */
/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {{ googleSub?: string }} [opts]
 */
export async function buildSessionFromUid(pool, uid, opts = {}) {
  const { rows } = await pool.query(
    `SELECT uid, first_name, last_name, email, is_super_admin, google_sub, avatar_url,
            COALESCE(password_reset_required, FALSE) AS password_reset_required
     FROM users WHERE uid = $1`,
    [uid],
  )
  const user = rows[0]
  if (!user) {
    throw new Error('User not found')
  }

  const portalInfo = await resolveUserPortal(pool, uid, user.is_super_admin)
  const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email

  let needsStudentNumber = false
  let needsJoinClass = false
  let needsInitialJoin = false

  if (portalInfo.portal === null && !user.is_super_admin) {
    needsInitialJoin = true
    portalInfo.portal = 'student'
    portalInfo.roleLabel = 'Student'
    portalInfo.entryPath = '/student/my-classes'
    portalInfo.membershipStatus = 'active'
  }

  let studentNumber = null
  if (portalInfo.portal === 'student' && portalInfo.memberId) {
    studentNumber = await getStudentNumber(pool, portalInfo.memberId)
    if (!studentNumber) {
      needsStudentNumber = true
    }

    const { rows: enRows } = await pool.query(
      `SELECT 1 FROM class_enrollments WHERE member_id = $1 LIMIT 1`,
      [portalInfo.memberId]
    )
    if (enRows.length === 0) {
      needsJoinClass = true
    }
  }

  return {
    uid: user.uid,
    memberId: portalInfo.memberId ?? null,
    email: user.email,
    googleSub: opts.googleSub || user.google_sub || '',
    displayName,
    avatarLetter: displayName.charAt(0).toUpperCase(),
    avatarUrl: user.avatar_url,
    isSuperAdmin: user.is_super_admin,
    portal: portalInfo.portal,
    roleLabel: portalInfo.roleLabel,
    entryPath: portalInfo.entryPath,
    membershipStatus: portalInfo.membershipStatus,
    mustChangePassword: Boolean(user.password_reset_required),
    needsInitialJoin,
    needsStudentNumber,
    needsJoinClass,
    studentNumber,
  }
}

export function buildSessionWithoutDatabase(profile) {
  const { displayName } = parseNameFromGoogleProfile(profile)
  const letter = (displayName || profile.email || '?').charAt(0).toUpperCase()
  return {
    uid: 0,
    memberId: null,
    email: profile.email.toLowerCase(),
    googleSub: profile.sub,
    displayName,
    avatarLetter: letter,
    avatarUrl: profile.picture || null,
    isSuperAdmin: false,
    portal: /** @type {Portal} */ ('student'),
    roleLabel: 'Student (dev — no database)',
    entryPath: '/student/my-classes',
    membershipStatus: /** @type {'active'} */ ('active'),
    mustChangePassword: false,
  }
}
