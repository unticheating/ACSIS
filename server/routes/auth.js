import { Router } from 'express'
import { config } from '../config.js'
import { getPool, isDatabaseEnabled } from '../db.js'
import { isAllowedInstitutionalEmail } from '../lib/emailDomain.js'
import { exchangeCodeForProfile, getGoogleAuthUrl } from '../lib/googleAuth.js'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  setSessionCookie,
  verifySession,
} from '../lib/session.js'
import {
  buildSessionWithoutDatabase,
  findOrCreateGoogleUser,
  parseNameFromGoogleProfile,
  resolveUserPortal,
} from '../lib/users.js'

const router = Router()

function redirectWithError(res, code) {
  const url = new URL(config.frontendUrl)
  url.pathname = '/'
  url.searchParams.set('error', code)
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

    let session

    const pool = getPool()
    if (pool) {
      const user = await findOrCreateGoogleUser(pool, profile)
      const portalInfo = await resolveUserPortal(pool, user.uid, user.isSuperAdmin)
      const displayName = user.displayName || `${user.firstName} ${user.lastName}`.trim()
      const avatarLetter = displayName.charAt(0).toUpperCase()

      session = {
        uid: user.uid,
        email: user.email,
        googleSub: profile.sub,
        displayName,
        avatarLetter,
        avatarUrl: user.avatarUrl,
        isSuperAdmin: user.isSuperAdmin,
        portal: portalInfo.portal,
        roleLabel: portalInfo.roleLabel,
        entryPath: portalInfo.entryPath,
        membershipStatus: portalInfo.membershipStatus,
      }
    } else {
      session = buildSessionWithoutDatabase(profile)
    }

    setSessionCookie(res, session)

    const redirectUrl = new URL(config.frontendUrl)
    if (session.membershipStatus === 'pending' || !session.entryPath) {
      redirectUrl.pathname = '/'
      redirectUrl.searchParams.set('error', 'no_membership')
      return res.redirect(redirectUrl.toString())
    }

    redirectUrl.pathname = session.entryPath
    redirectUrl.searchParams.set('auth', 'success')
    return res.redirect(redirectUrl.toString())
  } catch (err) {
    console.error('[auth/google/callback]', err)
    return redirectWithError(res, 'auth_failed')
  }
})

router.get('/me', (req, res) => {
  const session = readSession(req)
  if (!session) {
    return res.status(401).json({ authenticated: false })
  }
  return res.json({
    authenticated: true,
    user: session,
    databaseConnected: isDatabaseEnabled(),
  })
})

router.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

router.get('/config', (_req, res) => {
  res.json({
    googleEnabled: Boolean(config.google.clientId && config.google.clientSecret),
    allowedEmailDomain: config.allowedEmailDomain,
    databaseConnected: isDatabaseEnabled(),
  })
})

export default router
