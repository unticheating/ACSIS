import { Router } from 'express'
import { config } from '../config.js'
import { getPool, isDatabaseEnabled } from '../db.js'
import {
  formatAllowedDomainsHint,
  formatGoogleSignInHint,
  isGoogleSignInEmailAllowed,
  listRegisteredEmailDomains,
} from '../lib/institutionEmailDomain.js'
import {
  canResendVerification,
  createAndSendVerificationCode,
  verifyEmailCode,
} from '../lib/emailVerification.js'
import { exchangeCodeForProfile, getGoogleAuthUrl } from '../lib/googleAuth.js'
import { isSmtpConfigured } from '../lib/sendEmail.js'
import {
  clearPendingVerifyCookie,
  readPendingVerify,
  setPendingVerifyCookie,
} from '../lib/pendingVerification.js'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  setSessionCookie,
  verifySession,
} from '../lib/session.js'
import {
  authenticateAdministrator,
  sendTemporaryPasswordReset,
  setUserPassword,
} from '../lib/passwordAuth.js'
import { getBrandingForUser } from '../lib/institutionTheme.js'
import {
  buildSessionFromUid,
  buildSessionWithoutDatabase,
  findOrCreateGoogleUser,
  findPendingFacultyMembership,
  resolveUserPortal,
  sessionAllowsLogin,
} from '../lib/users.js'
import { requireAuth } from '../lib/sessionAuth.js'
import { recordTeacherActivityQuery } from '../repositories/teacherActivityRepository.js'

const router = Router()

function redirectWithError(res, code) {
  const url = new URL(config.frontendUrl)
  url.pathname = '/'
  url.searchParams.set('error', code)
  return res.redirect(url.toString())
}

function redirectToVerify(res, email) {
  const url = new URL(config.frontendUrl)
  url.pathname = '/verify'
  url.searchParams.set('email', email)
  return res.redirect(url.toString())
}

/** @param {import('express').Request} req */
function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null
  try {
    return verifySession(token)
  } catch {
    return null
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {string} email
 */
async function beginEmailVerification(pool, uid, email, res) {
  const { mailResult } = await createAndSendVerificationCode(pool, uid, email)
  setPendingVerifyCookie(res, { uid, email })
  return mailResult
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {import('express').Response} res
 * @param {{ googleSub?: string }} [opts]
 */
async function finishLoginWithoutVerification(pool, uid, res, opts = {}) {
  const session = await buildSessionFromUid(pool, uid, opts)
  if (!sessionAllowsLogin(session)) {
    return { ok: false, status: 403, error: 'Your account is not assigned to an institution yet.' }
  }
  setSessionCookie(res, session)
  clearPendingVerifyCookie(res)
  if (session.portal === 'teacher' && session.memberId) {
    void recordTeacherActivityQuery({
      teacherMemberId: session.memberId,
      eventType: 'teacher_login',
      details: 'Signed in',
    }).catch((err) => {
      console.error('[auth/teacher-login-log]', err)
    })
  }
  return { ok: true, session }
}

function recordTeacherLogin(session, details) {
  if (session?.portal !== 'teacher' || !session?.memberId) return
  void recordTeacherActivityQuery({
    teacherMemberId: session.memberId,
    eventType: 'teacher_login',
    details,
  }).catch((err) => {
    console.error('[auth/teacher-login-log]', err)
  })
}

router.get('/google', async (_req, res) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.status(503).json({
      error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    })
  }

  let hostedDomain = config.allowedEmailDomain
  const pool = getPool()
  if (pool) {
    try {
      const domains = await listRegisteredEmailDomains(pool)
      if (domains.length === 1) {
        hostedDomain = domains[0]
      } else if (domains.length > 1) {
        hostedDomain = undefined
      }
    } catch (err) {
      console.error('[auth/google] domain list failed:', err)
    }
  }

  res.redirect(getGoogleAuthUrl(hostedDomain))
})

router.get('/google/callback', async (req, res) => {
  const { code, error: oauthError } = req.query

  if (oauthError) {
    return redirectWithError(res, 'google_denied')
  }
  if (!code || typeof code !== 'string') {
    return redirectWithError(res, 'missing_code')
  }

  try {
    const profile = await exchangeCodeForProfile(code)

    if (profile.email_verified !== true) {
      return redirectWithError(res, 'email_not_verified')
    }

    const pool = getPool()
    if (pool) {
      const domainAllowed = await isGoogleSignInEmailAllowed(pool, profile.email)
      if (!domainAllowed) {
        return redirectWithError(res, 'invalid_domain')
      }
    }

    if (!pool) {
      const session = buildSessionWithoutDatabase(profile)
      setSessionCookie(res, session)
      const redirectUrl = new URL(config.frontendUrl)
      redirectUrl.pathname = session.entryPath
      redirectUrl.searchParams.set('auth', 'success')
      return res.redirect(redirectUrl.toString())
    }

    const user = await findOrCreateGoogleUser(pool, profile)
    const portalInfo = await resolveUserPortal(pool, user.uid, user.isSuperAdmin)

    // Allow them to login if they are pending BUT they need initial join.
    // If they have no portalInfo at all, they will needInitialJoin and it'll proceed.
    if (portalInfo.membershipStatus === 'pending' && portalInfo.entryPath) {
      return redirectWithError(res, 'no_membership')
    }

    const finished = await finishLoginWithoutVerification(pool, user.uid, res, {
      googleSub: profile.sub,
    })
    
    if (!finished.ok) {
      return redirectWithError(res, 'no_membership')
    }
    
    const redirectUrl = new URL(config.frontendUrl)
    redirectUrl.pathname = finished.session.entryPath || '/'
    redirectUrl.searchParams.set('auth', 'success')
    return res.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('[auth/google/callback]', err)
    return redirectWithError(res, 'auth_failed')
  }
})

router.post('/start-verification', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Email verification requires DATABASE_URL.' })
  }

  try {
    const result = await authenticateAdministrator(pool, email, password)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    if (result.session.portal === 'teacher' && result.session.memberId) {
      void recordTeacherActivityQuery({
        teacherMemberId: result.session.memberId,
        eventType: 'teacher_login',
        details: 'Signed in with password',
      }).catch((err) => {
        console.error('[auth/teacher-login-log]', err)
      })
    }

    if (!result.session.entryPath && !sessionAllowsLogin(result.session)) {
      return res.status(403).json({ error: 'Your account is not assigned to an institution yet.' })
    }

    if (!config.emailVerificationEnabled) {
      const finished = await finishLoginWithoutVerification(pool, result.session.uid, res)
      if (!finished.ok) {
        return res.status(finished.status).json({ error: finished.error })
      }
      return res.json({
        ok: true,
        email: finished.session.email,
        verificationRequired: false,
        user: finished.session,
      })
    }

    clearSessionCookie(res)
    const mailResult = await beginEmailVerification(pool, result.session.uid, result.session.email, res)
    const payload = { ok: true, email: result.session.email, verificationRequired: true }
    if (!isSmtpConfigured() || mailResult.devLogged) {
      payload.devHint =
        'SMTP is not configured or email failed. Check the API terminal for the verification code.'
    }
    return res.json(payload)
  } catch (err) {
    console.error('[auth/start-verification]', err)
    return res.status(500).json({ error: 'Could not send verification code.' })
  }
})

router.get('/verification-pending', async (req, res) => {
  const pending = readPendingVerify(req)
  if (!pending) {
    return res.status(401).json({ pending: false })
  }

  const payload = {
    pending: true,
    email: pending.email,
    codeLength: 6,
  }

  if (!isSmtpConfigured()) {
    payload.devHint = 'SMTP is not configured. Check the API terminal for the verification code.'
  }

  return res.json(payload)
})

router.post('/resend-verification', async (req, res) => {
  const pending = readPendingVerify(req)
  if (!pending) {
    return res.status(401).json({ error: 'Verification session expired. Sign in again.' })
  }

  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }

  try {
    const resend = await canResendVerification(pool, pending.uid)
    if (!resend.ok) {
      return res.status(429).json({
        error: `Please wait ${resend.waitSeconds} seconds before requesting a new code.`,
      })
    }

    const { mailResult } = await createAndSendVerificationCode(pool, pending.uid, pending.email)
    const payload = { ok: true }
    if (!isSmtpConfigured() || mailResult.devLogged) {
      payload.devHint = 'Email was not sent. Check the API terminal for the new verification code.'
    }
    return res.json(payload)
  } catch (err) {
    console.error('[auth/resend-verification]', err)
    return res.status(500).json({ error: 'Could not resend code.' })
  }
})

router.post('/verify-email', async (req, res) => {
  const pending = readPendingVerify(req)
  if (!pending) {
    return res.status(401).json({ error: 'Verification session expired. Sign in again.' })
  }

  const code = typeof req.body?.code === 'string' ? req.body.code : ''

  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }

  try {
    const verified = await verifyEmailCode(pool, pending.uid, pending.email, code)
    if (!verified.ok) {
      return res.status(400).json({ error: verified.error })
    }

    const session = await buildSessionFromUid(pool, pending.uid)
    if (!sessionAllowsLogin(session)) {
      return res.status(403).json({ error: 'Your account is not assigned to an institution yet.' })
    }

    setSessionCookie(res, session)
    clearPendingVerifyCookie(res)
    recordTeacherLogin(session, 'Verified email and signed in')

    return res.json({
      ok: true,
      user: session,
      needsJoinClass: session.portal === 'student',
    })
  } catch (err) {
    console.error('[auth/verify-email]', err)
    return res.status(500).json({ error: 'Verification failed. Please try again.' })
  }
})

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  try {
    const result = await authenticateAdministrator(getPool(), email, password)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    const pool = getPool()
    let fullSession = result.session
    try {
      if (pool) {
        fullSession = await buildSessionFromUid(pool, result.session.uid)
      }
    } catch (err) {
      console.error('[auth/login/session-build]', err)
    }

    setSessionCookie(res, fullSession)
    clearPendingVerifyCookie(res)
    recordTeacherLogin(fullSession, 'Signed in with password')
    return res.json({ ok: true, user: fullSession })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

router.post('/forgot-password', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''

  try {
    const result = await sendTemporaryPasswordReset(getPool(), email)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    const payload = {
      ok: true,
      email: result.email,
    }

    if (result.devHint) {
      payload.devHint = result.devHint
    }

    return res.json(payload)
  } catch (err) {
    console.error('[auth/forgot-password]', err)
    return res.status(500).json({ error: 'Could not send a temporary password.' })
  }
})

router.post('/change-password', async (req, res) => {
  const session = readSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Sign in again to change your password.' })
  }
  if (!session.mustChangePassword) {
    return res.status(400).json({ error: 'Password change is not required for this account.' })
  }

  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : ''

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' })
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' })
  }

  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }

  try {
    await setUserPassword(pool, session.uid, newPassword, false)
    const nextSession = await buildSessionFromUid(pool, session.uid, {
      googleSub: session.googleSub,
    })
    setSessionCookie(res, nextSession)
    return res.json({ ok: true, user: nextSession })
  } catch (err) {
    console.error('[auth/change-password]', err)
    return res.status(500).json({ error: 'Could not update your password.' })
  }
})

router.get('/me', async (req, res) => {
  const session = readSession(req)
  if (!session) {
    return res.status(401).json({ authenticated: false })
  }

  const pool = getPool()
  let freshSession = session
  if (pool && session.uid) {
    try {
      freshSession = await buildSessionFromUid(pool, session.uid, {
        googleSub: session.googleSub,
      })
      setSessionCookie(res, freshSession)
    } catch (err) {
      console.error('[auth/me] session rebuild failed:', err)
    }
  }

  let branding = null
  if (pool && session.uid) {
    try {
      branding = await getBrandingForUser(pool, session.uid, session.isSuperAdmin)
    } catch (err) {
      console.error('[auth/me] branding lookup failed:', err)
    }
  }

  return res.json({
    authenticated: true,
    user: { ...freshSession, branding },
    databaseConnected: isDatabaseEnabled(),
  })
})

router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  clearPendingVerifyCookie(res)
  res.json({ ok: true })
})

router.get('/config', async (_req, res) => {
  let allowedEmailDomains = [config.allowedEmailDomain]
  const pool = getPool()
  if (pool) {
    try {
      allowedEmailDomains = await listRegisteredEmailDomains(pool)
    } catch (err) {
      console.error('[auth/config] domain list failed:', err)
    }
  }
  res.json({
    googleEnabled: Boolean(config.google.clientId && config.google.clientSecret),
    allowedEmailDomain: config.allowedEmailDomain,
    allowedEmailDomains,
    allowedDomainsHint: formatAllowedDomainsHint(allowedEmailDomains),
    googleSignInHint: formatGoogleSignInHint(allowedEmailDomains),
    databaseConnected: isDatabaseEnabled(),
    emailVerificationEnabled: isDatabaseEnabled() && config.emailVerificationEnabled,
    smtpConfigured: isSmtpConfigured(),
  })
})

router.post('/onboarding/join', requireAuth, async (req, res) => {
  const code = typeof req.body?.accessCode === 'string' ? req.body.accessCode.trim() : ''
  if (!code) {
    return res.status(400).json({ error: 'Class join code is required.' })
  }

  const session = req.authSession
  if (!session || !session.uid) return res.status(401).json({ error: 'Not authenticated.' })

  const pool = getPool()
  if (!pool) return res.status(503).json({ error: 'Database unavailable.' })

  try {
    const { rows: clsRows } = await pool.query(
      `SELECT class_id, institution_id, class_name FROM classes 
       WHERE UPPER(access_code) = UPPER($1) AND is_active = TRUE`,
      [code]
    )
    if (!clsRows[0]) {
      return res.status(404).json({ error: 'Invalid or inactive class code.' })
    }
    const targetClass = clsRows[0]

    let memberId = null
    const { rows: memRows } = await pool.query(
      `SELECT member_id FROM institution_members 
       WHERE uid = $1 AND institution_id = $2 AND role = 'student' AND is_active = TRUE
       LIMIT 1`,
      [session.uid, targetClass.institution_id]
    )
    if (memRows[0]) {
      memberId = memRows[0].member_id
    } else {
      const { rows: insRows } = await pool.query(
        `INSERT INTO institution_members (institution_id, uid, role, is_active, is_pending)
         VALUES ($1, $2, 'student', TRUE, FALSE)
         RETURNING member_id`,
        [targetClass.institution_id, session.uid]
      )
      memberId = insRows[0].member_id
      
      await pool.query(
        `INSERT INTO students (member_id, institution_id)
         VALUES ($1, $2)
         ON CONFLICT (member_id) DO NOTHING`,
        [memberId, targetClass.institution_id]
      )
    }

    const { rows: enRows } = await pool.query(
      `SELECT enrollment_id FROM class_enrollments WHERE member_id = $1 AND class_id = $2`,
      [memberId, targetClass.class_id]
    )
    if (enRows.length === 0) {
      await pool.query(
        `INSERT INTO class_enrollments (class_id, member_id) VALUES ($1, $2)`,
        [targetClass.class_id, memberId]
      )
    }

    return res.json({ ok: true, className: targetClass.class_name })
  } catch (err) {
    console.error('[onboarding/join]', err)
    return res.status(500).json({ error: 'Internal server error.' })
  }
})

router.get('/onboarding/institutions', requireAuth, async (req, res) => {
  const pool = getPool()
  if (!pool) return res.status(503).json({ error: 'Database unavailable.' })

  try {
    const { rows } = await pool.query(
      `SELECT institution_id, institution_name, acronym, logo
       FROM institutions
       WHERE is_active = TRUE
       ORDER BY institution_name ASC`,
    )
    return res.json({
      institutions: rows.map((row) => ({
        institutionId: row.institution_id,
        institutionName: row.institution_name,
        acronym: row.acronym,
        logo: row.logo || null,
      })),
    })
  } catch (err) {
    console.error('[onboarding/institutions]', err)
    return res.status(500).json({ error: 'Could not load institutions.' })
  }
})

router.post('/onboarding/instructor', requireAuth, async (req, res) => {
  const institutionId = Number.parseInt(String(req.body?.institutionId ?? ''), 10)
  if (!Number.isFinite(institutionId) || institutionId <= 0) {
    return res.status(400).json({ error: 'Please choose an institution.' })
  }

  const session = req.authSession
  if (!session?.uid) return res.status(401).json({ error: 'Not authenticated.' })

  const pool = getPool()
  if (!pool) return res.status(503).json({ error: 'Database unavailable.' })

  try {
    const { rows: userRows } = await pool.query(
      `SELECT is_super_admin FROM users WHERE uid = $1`,
      [session.uid],
    )
    if (!userRows[0]) {
      return res.status(404).json({ error: 'User not found.' })
    }

    const portalInfo = await resolveUserPortal(pool, session.uid, userRows[0].is_super_admin)
    if (portalInfo.portal) {
      return res.status(409).json({ error: 'You already belong to an institution.' })
    }

    const pendingFaculty = await findPendingFacultyMembership(pool, session.uid)
    if (pendingFaculty) {
      return res.status(409).json({ error: 'You already have a pending faculty request.' })
    }

    const { rows: instRows } = await pool.query(
      `SELECT institution_id, institution_name
       FROM institutions
       WHERE institution_id = $1 AND is_active = TRUE`,
      [institutionId],
    )
    if (!instRows[0]) {
      return res.status(404).json({ error: 'Institution not found.' })
    }

    const { rows: existing } = await pool.query(
      `SELECT member_id, role, is_pending
       FROM institution_members
       WHERE uid = $1 AND institution_id = $2`,
      [session.uid, institutionId],
    )
    if (existing[0]) {
      if (existing[0].role === 'faculty' && existing[0].is_pending) {
        return res.json({
          ok: true,
          institutionName: instRows[0].institution_name,
          alreadyPending: true,
        })
      }
      return res.status(409).json({ error: 'You already have a membership record at this institution.' })
    }

    await pool.query(
      `INSERT INTO institution_members (institution_id, uid, role, school_id, is_active, is_pending)
       VALUES ($1, $2, 'faculty', NULL, FALSE, TRUE)`,
      [institutionId, session.uid],
    )

    return res.json({ ok: true, institutionName: instRows[0].institution_name })
  } catch (err) {
    console.error('[onboarding/instructor]', err)
    return res.status(500).json({ error: 'Could not submit your instructor request.' })
  }
})

router.post('/profile/avatar', requireAuth, async (req, res) => {
  const session = req.authSession
  if (!session?.uid) return res.status(401).json({ error: 'Not authenticated.' })

  const pool = getPool()
  if (!pool) return res.status(503).json({ error: 'Database unavailable.' })

  const { avatarDataUrl } = req.body ?? {}
  if (typeof avatarDataUrl !== 'string' || !avatarDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image data.' })
  }
  // Limit to ~3MB base64
  if (avatarDataUrl.length > 4 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image too large. Please use an image under 3 MB.' })
  }

  try {
    await pool.query('UPDATE users SET avatar_url = $1 WHERE uid = $2', [avatarDataUrl, session.uid])
    // Refresh and re-issue the session cookie
    const nextSession = await buildSessionFromUid(pool, session.uid, { googleSub: session.googleSub })
    setSessionCookie(res, nextSession)
    return res.json({ ok: true, avatarUrl: avatarDataUrl })
  } catch (err) {
    console.error('[auth/profile/avatar]', err)
    return res.status(500).json({ error: 'Failed to update profile picture.' })
  }
})

export default router
