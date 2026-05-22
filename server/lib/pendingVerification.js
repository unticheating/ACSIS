import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export const PENDING_VERIFY_COOKIE = 'acsis_pending_verify'

/**
 * @typedef {{ uid: number, email: string, typ: 'pending_verify' }} PendingVerifyPayload
 */

/** @param {{ uid: number, email: string }} data */
export function signPendingVerify(data) {
  return jwt.sign(
    { uid: data.uid, email: data.email.toLowerCase(), typ: 'pending_verify' },
    config.sessionSecret,
    { expiresIn: '15m' },
  )
}

/** @param {string} token */
export function verifyPendingVerify(token) {
  const payload = jwt.verify(token, config.sessionSecret)
  if (payload.typ !== 'pending_verify' || !payload.uid || !payload.email) {
    throw new Error('Invalid pending verification token')
  }
  return /** @type {PendingVerifyPayload} */ (payload)
}

/** @param {import('express').Response} res @param {{ uid: number, email: string }} data */
export function setPendingVerifyCookie(res, data) {
  res.cookie(PENDING_VERIFY_COOKIE, signPendingVerify(data), {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  })
}

/** @param {import('express').Response} res */
export function clearPendingVerifyCookie(res) {
  res.clearCookie(PENDING_VERIFY_COOKIE, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

/** @param {import('express').Request} req */
export function readPendingVerify(req) {
  const token = req.cookies?.[PENDING_VERIFY_COOKIE]
  if (!token) return null
  try {
    return verifyPendingVerify(token)
  } catch {
    return null
  }
}
