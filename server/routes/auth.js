import { Router } from 'express'
import { config } from '../config.js'
import { getPool, isDatabaseEnabled } from '../db.js'
import { isAllowedInstitutionalEmail } from '../lib/emailDomain.js'
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
import { authenticateAdministrator } from '../lib/passwordAuth.js'
import { getBrandingForUser } from '../lib/institutionTheme.js'
import {
  buildSessionFromUid,
  buildSessionWithoutDatabase,
  ensureGoogleStudentMembership,
  findOrCreateGoogleUser,
  resolveUserPortal,
} from '../lib/users.js'

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

router.get('/google', (_req, res) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.status(503).json({
      error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    })
  }
  res.redirect(getGoogleAuthUrl())
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

    if (!isAllowedInstitutionalEmail(profile.email, config.allowedEmailDomain)) {
      return redirectWithError(res, 'invalid_domain')
    }

    const pool = getPool()
    if (!pool) {
      const session = buildSessionWithoutDatabase(profile)
      setSessionCookie(res, session)
      const redirectUrl = new URL(config.frontendUrl)
      redirectUrl.pathname = session.entryPath
      redirectUrl.searchParams.set('auth', 'success')
      return res.redirect(redirectUrl.toString())
    }

    const user = await findOrCreateGoogleUser(pool, profile)
    await ensureGoogleStudentMembership(pool, user.uid, user.isSuperAdmin)
    const portalInfo = await resolveUserPortal(pool, user.uid, user.isSuperAdmin)

    if (portalInfo.membershipStatus === 'pending' || !portalInfo.entryPath) {
      return redirectWithError(res, 'no_membership')
    }

    clearSessionCookie(res)
    await beginEmailVerification(pool, user.uid, user.email, res)
    return redirectToVerify(res, user.email)
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

    if (!result.session.entryPath) {
      return res.status(403).json({ error: 'Your account is not assigned to an institution yet.' })
    }

    clearSessionCookie(res)
    const mailResult = await beginEmailVerification(pool, result.session.uid, result.session.email, res)
    const payload = { ok: true, email: result.session.email }
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
    if (!session.entryPath) {
      return res.status(403).json({ error: 'Your account is not assigned to an institution yet.' })
    }

    setSessionCookie(res, session)
    clearPendingVerifyCookie(res)

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
    setSessionCookie(res, result.session)
    clearPendingVerifyCookie(res)
    return res.json({ ok: true, user: result.session })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

router.get('/me', async (req, res) => {
  const session = readSession(req)
  if (!session) {
    return res.status(401).json({ authenticated: false })
  }

  let branding = null
  const pool = getPool()
  if (pool && session.uid) {
    try {
      branding = await getBrandingForUser(pool, session.uid, session.isSuperAdmin)
    } catch (err) {
      console.error('[auth/me] branding lookup failed:', err)
    }
  }

  return res.json({
    authenticated: true,
    user: { ...session, branding },
    databaseConnected: isDatabaseEnabled(),
  })
})

router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  clearPendingVerifyCookie(res)
  res.json({ ok: true })
})

router.get('/config', (_req, res) => {
  res.json({
    googleEnabled: Boolean(config.google.clientId && config.google.clientSecret),
    allowedEmailDomain: config.allowedEmailDomain,
    databaseConnected: isDatabaseEnabled(),
    emailVerificationEnabled: isDatabaseEnabled(),
    smtpConfigured: isSmtpConfigured(),
  })
})

export default router
