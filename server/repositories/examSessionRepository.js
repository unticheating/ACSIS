import { getPool } from '../db.js'
import { getExamSessionUserColumn } from '../lib/schemaCompat.js'

export async function getExamForJoinQuery(classId, examId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT exam_id, title, password, time_limit, status
     FROM exams
     WHERE exam_id = $1 AND class_id = $2 AND is_archived = FALSE`,
    [examId, classId],
  )
  return rows[0] || null
}

export async function findExamSessionQuery(examId, studentMemberId) {
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)
  const { rows } = await pool.query(
    `SELECT session_id, status, warning_count, started_at
     FROM exam_sessions
     WHERE exam_id = $1 AND ${col} = $2
     LIMIT 1`,
    [examId, studentMemberId],
  )
  return rows[0] || null
}

export async function createExamSessionQuery(examId, studentMemberId) {
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)
  const { rows } = await pool.query(
    `INSERT INTO exam_sessions (exam_id, ${col}, status)
     VALUES ($1, $2, 'in_progress')
     RETURNING session_id, status, warning_count, started_at`,
    [examId, studentMemberId],
  )
  return rows[0]
}

export async function getStudentSessionsForExamsQuery(examIds, studentMemberId) {
  if (!examIds?.length) return []
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)
  const { rows } = await pool.query(
    `SELECT
       es.exam_id,
       es.session_id,
       es.status,
       es.warning_count,
       es.submitted_at,
       er.percentage,
       er.raw_score,
       er.total_points
     FROM exam_sessions es
     LEFT JOIN exam_results er ON er.session_id = es.session_id
     WHERE es.exam_id = ANY($1::int[]) AND es.${col} = $2`,
    [examIds, studentMemberId],
  )
  return rows
}

export async function getSessionForStudentQuery(examId, studentMemberId) {
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)
  const { rows } = await pool.query(
    `SELECT es.session_id, es.status, es.warning_count, es.exam_id
     FROM exam_sessions es
     WHERE es.exam_id = $1 AND es.${col} = $2
     LIMIT 1`,
    [examId, studentMemberId],
  )
  return rows[0] || null
}

const CHEAT_EVENTS = new Set([
  'alt_tab',
  'copy_attempt',
  'paste_attempt',
  'window_blur',
  'devtools_open',
  'other',
])

export function isValidCheatEvent(type) {
  return CHEAT_EVENTS.has(type)
}

export async function insertCheatingLogQuery(sessionId, eventType, details = null) {
  const pool = getPool()
  await pool.query(
    `INSERT INTO cheating_logs (session_id, event_type, details)
     VALUES ($1, $2::cheat_event, $3)`,
    [sessionId, eventType, details],
  )
}

export async function incrementSessionWarningQuery(sessionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `UPDATE exam_sessions
     SET warning_count = warning_count + 1
     WHERE session_id = $1
     RETURNING warning_count`,
    [sessionId],
  )
  return Number(rows[0]?.warning_count ?? 0)
}

export async function markSessionSubmittedQuery(sessionId) {
  const pool = getPool()
  await pool.query(
    `UPDATE exam_sessions
     SET status = 'submitted', submitted_at = NOW(), auto_submitted = FALSE
     WHERE session_id = $1`,
    [sessionId],
  )
}

export async function upsertStudentAnswerQuery(sessionId, questionId, { choiceId, answerText }) {
  const pool = getPool()
  const text = answerText != null ? String(answerText).trim().toUpperCase() : null
  await pool.query(
    `INSERT INTO student_answers (session_id, question_id, choice_id, answer_text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, question_id)
     DO UPDATE SET choice_id = EXCLUDED.choice_id, answer_text = EXCLUDED.answer_text`,
    [sessionId, questionId, choiceId ?? null, text],
  )
}

export async function gradeSessionAnswersQuery(sessionId) {
  const pool = getPool()
  await pool.query(
    `UPDATE student_answers sa
     SET is_correct = CASE
       WHEN q.question_type IN ('mcq', 'true_false') THEN (
         SELECT c.is_correct FROM choices c WHERE c.choice_id = sa.choice_id
       )
       WHEN q.question_type = 'identification' THEN (
         EXISTS (
           SELECT 1 FROM choices c
           WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
             AND UPPER(TRIM(c.choice_text)) = COALESCE(sa.answer_text, '')
         )
       )
       ELSE NULL
     END
     FROM questions q
     WHERE sa.question_id = q.question_id AND sa.session_id = $1`,
    [sessionId],
  )

  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN sa.is_correct = TRUE THEN q.points ELSE 0 END), 0) AS raw_score,
       COALESCE(SUM(q.points), 0) AS total_points
     FROM questions q
     LEFT JOIN student_answers sa ON sa.question_id = q.question_id AND sa.session_id = $1
     WHERE q.exam_id = (SELECT exam_id FROM exam_sessions WHERE session_id = $1)`,
    [sessionId],
  )

  const raw = Number(rows[0]?.raw_score ?? 0)
  const total = Number(rows[0]?.total_points ?? 0)

  await pool.query(
    `INSERT INTO exam_results (session_id, raw_score, total_points, score_released)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (session_id)
     DO UPDATE SET raw_score = EXCLUDED.raw_score, total_points = EXCLUDED.total_points, computed_at = NOW()`,
    [sessionId, raw, total],
  )

  return { rawScore: raw, totalPoints: total }
}

export async function findChoiceIdByTextQuery(questionId, choiceText) {
  const pool = getPool()
  const text = String(choiceText || '').trim()
  if (!text) return null
  const { rows } = await pool.query(
    `SELECT choice_id FROM choices
     WHERE question_id = $1 AND TRIM(choice_text) = $2
     LIMIT 1`,
    [questionId, text],
  )
  if (rows[0]?.choice_id) return rows[0].choice_id
  const { rows: ci } = await pool.query(
    `SELECT choice_id FROM choices
     WHERE question_id = $1 AND UPPER(TRIM(choice_text)) = UPPER($2)
     LIMIT 1`,
    [questionId, text],
  )
  return ci[0]?.choice_id ?? null
}

export async function updateExamStatusByIdQuery(classId, examId, status) {
  const pool = getPool()
  const { rowCount } = await pool.query(
    `UPDATE exams SET status = $1, updated_at = NOW()
     WHERE exam_id = $2 AND class_id = $3`,
    [status, examId, classId],
  )
  return rowCount > 0
}
