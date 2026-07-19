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
      // Vercel: 1 connection per function instance (each instance is isolated).
      // Local dev: small pool for the long-lived server process.
      max: isServerless ? 1 : 5,
      // Release connections quickly on Vercel so the pooler slot is freed
      // before the next request arrives on a different function instance.
      idleTimeoutMillis: isServerless ? 500 : 30000,
      // Give enough time for Supabase to accept the connection, but not so
      // long that a cold start blocks the entire request lifecycle.
      connectionTimeoutMillis: isServerless ? 8000 : 5000,
      // Allow the Node process to exit cleanly when the pool is idle.
      allowExitOnIdle: true,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })

    pool.on('error', (err) => {
      console.error('[db] Unexpected pool client error:', err.message)
    })
  }
  return pool
}
