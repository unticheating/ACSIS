import { getPool } from './server/db.js';
import { gradeSessionAnswersQuery } from './server/repositories/examSessionRepository.js';

async function run() {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT session_id FROM exam_sessions WHERE status = 'submitted'`);
    for (const r of rows) {
      await gradeSessionAnswersQuery(r.session_id);
    }
    console.log(`Re-graded ${rows.length} submitted sessions.`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
