import { getPool, isDatabaseEnabled } from '../db.js'
import { SESSION_COOKIE, verifySession } from './session.js'

/** @param {import('express').Request} req */
export function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null
  try {
    return verifySession(token)
  } catch {
    return null
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  const session = readSession(req)
  if (!session?.uid) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }
  req.authSession = session
  return next()
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireInstitutionAdmin(req, res, next) {
  const session = req.authSession
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  const allowed = session.portal === 'admin' || session.portal === 'super_admin' || session.isSuperAdmin
  if (!allowed) {
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  if (!isDatabaseEnabled()) {
    return res.status(503).json({ error: 'DATABASE_URL is not configured.' })
  }

  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }

  try {
    if (session.isSuperAdmin || session.portal === 'super_admin') {
      const { rows } = await pool.query(
        `SELECT institution_id FROM institutions WHERE is_active = TRUE ORDER BY institution_id ASC LIMIT 1`,
      )
      if (!rows[0]) {
        return res.status(503).json({ error: 'No active institution found.' })
      }
      req.institutionId = rows[0].institution_id
      return next()
    }

    const { rows } = await pool.query(
      `SELECT im.institution_id
       FROM institution_members im
       JOIN institutions i ON i.institution_id = im.institution_id
       WHERE im.uid = $1 AND im.role = 'admin' AND im.is_active = TRUE AND i.is_active = TRUE
       LIMIT 1`,
      [session.uid],
    )
    if (!rows[0]) {
      return res.status(403).json({ error: 'You are not an institution administrator.' })
    }
    req.institutionId = rows[0].institution_id
    return next()
  } catch (err) {
    console.error('[requireInstitutionAdmin]', err)
    return res.status(503).json({ error: 'Database error.' })
  }
}
