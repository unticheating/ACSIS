import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
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
}

export function assertAuthConfig() {
  required('GOOGLE_CLIENT_ID', config.google.clientId)
  required('GOOGLE_CLIENT_SECRET', config.google.clientSecret)
  if (config.sessionSecret === 'dev-only-change-in-production' && config.nodeEnv === 'production') {
    throw new Error('Set SESSION_SECRET in production')
  }
}
