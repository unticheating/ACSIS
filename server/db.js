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
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}
