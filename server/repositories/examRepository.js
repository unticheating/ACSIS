import { getPool } from '../db.js';
import { STUDENT_VISIBLE_STATUS_SQL } from '../lib/examStatus.js';

export async function insertExamTransaction(pool, memberId, classId, title, password, timeLimit, questionsData) {
  // We use the provided pool client (which is already in a transaction)
  
  // 1. Insert Exam
  const examResult = await pool.query(
    `INSERT INTO exams (class_id, title, password, time_limit, status, created_by)
     VALUES ($1, $2, $3, $4, 'draft', $5)
     RETURNING exam_id`,
    [classId, title, password || null, timeLimit, memberId]
  );
  const examId = examResult.rows[0].exam_id;

  // 2. Insert Questions and Choices
  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    
    const dbType = q.type === 'multiple-choice' || q.type === 'multiple' ? 'mcq' 
                 : q.type === 'truefalse' ? 'true_false' 
                 : 'identification';

    const qResult = await pool.query(
      `INSERT INTO questions (exam_id, question_text, question_type, points, order_num)
       VALUES ($1, $2, $3, 1.00, $4)
       RETURNING question_id`,
      [examId, q.question, dbType, i + 1]
    );
    const questionId = qResult.rows[0].question_id;

    if (dbType === 'mcq') {
      // Multiple choice has options and a specific correct answer
      for (let j = 0; j < q.options.length; j++) {
        const choiceText = q.options[j];
        const isCorrect = choiceText === q.correctAnswer;
        await pool.query(
          `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
           VALUES ($1, $2, $3, $4)`,
          [questionId, choiceText, isCorrect, j + 1]
        );
      }
    } else {
      // True/False and Identification just have one correct answer
      await pool.query(
        `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
         VALUES ($1, $2, TRUE, 1)`,
        [questionId, q.correctAnswer]
      );
    }
  }

  return examId;
}

export async function listTeacherExamsWithClassMetaQuery(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
      e.exam_id AS id,
      e.title,
      e.password AS code,
      e.time_limit AS duration,
      e.status,
      e.class_id AS "classId",
      c.course_code AS "courseCode",
      c.class_name AS name,
      c.school_year AS "academicYear",
      c.semester,
      c.access_code AS "accessCode",
      c.term_id AS "termId",
      t.program_code AS "programCode",
      t.section_code AS "sectionCode",
      (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.exam_id) AS "questionCount"
    FROM exams e
    INNER JOIN classes c ON c.class_id = e.class_id
    LEFT JOIN teaching_terms t ON t.term_id = c.term_id
    WHERE c.member_id = $1 AND c.is_active = TRUE
    ORDER BY e.created_at DESC`,
    [memberId],
  );
  return result.rows;
}

export async function getExamsByClassIdQuery(classId, requireActive = false) {
  const pool = getPool();
  let query = `
    SELECT 
      e.exam_id as id,
      e.title,
      e.password as code,
      e.time_limit as duration,
      e.status,
      (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.exam_id) as "questionCount"
    FROM exams e
    WHERE e.class_id = $1
  `;
  const params = [classId];

  if (requireActive) {
    query += ` AND e.status IN ${STUDENT_VISIBLE_STATUS_SQL}`;
  }

  query += ` ORDER BY e.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function updateExamStatusQuery(classId, examId, status) {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE exams SET status = $1 WHERE exam_id = $2 AND class_id = $3 RETURNING exam_id`,
    [status, examId, classId]
  );
  return result.rowCount > 0;
}

export async function verifyExamPasswordQuery(classId, examId, password, requireActive = true) {
  const pool = getPool();
  let sql = `
    SELECT exam_id
    FROM exams
    WHERE exam_id = $1 AND class_id = $2 AND TRIM(password) = TRIM($3)
  `;
  if (requireActive) {
    sql += ` AND status IN ${STUDENT_VISIBLE_STATUS_SQL}`;
  }
  const result = await pool.query(sql, [examId, classId, password]);
  return result.rowCount > 0;
}

/** Deletes exam and dependent rows (FK-safe when sessions/answers exist). */
export async function deleteExamQuery(classId, examId, teacherMemberId = null) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let ownerSql = `SELECT e.exam_id FROM exams e
       JOIN classes c ON e.class_id = c.class_id
       WHERE e.exam_id = $1 AND e.class_id = $2`;
    const ownerParams = [examId, classId];
    if (teacherMemberId != null) {
      ownerSql += ' AND c.member_id = $3';
      ownerParams.push(teacherMemberId);
    }
    const owner = await client.query(ownerSql, ownerParams);
    if (owner.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `DELETE FROM cheating_logs
       WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1)`,
      [examId],
    );
    await client.query(
      `DELETE FROM exam_results
       WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1)`,
      [examId],
    );
    await client.query(
      `DELETE FROM student_answers
       WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1)`,
      [examId],
    );
    await client.query(`DELETE FROM exam_sessions WHERE exam_id = $1`, [examId]);
    await client.query(`DELETE FROM report_logs WHERE exam_id = $1`, [examId]);
    await client.query(
      `DELETE FROM choices
       WHERE question_id IN (SELECT question_id FROM questions WHERE exam_id = $1)`,
      [examId],
    );
    await client.query(`DELETE FROM questions WHERE exam_id = $1`, [examId]);

    const result = await client.query(
      `DELETE FROM exams WHERE exam_id = $1 AND class_id = $2 RETURNING exam_id`,
      [examId, classId],
    );

    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getExamWithQuestionsQuery(classId, examId, requireActive = false) {
  const pool = getPool();
  
  // 1. Fetch exam details
  let examQuery = `
    SELECT 
      exam_id as id,
      title,
      password as code,
      time_limit as duration,
      status,
      shuffle_questions as "shuffleQuestions",
      shuffle_choices as "shuffleChoices"
    FROM exams
    WHERE exam_id = $1 AND class_id = $2
  `;
  const params = [examId, classId];
  
  if (requireActive) {
    examQuery += ` AND status IN ${STUDENT_VISIBLE_STATUS_SQL}`;
  }
  
  const examResult = await pool.query(examQuery, params);
  if (examResult.rows.length === 0) return null;
  
  const exam = examResult.rows[0];
  
  // 2. Fetch questions
  const qResult = await pool.query(
    `SELECT question_id as id, question_text as question, question_type as type, points, order_num 
     FROM questions 
     WHERE exam_id = $1 
     ORDER BY order_num ASC`,
    [examId]
  );
  
  const questions = [];
  
  for (const row of qResult.rows) {
    const qType = row.type === 'mcq' ? 'multiple-choice' : row.type === 'true_false' ? 'truefalse' : 'identification';
    
    const qObj = {
      id: row.id,
      type: qType,
      question: row.question,
      points: row.points
    };
    
    // Fetch choices
    if (qType === 'multiple-choice') {
      const cResult = await pool.query(
        `SELECT choice_text, is_correct FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
        [row.id]
      );
      qObj.options = cResult.rows.map(c => c.choice_text);
      qObj.correctAnswer = cResult.rows.find(c => c.is_correct)?.choice_text || '';
    } else {
      const cResult = await pool.query(
        `SELECT choice_text FROM choices WHERE question_id = $1 AND is_correct = TRUE LIMIT 1`,
        [row.id]
      );
      qObj.correctAnswer = cResult.rows[0]?.choice_text || '';
    }
    
    questions.push(qObj);
  }
  
  exam.questions = questions;
  return exam;
}
