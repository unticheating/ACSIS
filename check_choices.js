import { getPool } from './server/db.js';

async function run() {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT * FROM choices WHERE question_id = 500
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
