import { getPool } from '../db.js';
import { STUDENT_VISIBLE_STATUS_SQL } from '../lib/examStatus.js';
import { ensureExamSectionsSchema } from '../lib/ensureExamSectionsSchema.js';
import {
  normalizeAnswerExplanation,
  resolveIdentificationPayload,
} from '../lib/identificationAnswers.js';
import {
  resolveMatchingPayload,
  serializeMatchingPair,
  parseMatchingPairText,
} from '../lib/matchingAnswers.js';

const EXAM_TOTAL_POINTS_SUBQUERY = `(SELECT COALESCE(SUM(
  CASE
    WHEN q.question_type = 'matching' THEN
      q.points * (SELECT COUNT(*)::int FROM choices c WHERE c.question_id = q.question_id AND c.is_correct = TRUE)
    ELSE q.points
  END
), 0)::int
FROM questions q WHERE q.exam_id = e.exam_id)`;

function mapQuestionTypeToDb(type) {
  if (type === 'multiple-choice' || type === 'multiple') return 'mcq';
  if (type === 'truefalse') return 'true_false';
  if (type === 'coding') return 'coding';
  if (type === 'matching') return 'matching';
  if (type === 'essay') return 'essay';
  if (type === 'diagramming') return 'diagramming';
  return 'identification';
}

async function insertIdentificationChoices(client, questionId, q) {
  const { acceptable, presentation } = resolveIdentificationPayload(q);
  for (let j = 0; j < acceptable.length; j++) {
    await client.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
       VALUES ($1, $2, TRUE, $3)`,
      [questionId, acceptable[j], j + 1],
    );
  }
  return { acceptable, presentation };
}

function normalizeQuestionPoints(points) {
  const parsed = Number(points);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function insertQuestionWithChoices(client, examId, sectionId, q, orderNum) {
  const dbType = mapQuestionTypeToDb(q.type);
  const imageUrl = q.imageUrl || null;
  const identMeta =
    dbType === 'identification' ? resolveIdentificationPayload(q) : { presentation: null };
  const explanation = normalizeAnswerExplanation(q);
  const points = normalizeQuestionPoints(q.points);
  const qResult = await client.query(
    `INSERT INTO questions (
       exam_id, section_id, question_text, question_type, points, order_num, image_url,
       presentation_answer, answer_explanation
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING question_id`,
    [
      examId,
      sectionId,
      q.question,
      dbType,
      points,
      orderNum,
      imageUrl,
      dbType === 'identification' ? identMeta.presentation || null : null,
      explanation,
    ],
  );
  const questionId = qResult.rows[0].question_id;

  await insertChoicesForQuestion(client, questionId, q, dbType);
}

async function insertChoicesForQuestion(client, questionId, q, dbType) {
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
  } else if (dbType === 'coding') {
    const language =
      Array.isArray(q.options) && q.options[0] ? String(q.options[0]).trim() : 'javascript';
    await client.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
       VALUES ($1, $2, FALSE, 1)`,
      [questionId, language],
    );
    await client.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
       VALUES ($1, $2, TRUE, 2)`,
      [questionId, q.correctAnswer],
    );
  } else if (dbType === 'matching') {
    const pairs = resolveMatchingPayload(q);
    for (let j = 0; j < pairs.length; j++) {
      await client.query(
        `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
         VALUES ($1, $2, TRUE, $3)`,
        [questionId, serializeMatchingPair(pairs[j]), j + 1],
      );
    }
  } else if (dbType === 'essay') {
    const rubric = String(q.correctAnswer || 'Manual grading required').trim() || 'Manual grading required';
    await client.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
       VALUES ($1, $2, TRUE, 1)`,
      [questionId, rubric],
    );
  } else if (dbType === 'diagramming') {
    const variant =
      (Array.isArray(q.options) && q.options[0] ? String(q.options[0]).trim() : null) ||
      String(q.diagramVariant || 'flowchart').trim() ||
      'flowchart';
    await client.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
       VALUES ($1, $2, FALSE, 1)`,
      [questionId, variant],
    );
    const reference = String(q.correctAnswer || q.diagramReference || '').trim();
    if (reference) {
      await client.query(
        `INSERT INTO choices (question_id, choice_text, is_correct, order_num)
         VALUES ($1, $2, TRUE, 2)`,
        [questionId, reference],
      );
    }
  } else {
    await insertIdentificationChoices(client, questionId, q);
  }
}

function parsePositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function questionHasStudentAnswers(client, questionId) {
  const { rows } = await client.query(
    `SELECT 1 FROM student_answers WHERE question_id = $1 LIMIT 1`,
    [questionId],
  );
  return rows.length > 0;
}

async function examHasStudentSessions(client, examId) {
  const { rows } = await client.query(
    `SELECT 1 FROM exam_sessions WHERE exam_id = $1 LIMIT 1`,
    [examId],
  );
  return rows.length > 0;
}

async function replaceExamChoices(client, questionId, q, dbType) {
  await client.query(`DELETE FROM choices WHERE question_id = $1`, [questionId]);
  await insertChoicesForQuestion(client, questionId, q, dbType);
}

async function updateQuestionInPlace(client, examId, sectionId, q, orderNum, questionId) {
  const dbType = mapQuestionTypeToDb(q.type);
  const imageUrl = q.imageUrl || null;
  const identMeta =
    dbType === 'identification' ? resolveIdentificationPayload(q) : { presentation: null };
  const explanation = normalizeAnswerExplanation(q);
  const points = normalizeQuestionPoints(q.points);
  await client.query(
    `UPDATE questions
     SET question_text = $1,
         question_type = $2,
         order_num = $3,
         section_id = $4,
         image_url = $5,
         presentation_answer = $6,
         answer_explanation = $7,
         points = $8
     WHERE question_id = $9 AND exam_id = $10`,
    [
      q.question,
      dbType,
      orderNum,
      sectionId,
      imageUrl,
      dbType === 'identification' ? identMeta.presentation || null : null,
      explanation,
      points,
      questionId,
      examId,
    ],
  );

  const hasAnswers = await questionHasStudentAnswers(client, questionId);
  if (!hasAnswers) {
    await replaceExamChoices(client, questionId, q, dbType);
    return;
  }

  if (dbType === 'mcq') {
    const { rows: existing } = await client.query(
      `SELECT choice_id, order_num FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [questionId],
    );
    const options = q.options || [];
    for (let j = 0; j < options.length; j++) {
      const choiceText = options[j];
      const isCorrect = choiceText === q.correctAnswer;
      if (j < existing.length) {
        await client.query(
          `UPDATE choices SET choice_text = $1, is_correct = $2 WHERE choice_id = $3`,
          [choiceText, isCorrect, existing[j].choice_id],
        );
      } else {
        await client.query(
          `INSERT INTO choices (question_id, choice_text, is_correct, order_num) VALUES ($1, $2, $3, $4)`,
          [questionId, choiceText, isCorrect, j + 1]
        );
      }
    }
    if (existing.length > options.length) {
      for (let j = options.length; j < existing.length; j++) {
        await client.query(`DELETE FROM choices WHERE choice_id = $1`, [existing[j].choice_id]);
      }
    }
    return;
  }

  if (dbType === 'coding') {
    const language =
      Array.isArray(q.options) && q.options[0] ? String(q.options[0]).trim() : 'javascript';
    const { rows: existing } = await client.query(
      `SELECT choice_id, is_correct, order_num FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [questionId],
    );
    if (existing.length < 2) {
      await replaceExamChoices(client, questionId, q, dbType);
      return;
    }
    const langRow = existing.find((r) => !r.is_correct) || existing[0];
    const ansRow = existing.find((r) => r.is_correct) || existing[existing.length - 1];
    await client.query(`UPDATE choices SET choice_text = $1 WHERE choice_id = $2`, [
      language,
      langRow.choice_id,
    ]);
    await client.query(`UPDATE choices SET choice_text = $1 WHERE choice_id = $2`, [
      q.correctAnswer,
      ansRow.choice_id,
    ]);
    return;
  }

  // Fallback for Identification, True/False, Essay, Matching, Diagramming
  // Re-generate the expected choices the same way `insertChoicesForQuestion` does
  let newChoices = [];
  if (dbType === 'matching') {
    const pairs = resolveMatchingPayload(q);
    newChoices = pairs.map((p, idx) => ({ text: serializeMatchingPair(p), isCorrect: true, order: idx + 1 }));
  } else if (dbType === 'essay') {
    const rubric = String(q.correctAnswer || 'Manual grading required').trim() || 'Manual grading required';
    newChoices = [{ text: rubric, isCorrect: true, order: 1 }];
  } else if (dbType === 'diagramming') {
    const variant = (Array.isArray(q.options) && q.options[0] ? String(q.options[0]).trim() : null) ||
      String(q.diagramVariant || 'flowchart').trim() || 'flowchart';
    newChoices.push({ text: variant, isCorrect: false, order: 1 });
    const reference = String(q.correctAnswer || q.diagramReference || '').trim();
    if (reference) {
      newChoices.push({ text: reference, isCorrect: true, order: 2 });
    }
  } else {
    // Identification / True-False fallback
    const { acceptable } = resolveIdentificationPayload(q);
    newChoices = acceptable.map((ans, idx) => ({ text: ans, isCorrect: true, order: idx + 1 }));
  }

  const { rows: existing } = await client.query(
    `SELECT choice_id FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
    [questionId],
  );

  for (let j = 0; j < newChoices.length; j++) {
    const nc = newChoices[j];
    if (j < existing.length) {
      await client.query(
        `UPDATE choices SET choice_text = $1, is_correct = $2, order_num = $3 WHERE choice_id = $4`,
        [nc.text, nc.isCorrect, nc.order, existing[j].choice_id]
      );
    } else {
      await client.query(
        `INSERT INTO choices (question_id, choice_text, is_correct, order_num) VALUES ($1, $2, $3, $4)`,
        [questionId, nc.text, nc.isCorrect, nc.order]
      );
    }
  }
  if (existing.length > newChoices.length) {
    for (let j = newChoices.length; j < existing.length; j++) {
      await client.query(`DELETE FROM choices WHERE choice_id = $1`, [existing[j].choice_id]);
    }
  }
}

async function replaceAllExamContent(client, examId, payload) {
  await client.query(
    `DELETE FROM choices
     WHERE question_id IN (SELECT question_id FROM questions WHERE exam_id = $1)`,
    [examId],
  );
  await client.query(`DELETE FROM questions WHERE exam_id = $1`, [examId]);
  await client.query(`DELETE FROM exam_sections WHERE exam_id = $1`, [examId]);

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
      for (const q of sec.questions || []) {
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
}

async function syncExamContentWithSessions(client, examId, payload) {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  if (!sections.length) {
    const err = new Error('At least one question set is required.');
    err.code = 'VALIDATION';
    throw err;
  }

  const { rows: existingSections } = await client.query(
    `SELECT section_id FROM exam_sections WHERE exam_id = $1`,
    [examId],
  );
  const { rows: existingQuestions } = await client.query(
    `SELECT question_id FROM questions WHERE exam_id = $1`,
    [examId],
  );
  const existingSectionIds = new Set(existingSections.map((r) => r.section_id));
  const existingQuestionIds = new Set(existingQuestions.map((r) => r.question_id));
  const keptQuestionIds = new Set();
  const keptSectionIds = new Set();

  let orderNum = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const parsedSectionId = parsePositiveInt(sec.id);
    let sectionId = parsedSectionId && existingSectionIds.has(parsedSectionId)
      ? parsedSectionId
      : null;

    if (sectionId) {
      await client.query(
        `UPDATE exam_sections
         SET title = $1, description = $2, order_num = $3
         WHERE section_id = $4 AND exam_id = $5`,
        [
          String(sec.title || '').trim() || `Set ${sIdx + 1}`,
          sec.description?.trim() || null,
          sIdx + 1,
          sectionId,
          examId,
        ],
      );
    } else {
      const secResult = await client.query(
        `INSERT INTO exam_sections (exam_id, title, description, order_num)
         VALUES ($1, $2, $3, $4)
         RETURNING section_id`,
        [examId, String(sec.title || '').trim() || `Set ${sIdx + 1}`, sec.description?.trim() || null, sIdx + 1],
      );
      sectionId = secResult.rows[0].section_id;
      existingSectionIds.add(sectionId);
    }
    keptSectionIds.add(sectionId);

    for (const q of sec.questions || []) {
      orderNum += 1;
      const parsedQuestionId = parsePositiveInt(q.id);
      if (parsedQuestionId && existingQuestionIds.has(parsedQuestionId)) {
        keptQuestionIds.add(parsedQuestionId);
        await updateQuestionInPlace(client, examId, sectionId, q, orderNum, parsedQuestionId);
      } else {
        await insertQuestionWithChoices(client, examId, sectionId, q, orderNum);
      }
    }
  }

  for (const questionId of existingQuestionIds) {
    if (keptQuestionIds.has(questionId)) continue;
    if (await questionHasStudentAnswers(client, questionId)) {
      const err = new Error('Cannot delete a question that already has student answers.');
      err.code = 'QUESTION_LOCKED';
      throw err;
    }
    await client.query(`DELETE FROM choices WHERE question_id = $1`, [questionId]);
    await client.query(`DELETE FROM questions WHERE question_id = $1`, [questionId]);
  }

  for (const sectionId of existingSectionIds) {
    if (keptSectionIds.has(sectionId)) continue;
    await client.query(`DELETE FROM exam_sections WHERE section_id = $1 AND exam_id = $2`, [
      sectionId,
      examId,
    ]);
  }
}

export async function insertExamTransaction(
  pool,
  memberId,
  classId,
  title,
  password,
  payload,
  { shuffleQuestions = false, shuffleChoices = false, scheduledStart = null, scheduledEnd = null, isAutoPublish = false } = {},
) {
  await ensureExamSectionsSchema();
  const client = pool;

  const examDescription = payload?.description?.trim() || null;

  const examResult = await client.query(
    `INSERT INTO exams (class_id, title, description, password, status, shuffle_questions, shuffle_choices, created_by, scheduled_start, scheduled_end, is_auto_publish)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10)
     RETURNING exam_id`,
    [classId, title, examDescription, password || null, Boolean(shuffleQuestions), Boolean(shuffleChoices), memberId, scheduledStart, scheduledEnd, Boolean(isAutoPublish)],
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

export async function updateExamDraftTransaction(
  client,
  memberId,
  classId,
  examId,
  title,
  password,
  payload,
  { shuffleQuestions = false, shuffleChoices = false, scheduledStart = null, scheduledEnd = null, isAutoPublish = false } = {},
) {
  await ensureExamSectionsSchema();

  const owner = await client.query(
    `SELECT e.exam_id FROM exams e
     JOIN classes c ON e.class_id = c.class_id
     WHERE e.exam_id = $1 AND e.class_id = $2 AND c.member_id = $3 AND e.is_archived = FALSE`,
    [examId, classId, memberId],
  );
  if (owner.rowCount === 0) {
    return { ok: false, code: 'NOT_FOUND' };
  }

  const examDescription = payload?.description?.trim() || null;

  let updateFields = [
    title,
    examDescription,
    Boolean(shuffleQuestions),
    Boolean(shuffleChoices),
    scheduledStart,
    scheduledEnd,
    Boolean(isAutoPublish),
  ];
  let updatePasswordStr = '';
  let examIdParam = 8;
  if (password !== undefined) {
    updatePasswordStr = `, password = $8`;
    updateFields.push(password);
    examIdParam = 9;
  }
  updateFields.push(examId);

  await client.query(
    `UPDATE exams 
     SET title = $1, description = $2, shuffle_questions = $3, shuffle_choices = $4, scheduled_start = $5, scheduled_end = $6, is_auto_publish = $7${updatePasswordStr}
     WHERE exam_id = $${examIdParam}`,
    updateFields,
  );

  const hasSessions = await examHasStudentSessions(client, examId);
  if (hasSessions) {
    await syncExamContentWithSessions(client, examId, payload);
  } else {
    await replaceAllExamContent(client, examId, payload);
  }

  return { ok: true };
}

export async function listTeacherExamsWithClassMetaQuery(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
      e.exam_id AS id,
      e.title,
      e.password AS code,
      e.status,
      e.scheduled_start AS "scheduledStart",
      e.scheduled_end AS "scheduledEnd",
      e.is_auto_publish AS "isAutoPublish",
      e.class_id AS "classId",
      c.course_code AS "courseCode",
      c.class_name AS name,
      c.school_year AS "academicYear",
      c.semester,
      c.access_code AS "accessCode",
      c.term_id AS "termId",
      t.program_code AS "programCode",
      t.section_code AS "sectionCode",
      (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.exam_id) AS "questionCount",
      ${EXAM_TOTAL_POINTS_SUBQUERY} AS "totalPoints"
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
      e.status,
      e.scheduled_start as "scheduledStart",
      e.scheduled_end as "scheduledEnd",
      e.is_auto_publish as "isAutoPublish",
      (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.exam_id) as "questionCount",
      ${EXAM_TOTAL_POINTS_SUBQUERY} AS "totalPoints"
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

export async function updateExamPasswordByTeacherQuery(classId, examId, teacherMemberId, password) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `UPDATE exams e
     SET password = $1, updated_at = NOW()
     FROM classes c
     WHERE e.class_id = c.class_id
       AND e.exam_id = $2
       AND e.class_id = $3
       AND c.member_id = $4
       AND e.status IN ('draft', 'waiting', 'open', 'closed')`,
    [password, examId, classId, teacherMemberId],
  );
  return rowCount > 0;
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

function mapQuestionTypeFromDb(dbType) {
  if (dbType === 'mcq') return 'multiple-choice';
  if (dbType === 'true_false') return 'truefalse';
  if (dbType === 'coding') return 'coding';
  if (dbType === 'matching') return 'matching';
  if (dbType === 'essay') return 'essay';
  if (dbType === 'diagramming') return 'diagramming';
  return 'identification';
}

async function attachChoicesToQuestion(pool, row) {
  const qType = mapQuestionTypeFromDb(row.type);

  const qObj = {
    id: row.id,
    type: qType,
    question: row.question,
    points: row.points,
    imageUrl: row.imageUrl ?? null,
    sectionId: row.sectionId ?? null,
    sectionTitle: row.sectionTitle ?? null,
    sectionDescription: row.sectionDescription ?? null,
    answerExplanation: row.answerExplanation?.trim() || '',
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
  } else if (qType === 'identification') {
    const cResult = await pool.query(
      `SELECT choice_text, is_correct FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [row.id],
    );
    const acceptable = cResult.rows.filter((c) => c.is_correct).map((c) => c.choice_text);
    qObj.acceptableAnswers = acceptable;
    qObj.correctAnswer = acceptable.join(', ');
    qObj.presentationAnswer =
      row.presentationAnswer?.trim() || acceptable[0] || '';
  } else if (qType === 'matching') {
    const cResult = await pool.query(
      `SELECT choice_text FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [row.id],
    );
    const matchingPairs = cResult.rows
      .map((c) => parseMatchingPairText(c.choice_text))
      .filter(Boolean);
    qObj.matchingPairs = matchingPairs;
    qObj.correctAnswer = JSON.stringify(matchingPairs);
  } else if (qType === 'essay') {
    const cResult = await pool.query(
      `SELECT choice_text FROM choices WHERE question_id = $1 AND is_correct = TRUE ORDER BY order_num ASC LIMIT 1`,
      [row.id],
    );
    qObj.correctAnswer = cResult.rows[0]?.choice_text?.trim() || '';
  } else if (qType === 'diagramming') {
    const cResult = await pool.query(
      `SELECT choice_text, is_correct FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [row.id],
    );
    const variantRow = cResult.rows.find((c) => !c.is_correct) || cResult.rows[0];
    const refRow = cResult.rows.find((c) => c.is_correct);
    const variant = variantRow?.choice_text?.trim() || 'flowchart';
    qObj.diagramVariant = variant;
    qObj.options = [variant];
    qObj.diagramReference = refRow?.choice_text?.trim() || '';
    qObj.correctAnswer = qObj.diagramReference;
  } else {
    const cResult = await pool.query(
      `SELECT choice_text, is_correct FROM choices WHERE question_id = $1 ORDER BY order_num ASC`,
      [row.id],
    );
    const correct = cResult.rows.find((c) => c.is_correct);
    qObj.correctAnswer = correct?.choice_text || '';
    if (qType === 'coding') {
      const langRow = cResult.rows.find((c) => !c.is_correct);
      const language = langRow?.choice_text || 'javascript';
      qObj.language = language;
      qObj.options = [language];
    }
  }

  return qObj;
}

export async function getExamWithQuestionsQuery(classId, examId, requireActive = false, options = {}) {
  const includeQuestions = options.includeQuestions !== false
  const pool = getPool();
  await ensureExamSectionsSchema();

  // 1. Fetch exam details
  let examQuery = `
    SELECT 
      exam_id as id,
      title,
      description,
      password as code,
      status,
      scheduled_start as "scheduledStart",
      scheduled_end as "scheduledEnd",
      is_auto_publish as "isAutoPublish",
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

  exam.sections = secResult.rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    orderNum: s.orderNum,
  }));

  if (!includeQuestions) {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM questions WHERE exam_id = $1`,
      [examId],
    );
    exam.questionCount = countResult.rows[0]?.count ?? 0;
    exam.questions = [];
    return exam;
  }

  const qResult = await pool.query(
    `SELECT
       q.question_id AS id,
       q.question_text AS question,
       q.question_type AS type,
       q.points,
       q.order_num AS "orderNum",
       q.section_id AS "sectionId",
       q.image_url AS "imageUrl",
       q.presentation_answer AS "presentationAnswer",
       q.answer_explanation AS "answerExplanation",
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

  exam.questions = questions;
  return exam;
}
