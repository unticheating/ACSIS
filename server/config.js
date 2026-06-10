import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

//console.log('DATABASE_URL:', process.env.DATABASE_URL)

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/** @param {string | undefined} raw @param {boolean} defaultValue */
function parseEnvBool(raw, defaultValue) {
  if (raw === undefined || raw === '') return defaultValue
  const v = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(v)) return true
  if (['0', 'false', 'no', 'off'].includes(v)) return false
  return defaultValue
}

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      `http://localhost:${process.env.PORT || 3001}/api/auth/google/callback`,
  },
  allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || 'plpasig.edu.ph').toLowerCase(),
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-change-in-production',
  databaseUrl: process.env.DATABASE_URL || '',
  adminDevEmail: process.env.ADMIN_DEV_EMAIL || '',
  adminDevPassword: process.env.ADMIN_DEV_PASSWORD || '',
  /** Post-login email OTP. Default: on in production, off in development. Set EMAIL_VERIFICATION_ENABLED=true|false to override. */
  emailVerificationEnabled: parseEnvBool(
    process.env.EMAIL_VERIFICATION_ENABLED,
    (process.env.NODE_ENV || 'development') === 'production',
  ),
  smtp: {
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
    from: (process.env.SMTP_FROM || '').trim() || 'ACSIS <noreply@plpasig.edu.ph>',
  },
}

export function assertAuthConfig() {
  required('GOOGLE_CLIENT_ID', config.google.clientId)
  required('GOOGLE_CLIENT_SECRET', config.google.clientSecret)
  if (config.sessionSecret === 'dev-only-change-in-production' && config.nodeEnv === 'production') {
    throw new Error('Set SESSION_SECRET in production')
  }
}
