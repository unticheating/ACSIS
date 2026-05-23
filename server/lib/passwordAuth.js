import bcrypt from 'bcrypt'
import { randomInt } from 'node:crypto'
import { config } from '../config.js'
import { sendTemporaryPasswordEmail } from './sendEmail.js'
import { resolveUserPortal } from './users.js'

const ADMIN_PORTALS = new Set(['admin', 'super_admin'])
const TEMP_PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateTemporaryPassword(length = 10) {
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += TEMP_PASSWORD_CHARSET[randomInt(TEMP_PASSWORD_CHARSET.length)]
  }
  return password
}

/**
 * @param {import('pg').Pool | null} pool
 * @param {string} email
 * @param {string} password
 */
export async function authenticateAdministrator(pool, email, password) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) {
    return { ok: false, status: 400, error: 'Email and password are required.' }
  }

  if (pool) {
    let rows
    try {
      const result = await pool.query(
        `SELECT uid, first_name, last_name, email, password, is_super_admin, google_sub, avatar_url,
                COALESCE(password_reset_required, FALSE) AS password_reset_required
         FROM users
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [normalizedEmail],
      )
      rows = result.rows
    } catch (err) {
      console.error('[auth] database error:', err)
      return {
        ok: false,
        status: 503,
        error:
          'Cannot reach the database. Start PostgreSQL, check DATABASE_URL in .env, and restart npm run dev:api.',
      }
    }
    const user = rows?.[0]
    if (!user?.password) {
      return { ok: false, status: 401, error: 'Invalid email or password.' }
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return { ok: false, status: 401, error: 'Invalid email or password.' }
    }

    const portalInfo = await resolveUserPortal(pool, user.uid, user.is_super_admin)
    // Removed admin-only portal restriction for testing purposes
    /*
    if (!ADMIN_PORTALS.has(portalInfo.portal)) {
      return {
        ok: false,
        status: 403,
        error:
          'This sign-in is for administrators only. Students and faculty should use Sign in with Google.',
      }
    }
    */

    const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email
    return {
      ok: true,
      session: {
        uid: user.uid,
        email: user.email,
        googleSub: user.google_sub || '',
        displayName,
        avatarLetter: displayName.charAt(0).toUpperCase(),
        avatarUrl: user.avatar_url,
        isSuperAdmin: user.is_super_admin,
        portal: portalInfo.portal,
        roleLabel: portalInfo.roleLabel,
        entryPath: portalInfo.entryPath,
        membershipStatus: portalInfo.membershipStatus,
        mustChangePassword: Boolean(user.password_reset_required),
      },
    }
  }

  if (
    config.adminDevEmail &&
    config.adminDevPassword &&
    normalizedEmail === config.adminDevEmail.toLowerCase() &&
    password === config.adminDevPassword
  ) {
    return {
      ok: true,
      session: {
        uid: 1,
        email: normalizedEmail,
        googleSub: '',
        displayName: 'PLP Admin',
        avatarLetter: 'A',
        avatarUrl: null,
        isSuperAdmin: false,
        portal: 'admin',
        roleLabel: 'Administrator',
        entryPath: '/admin',
        membershipStatus: 'active',
        mustChangePassword: false,
      },
    }
  }

  if (!pool) {
    return {
      ok: false,
      status: 503,
      error:
        'Administrator login is not configured. Set DATABASE_URL or ADMIN_DEV_EMAIL and ADMIN_DEV_PASSWORD in .env',
    }
  }

  return { ok: false, status: 401, error: 'Invalid email or password.' }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {string} passwordHash
 * @param {boolean} mustChangePassword
 */
async function updatePasswordRecord(pool, uid, passwordHash, mustChangePassword) {
  await pool.query(
    `UPDATE users
     SET password = $1,
         password_reset_required = $2
     WHERE uid = $3`,
    [passwordHash, mustChangePassword, uid],
  )
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {string} password
 * @param {boolean} [mustChangePassword]
 */
export async function setUserPassword(pool, uid, password, mustChangePassword = false) {
  const passwordHash = await bcrypt.hash(password, 12)
  await updatePasswordRecord(pool, uid, passwordHash, mustChangePassword)
}

/**
 * Generate and email a new temporary password for an existing account.
 * @param {import('pg').Pool | null} pool
 * @param {string} email
 */
export async function sendTemporaryPasswordReset(pool, email) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { ok: false, status: 400, error: 'Email is required.' }
  }

  if (!pool) {
    return {
      ok: false,
      status: 503,
      error: 'Password reset requires DATABASE_URL.',
    }
  }

  let rows
  try {
    const result = await pool.query(
      `SELECT uid, email
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail],
    )
    rows = result.rows
  } catch (err) {
    console.error('[auth/reset-password] database error:', err)
    return {
      ok: false,
      status: 503,
      error:
        'Cannot reach the database. Start PostgreSQL, check DATABASE_URL in .env, and restart npm run dev:api.',
    }
  }

  const user = rows?.[0]
  if (!user) {
    return { ok: false, status: 404, error: 'No account found for that email address.' }
  }

  const temporaryPassword = generateTemporaryPassword()

  try {
    await setUserPassword(pool, user.uid, temporaryPassword, true)
    const mailResult = await sendTemporaryPasswordEmail(user.email, temporaryPassword)
    return {
      ok: true,
      email: user.email,
      mailResult,
      devHint: !mailResult.sent
        ? 'SMTP is not configured or email failed. Check the API terminal for the temporary password.'
        : null,
    }
  } catch (err) {
    console.error('[auth/reset-password] failed:', err)
    return { ok: false, status: 500, error: 'Could not generate a temporary password.' }
  }
}
