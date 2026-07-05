import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

/** @type {pg.Pool | null} */
let pool = null

export function isDatabaseEnabled() {
  return Boolean(config.databaseUrl)
}

export function getPool() {
  if (!isDatabaseEnabled()) return null
  if (!pool) {
    const isServerless = Boolean(process.env.VERCEL)
    const useSsl =
      config.nodeEnv === 'production' ||
      (config.databaseUrl || '').includes('supabase.com')
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: isServerless ? 2 : 5,
      connectionTimeoutMillis: isServerless ? 15000 : 5000,
      idleTimeoutMillis: isServerless ? 10000 : 30000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  }
  return pool
}
