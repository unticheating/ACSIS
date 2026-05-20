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
    `SELECT im.role
     FROM institution_members im
     JOIN institutions i ON i.institution_id = im.institution_id
     WHERE im.uid = $1 AND im.is_active = TRUE AND i.is_active = TRUE
     ORDER BY im.joined_at ASC
     LIMIT 1`,
    [uid],
  )

  if (!rows[0]) {
    return {
      portal: null,
      roleLabel: null,
      entryPath: null,
      membershipStatus: 'pending',
    }
  }

  const role = rows[0].role
  if (role === 'admin') {
    return {
      portal: 'admin',
      roleLabel: 'Administrator',
      entryPath: '/admin',
      membershipStatus: 'active',
    }
  }
  if (role === 'faculty') {
    return {
      portal: 'teacher',
      roleLabel: 'Faculty',
      entryPath: '/teacher',
      membershipStatus: 'active',
    }
  }
  return {
    portal: 'student',
    roleLabel: 'Student',
    entryPath: '/student/my-classes',
    membershipStatus: 'active',
  }
}

/**
 * @param {import('google-auth-library').TokenPayload} profile
 */
export function buildSessionWithoutDatabase(profile) {
  const { displayName } = parseNameFromGoogleProfile(profile)
  const letter = (displayName || profile.email || '?').charAt(0).toUpperCase()
  return {
    uid: 0,
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
  }
}
