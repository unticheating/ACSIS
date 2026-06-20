import { getPool } from './db.js'
import { config } from './config.js'

async function ping() {
  const pool = await getPool();
  // Get an institution admin session token or user
  const { rows } = await pool.query("SELECT session_token FROM user_sessions us JOIN users u ON us.uid = u.uid WHERE u.role = 'institution_admin' LIMIT 1");
  if (!rows.length) {
    console.log('no admin session');
    process.exit();
  }
  const token = rows[0].session_token;
  const t0 = Date.now();
  const res = await fetch(`http://localhost:${config.port}/api/admin/dashboard`, {
    headers: {
      cookie: `sessionToken=${token}`
    }
  }).catch(e => e);
  console.log('ping took', Date.now() - t0, 'ms', res.status);
  process.exit();
}
ping();
