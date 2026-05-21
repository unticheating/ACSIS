import { getPool, isDatabaseEnabled } from './db.js';

async function check() {
  if (!isDatabaseEnabled()) {
    console.log("Database is NOT configured in .env (DATABASE_URL is missing).");
    process.exit(0);
  }
  
  const pool = getPool();
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Database connected. Tables found:");
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error("Database connection failed:");
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

check();
