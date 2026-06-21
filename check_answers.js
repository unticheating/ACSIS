import { getPool } from './server/db.js';

async function run() {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT sa.answer_id, sa.session_id, sa.question_id, sa.answer_text, sa.is_correct, sa.manually_checked, q.question_type
    FROM student_answers sa
    JOIN questions q ON sa.question_id = q.question_id
    WHERE q.question_type = 'identification' AND sa.answer_text ILIKE '%RIZAL%'
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
