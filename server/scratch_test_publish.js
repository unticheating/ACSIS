import { getPool } from './db.js';
import { updateExamStatusQuery } from './repositories/examRepository.js';

async function test() {
  try {
    // Let's just find the first draft exam and try to update it
    const pool = getPool();
    const result = await pool.query(`SELECT class_id, exam_id FROM exams WHERE status = 'draft' LIMIT 1`);
    if (result.rows.length === 0) {
      console.log('No draft exams found.');
      return;
    }
    const { class_id, exam_id } = result.rows[0];
    console.log(`Found draft exam ${exam_id} in class ${class_id}`);
    
    const success = await updateExamStatusQuery(class_id, exam_id, 'open');
    console.log(`Update success: ${success}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
