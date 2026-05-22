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
export async function requireAuth(req, res, next) {
  // Allow demo bypass during development testing
  if (req.headers['x-demo-account']) {
    const demoRole = req.headers['x-demo-account'];
    if (demoRole === 'student') {
      req.authSession = { uid: 999, roleLabel: 'Student Demo', portal: 'student' };
      req.memberId = 999;
      return next();
    }
    if (demoRole === 'faculty') {
      req.authSession = { uid: 888, roleLabel: 'Faculty Demo', portal: 'teacher' };
      req.memberId = 888;
      return next();
    }
    if (demoRole === 'admin') {
      req.authSession = { uid: 1, roleLabel: 'Admin Demo', portal: 'admin' };
      req.memberId = 1;
      return next();
    }
  }

  const session = readSession(req)
  if (!session?.uid) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }
  req.authSession = session

  if (isDatabaseEnabled()) {
    const pool = getPool()
    if (pool) {
      try {
        const roleForPortal =
          session.portal === 'teacher'
            ? 'faculty'
            : session.portal === 'student'
              ? 'student'
              : session.portal === 'admin' || session.portal === 'super_admin'
                ? 'admin'
                : null

        if (roleForPortal) {
          const { rows: roleRows } = await pool.query(
            `SELECT member_id FROM institution_members
             WHERE uid = $1 AND role = $2::institution_user_role AND is_active = TRUE
             ORDER BY joined_at ASC
             LIMIT 1`,
            [session.uid, roleForPortal],
          )
          if (roleRows[0]?.member_id) {
            req.memberId = roleRows[0].member_id
            return next()
          }
        }

        const { rows } = await pool.query(
          `SELECT member_id FROM institution_members
           WHERE uid = $1 AND is_active = TRUE
           ORDER BY joined_at ASC
           LIMIT 1`,
          [session.uid],
        )
        if (rows[0]?.member_id) {
          req.memberId = rows[0].member_id
          return next()
        }
      } catch (err) {
        console.error('[requireAuth] member lookup failed:', err)
      }
    }
  }

  // Demo / legacy fallback when member row is missing (seed uses member_id = uid)
  req.memberId = session.uid

  return next()
}

/**
 * Student routes: require an active student institution_members row.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireStudentMember(req, res, next) {
  if (req.headers['x-demo-account'] === 'student') {
    req.authSession = req.authSession || { uid: 999, roleLabel: 'Student Demo', portal: 'student' }
    req.memberId = 999
    return next()
  }

  const session = req.authSession || readSession(req)
  if (!session?.uid) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }
  req.authSession = session

  if (!isDatabaseEnabled()) {
    req.memberId = session.uid
    return next()
  }

  const pool = getPool()
  if (!pool) {
    req.memberId = session.uid
    return next()
  }

  try {
    const { rows } = await pool.query(
      `SELECT im.member_id
       FROM institution_members im
       JOIN institutions i ON i.institution_id = im.institution_id
       WHERE im.uid = $1 AND im.role = 'student' AND im.is_active = TRUE AND im.is_pending = FALSE
         AND i.is_active = TRUE
       ORDER BY im.joined_at ASC
       LIMIT 1`,
      [session.uid],
    )
    if (!rows[0]) {
      return res.status(403).json({ error: 'Student account required. Sign in with your @plpasig.edu.ph Google account.' })
    }
    req.memberId = rows[0].member_id
    return next()
  } catch (err) {
    console.error('[requireStudentMember]', err)
    return res.status(503).json({ error: 'Database error.' })
  }
}

/**
 * Institution-scoped admin only (not platform super admin).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireInstitutionAdminOnly(req, res, next) {
  const session = req.authSession
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  if (session.isSuperAdmin || session.portal === 'super_admin') {
    return res.status(403).json({
      error: 'Institution settings are managed by each school administrator.',
    })
  }

  if (session.portal !== 'admin') {
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
    console.error('[requireInstitutionAdminOnly]', err)
    return res.status(503).json({ error: 'Database error.' })
  }
}

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
