import bcrypt from 'bcrypt'
import { getPool } from './db.js'

const EMAIL = 'superadmin@plpasig.edu.ph'
const PASSWORD = 'password123'

async function main() {
  const pool = getPool()
  if (!pool) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const hash = await bcrypt.hash(PASSWORD, 12)
  const { rowCount } = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, is_super_admin)
     VALUES ('ACSIS', 'Super Admin', $1, $2, TRUE)
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       is_super_admin = TRUE`,
    [EMAIL, hash],
  )

  console.log(`Super admin ready: ${EMAIL} (rows affected: ${rowCount ?? 'ok'})`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
