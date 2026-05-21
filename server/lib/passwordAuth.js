import bcrypt from 'bcrypt'
import { config } from '../config.js'
import { resolveUserPortal } from './users.js'

const ADMIN_PORTALS = new Set(['admin', 'super_admin'])

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
        `SELECT uid, first_name, last_name, email, password, is_super_admin, google_sub, avatar_url
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
    if (!ADMIN_PORTALS.has(portalInfo.portal)) {
      return {
        ok: false,
        status: 403,
        error:
          'This sign-in is for administrators only. Students and faculty should use Sign in with Google.',
      }
    }

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
