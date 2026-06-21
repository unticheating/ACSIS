import { getPool } from './server/db.js';
import { gradeSessionAnswersQuery } from './server/repositories/examSessionRepository.js';

async function run() {
  const pool = getPool();
  try {
    await gradeSessionAnswersQuery(40);
    console.log("Graded session 40");
    const { rows } = await pool.query(`
      SELECT sa.answer_id, sa.session_id, sa.question_id, sa.answer_text, sa.is_correct, sa.manually_checked, q.question_type
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.question_id
      WHERE q.question_type = 'identification' AND sa.session_id = 40
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
