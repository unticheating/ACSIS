import { getPool } from '../db.js';
import { STUDENT_VISIBLE_STATUS_SQL } from '../lib/examStatus.js';
import { ensureExamSectionsSchema } from '../lib/ensureExamSectionsSchema.js';

function mapQuestionTypeToDb(type) {
  if (type === 'multiple-choice' || type === 'multiple') return 'mcq';
  if (type === 'truefalse') return 'true_false';
  return 'identification';
}

async function insertQuestionWithChoices(client, examId, sectionId, q, orderNum) {
  const dbType = mapQuestionTypeToDb(q.type);
  const qResult = await client.query(
    `INSERT INTO questions (exam_id, section_id, question_text, question_type, points, order_num)
     VALUES ($1, $2, $3, $4, 1.00, $5)
     RETURNING question_id`,
    [examId, sectionId, q.question, dbType, orderNum],
  );
  const questionId = qResult.rows[0].question_id;

  if (dbType === 'mcq') {
    for (let j = 0; j < q.options.length; j++) {
      const choiceText = q.options[j];
      const isCorrect = choiceText === q.correctAnswer;
      await client.query(
        `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
         VALUES ($1, $2, $3, $4)`,
        [questionId, choiceText, isCorrect, j + 1],
      );
    }
  } else {
    await client.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
       VALUES ($1, $2, TRUE, 1)`,
      [questionId, q.correctAnswer],
    );
  }
}

export async function insertExamTransaction(
  pool,
  memberId,
  classId,
  title,
  password,
  timeLimit,
  payload,
  { shuffleQuestions = false, shuffleChoices = false } = {},
) {
  await ensureExamSectionsSchema();
  const client = pool;

  const examResult = await client.query(
    `INSERT INTO exams (class_id, title, password, time_limit, status, shuffle_questions, shuffle_choices, created_by)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7)
     RETURNING exam_id`,
    [classId, title, password || null, timeLimit, Boolean(shuffleQuestions), Boolean(shuffleChoices), memberId],
  );
  const examId = examResult.rows[0].exam_id;

  const sections = Array.isArray(payload?.sections) ? payload.sections : null;
  const flatQuestions = Array.isArray(payload?.questions) ? payload.questions : null;

  let orderNum = 0;

  if (sections?.length) {
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const secResult = await client.query(
        `INSERT INTO exam_sections (exam_id, title, description, order_num)
         VALUES ($1, $2, $3, $4)
         RETURNING section_id`,
        [examId, String(sec.title || '').trim() || `Set ${sIdx + 1}`, sec.description?.trim() || null, sIdx + 1],
      );
      const sectionId = secResult.rows[0].section_id;
      const secQuestions = sec.questions || [];
      for (const q of secQuestions) {
        orderNum += 1;
        await insertQuestionWithChoices(client, examId, sectionId, q, orderNum);
      }
    }
  } else if (flatQuestions?.length) {
    const secResult = await client.query(
      `INSERT INTO exam_sections (exam_id, title, description, order_num)
       VALUES ($1, $2, NULL, 1)
       RETURNING section_id`,
      [examId, 'Set 1'],
    );
    const sectionId = secResult.rows[0].section_id;
    for (const q of flatQuestions) {
      orderNum += 1;
      await insertQuestionWithChoices(client, examId, sectionId, q, orderNum);
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
    await client.query(`DELETE FROM exam_sections WHERE exam_id = $1`, [examId]);

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

async function attachChoicesToQuestion(pool, row) {
  const qType = row.type === 'mcq' ? 'multiple-choice' : row.type === 'true_false' ? 'truefalse' : 'identification';

  const qObj = {
    id: row.id,
    type: qType,
    question: row.question,
    points: row.points,
    sectionId: row.sectionId ?? null,
    sectionTitle: row.sectionTitle ?? null,
    sectionDescription: row.sectionDescription ?? null,
  };

  if (qType === 'multiple-choice' || qType === 'truefalse') {
    const cResult = await pool.query(
      `SELECT choice_id, choice_text, is_correct FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [row.id],
    );
    qObj.options = cResult.rows.map((c) => c.choice_text);
    qObj._choicesMeta = cResult.rows.map((c) => ({
      choiceId: c.choice_id,
      choiceText: c.choice_text,
      isCorrect: c.is_correct,
    }));
    qObj.correctAnswer = cResult.rows.find((c) => c.is_correct)?.choice_text || '';
  } else {
    const cResult = await pool.query(
      `SELECT choice_text FROM choices WHERE question_id = $1 AND is_correct = TRUE LIMIT 1`,
      [row.id],
    );
    qObj.correctAnswer = cResult.rows[0]?.choice_text || '';
  }

  return qObj;
}

export async function getExamWithQuestionsQuery(classId, examId, requireActive = false) {
  const pool = getPool();
  await ensureExamSectionsSchema();

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
  
  const secResult = await pool.query(
    `SELECT section_id AS id, title, description, order_num AS "orderNum"
     FROM exam_sections
     WHERE exam_id = $1
     ORDER BY order_num ASC`,
    [examId],
  );

  const qResult = await pool.query(
    `SELECT
       q.question_id AS id,
       q.question_text AS question,
       q.question_type AS type,
       q.points,
       q.order_num AS "orderNum",
       q.section_id AS "sectionId",
       s.title AS "sectionTitle",
       s.description AS "sectionDescription",
       s.order_num AS "sectionOrder"
     FROM questions q
     LEFT JOIN exam_sections s ON s.section_id = q.section_id
     WHERE q.exam_id = $1
     ORDER BY COALESCE(s.order_num, 9999), q.order_num ASC`,
    [examId],
  );

  const questions = [];
  for (const row of qResult.rows) {
    questions.push(await attachChoicesToQuestion(pool, row));
  }

  exam.sections = secResult.rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    orderNum: s.orderNum,
  }));
  exam.questions = questions;
  return exam;
}
