import bcrypt from 'bcrypt'
import { randomInt } from 'node:crypto'
import { sendVerificationEmail } from './sendEmail.js'

const CODE_LENGTH = 6
const CODE_TTL_MS = 15 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

function generateCode() {
  return String(randomInt(10 ** (CODE_LENGTH - 1), 10 ** CODE_LENGTH))
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {string} email
 */
export async function createAndSendVerificationCode(pool, uid, email) {
  const normalizedEmail = email.trim().toLowerCase()
  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)

  await pool.query(
    `UPDATE email_verification_codes SET used_at = NOW()
     WHERE uid = $1 AND used_at IS NULL`,
    [uid],
  )

  await pool.query(
    `INSERT INTO email_verification_codes (uid, email, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uid, normalizedEmail, codeHash, expiresAt],
  )

  const mailResult = await sendVerificationEmail(normalizedEmail, code)
  return { code, mailResult }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 */
export async function canResendVerification(pool, uid) {
  const { rows } = await pool.query(
    `SELECT created_at FROM email_verification_codes
     WHERE uid = $1 ORDER BY created_at DESC LIMIT 1`,
    [uid],
  )
  if (!rows[0]) return { ok: true }
  const elapsed = Date.now() - new Date(rows[0].created_at).getTime()
  if (elapsed < RESEND_COOLDOWN_MS) {
    return { ok: false, waitSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) }
  }
  return { ok: true }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} uid
 * @param {string} email
 * @param {string} code
 */
export async function verifyEmailCode(pool, uid, email, code) {
  const normalizedEmail = email.trim().toLowerCase()
  const trimmed = String(code || '').replace(/\D/g, '')
  if (trimmed.length !== CODE_LENGTH) {
    return { ok: false, error: `Enter the ${CODE_LENGTH}-digit code from your email.` }
  }

  const { rows } = await pool.query(
    `SELECT verification_id, code_hash, expires_at
     FROM email_verification_codes
     WHERE uid = $1 AND LOWER(email) = $2 AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [uid, normalizedEmail],
  )

  const row = rows[0]
  if (!row) {
    return { ok: false, error: 'No active verification code. Request a new code.' }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'This code has expired. Request a new code.' }
  }

  const match = await bcrypt.compare(trimmed, row.code_hash)
  if (!match) {
    return { ok: false, error: 'Incorrect verification code.' }
  }

  await pool.query(
    `UPDATE email_verification_codes SET used_at = NOW() WHERE verification_id = $1`,
    [row.verification_id],
  )

  return { ok: true }
}

export { CODE_LENGTH }
