import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export const SESSION_COOKIE = 'acsis_session'

/**
 * @typedef {object} SessionPayload
 * @property {number} uid
 * @property {string} email
 * @property {string} googleSub
 * @property {string} displayName
 * @property {string} avatarLetter
 * @property {string | null} avatarUrl
 * @property {boolean} isSuperAdmin
 * @property {'admin' | 'teacher' | 'student' | 'super_admin' | null} portal
 * @property {string | null} roleLabel
 * @property {string | null} entryPath
 * @property {'pending' | 'active'} membershipStatus
 * @property {boolean} [mustChangePassword]
 */

/** @param {SessionPayload} payload */
export function signSession(payload) {
  return jwt.sign(payload, config.sessionSecret, { expiresIn: '7d' })
}

/** @param {string} token */
export function verifySession(token) {
  return /** @type {SessionPayload} */ (jwt.verify(token, config.sessionSecret))
}

/** @param {import('express').Response} res @param {SessionPayload} payload */
export function setSessionCookie(res, payload) {
  // Never embed base64 data URLs in the JWT cookie — they cause HTTP header overflow.
  // Only keep short external URLs (e.g. Google profile pictures).
  const safeAvatarUrl =
    typeof payload.avatarUrl === 'string' && payload.avatarUrl.startsWith('data:')
      ? null
      : payload.avatarUrl ?? null

  const cookiePayload = { ...payload, avatarUrl: safeAvatarUrl }

  res.cookie(SESSION_COOKIE, signSession(cookiePayload), {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

/** @param {import('express').Response} res */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  })
}
