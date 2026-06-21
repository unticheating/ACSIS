import { getPool } from '../db.js'
import { ensureCheatEventSchema } from '../lib/ensureCheatEventSchema.js'
import { getExamSessionUserColumn } from '../lib/schemaCompat.js'
import { ensureExamSessionShuffleColumns } from '../lib/ensureExamSessionShuffleSchema.js'
import { ensureExamSessionLockedColumns } from '../lib/ensureExamSessionLockedSchema.js'
import { buildShuffleLayout } from '../lib/examShuffle.js'
import { computeExamRanksQuery } from './examResultsRepository.js'

export async function getExamForJoinQuery(classId, examId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT e.exam_id, e.title, e.password, e.scheduled_start, e.scheduled_end, e.status, e.updated_at, c.institution_id
     FROM exams e
     JOIN classes c ON c.class_id = e.class_id
     WHERE e.exam_id = $1 AND e.class_id = $2 AND e.is_archived = FALSE`,
    [examId, classId],
  )
  return rows[0] || null
}

export async function findExamSessionQuery(examId, studentMemberId) {
  await ensureExamSessionLockedColumns()
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)
  const { rows } = await pool.query(
    `SELECT session_id, status, warning_count, started_at, locked_at, lock_reason
     FROM exam_sessions
     WHERE exam_id = $1 AND ${col} = $2
     LIMIT 1`,
    [examId, studentMemberId],
  )
  return rows[0] || null
}

export async function getExamShuffleFlagsQuery(examId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT shuffle_questions AS "shuffleQuestions", shuffle_choices AS "shuffleChoices"
     FROM exams WHERE exam_id = $1`,
    [examId],
  )
  return rows[0] || { shuffleQuestions: false, shuffleChoices: false }
}

export async function fetchExamQuestionChoiceRowsQuery(examId) {
  const pool = getPool()
  const { rows: questions } = await pool.query(
    `SELECT q.question_id, q.section_id
     FROM questions q
     LEFT JOIN exam_sections s ON s.section_id = q.section_id
     WHERE q.exam_id = $1
     ORDER BY COALESCE(s.order_num, 9999), q.order_num ASC`,
    [examId],
  )
  const { rows: choices } = await pool.query(
    `SELECT c.choice_id, c.question_id
     FROM choices c
     JOIN questions q ON q.question_id = c.question_id
     WHERE q.exam_id = $1
     ORDER BY c.question_id, c.order_num ASC`,
    [examId],
  )
  const choicesByQuestion = new Map()
  for (const c of choices) {
    const qid = Number(c.question_id)
    if (!choicesByQuestion.has(qid)) choicesByQuestion.set(qid, [])
    choicesByQuestion.get(qid).push(c)
  }
  return { questions, choicesByQuestion }
}

export async function createExamSessionQuery(examId, studentMemberId) {
  await ensureExamSessionShuffleColumns()
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)

  const flags = await getExamShuffleFlagsQuery(examId)
  const needsLayout = flags.shuffleQuestions || flags.shuffleChoices
  let questionOrder = null
  let choiceOrders = null

  if (needsLayout) {
    const { questions, choicesByQuestion } = await fetchExamQuestionChoiceRowsQuery(examId)
    const layout = buildShuffleLayout(questions, choicesByQuestion, {
      shuffleQuestions: flags.shuffleQuestions,
      shuffleChoices: flags.shuffleChoices,
    })
    questionOrder = layout.questionOrder
    choiceOrders = layout.choiceOrders
  }

  const { rows } = await pool.query(
    `INSERT INTO exam_sessions (exam_id, ${col}, status, question_order, choice_orders)
     VALUES ($1, $2, 'in_progress', $3::jsonb, $4::jsonb)
     RETURNING session_id, status, warning_count, started_at, question_order, choice_orders`,
    [
      examId,
      studentMemberId,
      questionOrder ? JSON.stringify(questionOrder) : null,
      choiceOrders && Object.keys(choiceOrders).length ? JSON.stringify(choiceOrders) : null,
    ],
  )
  return rows[0]
}

export async function getSessionShuffleLayoutQuery(sessionId) {
  await ensureExamSessionShuffleColumns()
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT question_order AS "questionOrder", choice_orders AS "choiceOrders"
     FROM exam_sessions WHERE session_id = $1`,
    [sessionId],
  )
  if (!rows[0]) return null
  return {
    questionOrder: rows[0].questionOrder || null,
    choiceOrders: rows[0].choiceOrders || null,
  }
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
  await ensureExamSessionLockedColumns()
  const pool = getPool()
  const col = await getExamSessionUserColumn(pool)
  const { rows } = await pool.query(
    `SELECT es.session_id, es.status, es.warning_count, es.exam_id, es.locked_at, es.lock_reason
     FROM exam_sessions es
     WHERE es.exam_id = $1 AND es.${col} = $2
     LIMIT 1`,
    [examId, studentMemberId],
  )
  return rows[0] || null
}

export async function lockExamSessionQuery(sessionId, reason = null) {
  await ensureExamSessionLockedColumns()
  const pool = getPool()
  const { rows } = await pool.query(
    `UPDATE exam_sessions
     SET locked_at = COALESCE(locked_at, NOW()),
         lock_reason = COALESCE(lock_reason, $2)
     WHERE session_id = $1 AND status = 'in_progress'
     RETURNING session_id, locked_at, lock_reason`,
    [sessionId, reason],
  )
  return rows[0] || null
}

export async function getQuestionTypeQuery(questionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT question_type FROM questions WHERE question_id = $1`,
    [questionId],
  )
  return rows[0]?.question_type ?? null
}

export async function listStudentAnswersForSessionQuery(sessionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT sa.question_id, sa.choice_id, sa.answer_text, q.question_type, c.choice_text
     FROM student_answers sa
     JOIN questions q ON q.question_id = sa.question_id
     LEFT JOIN choices c ON c.choice_id = sa.choice_id
     WHERE sa.session_id = $1`,
    [sessionId],
  )
  return rows
}

const CHEAT_EVENTS = new Set([
  'alt_tab',
  'copy_attempt',
  'paste_attempt',
  'window_blur',
  'devtools_open',
  'screenshot_attempt',
  'win_key',
  'other',
])

export function isValidCheatEvent(type) {
  return CHEAT_EVENTS.has(type)
}

export async function insertCheatingLogQuery(sessionId, eventType, details = null) {
  await ensureCheatEventSchema()
  const pool = getPool()
  try {
    await pool.query(
      `INSERT INTO cheating_logs (session_id, event_type, details)
       VALUES ($1, $2::cheat_event, $3)`,
      [sessionId, eventType, details],
    )
  } catch (err) {
    const msg = String(err?.message || '')
    const invalidEnum =
      err?.code === '22P02' || msg.includes('invalid input value for enum') || msg.includes('cheat_event')
    if (eventType === 'other' || !invalidEnum) throw err
    await pool.query(
      `INSERT INTO cheating_logs (session_id, event_type, details)
       VALUES ($1, 'other'::cheat_event, $2)`,
      [sessionId, `[${eventType}] ${details || ''}`.slice(0, 500)],
    )
  }
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

export async function isSessionScoreReleasedQuery(sessionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT score_released FROM exam_results WHERE session_id = $1`,
    [sessionId],
  )
  return Boolean(rows[0]?.score_released)
}

export async function markSessionSubmittedQuery(sessionId, autoSubmitted = false) {
  const pool = getPool()
  await pool.query(
    `UPDATE exam_sessions
     SET status = 'submitted', submitted_at = NOW(), auto_submitted = $2
     WHERE session_id = $1`,
    [sessionId, Boolean(autoSubmitted)],
  )
}

export async function upsertStudentAnswerQuery(sessionId, questionId, { choiceId, answerText, questionType }) {
  const pool = getPool()
  const { rows: statusRows } = await pool.query(
    `SELECT status, locked_at FROM exam_sessions WHERE session_id = $1`,
    [sessionId],
  )
  if (statusRows[0]?.status === 'submitted') {
    const err = new Error('Exam session is already submitted.')
    err.code = 'SESSION_CLOSED'
    throw err
  }
  if (statusRows[0]?.locked_at) {
    const err = new Error('Exam is locked. Use Send exam to submit your answers.')
    err.code = 'SESSION_LOCKED'
    throw err
  }
  let text = answerText != null ? String(answerText).trim() : null
  const qType = questionType || (await getQuestionTypeQuery(questionId))
  if (text && qType === 'identification') {
    text = text.toUpperCase()
  }
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
     SET 
       is_correct = CASE
         WHEN q.question_type = 'identification' AND EXISTS (
             SELECT 1 FROM choices c
             WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
               AND UPPER(TRIM(c.choice_text)) = UPPER(TRIM(COALESCE(sa.answer_text, '')))
         ) THEN TRUE
         WHEN q.question_type = 'coding' AND EXISTS (
             SELECT 1 FROM choices c
             WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
               AND TRIM(c.choice_text) = TRIM(COALESCE(sa.answer_text, ''))
         ) THEN TRUE
         WHEN sa.manually_checked = TRUE THEN sa.is_correct
         WHEN q.question_type = 'mcq' THEN (
           SELECT c.is_correct FROM choices c WHERE c.choice_id = sa.choice_id
         )
         WHEN q.question_type = 'true_false' THEN (
           EXISTS (
             SELECT 1 FROM choices c
             WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
               AND UPPER(TRIM(c.choice_text)) = UPPER(TRIM(COALESCE(sa.answer_text, '')))
           )
         )
         WHEN q.question_type = 'identification' THEN FALSE
         WHEN q.question_type = 'coding' THEN FALSE
         WHEN q.question_type = 'matching' THEN (
           COALESCE(TRIM(sa.answer_text), '') <> ''
           AND NOT EXISTS (
             SELECT 1 FROM choices c
             WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
               AND COALESCE(NULLIF(TRIM(sa.answer_text), '')::jsonb ->> split_part(c.choice_text, E'\x1e', 1), '')
                 IS DISTINCT FROM split_part(c.choice_text, E'\x1e', 2)
           )
         )
         WHEN q.question_type IN ('essay', 'diagramming') THEN NULL
         ELSE NULL
       END,
       manually_checked = CASE
         WHEN q.question_type = 'identification' AND EXISTS (
             SELECT 1 FROM choices c
             WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
               AND UPPER(TRIM(c.choice_text)) = UPPER(TRIM(COALESCE(sa.answer_text, '')))
         ) THEN FALSE
         WHEN q.question_type = 'coding' AND EXISTS (
             SELECT 1 FROM choices c
             WHERE c.question_id = sa.question_id AND c.is_correct = TRUE
               AND TRIM(c.choice_text) = TRIM(COALESCE(sa.answer_text, ''))
         ) THEN FALSE
         ELSE sa.manually_checked
       END
     FROM questions q
     WHERE sa.question_id = q.question_id AND sa.session_id = $1`,
    [sessionId],
  )

  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(
         CASE 
           WHEN q.question_type = 'matching' THEN 
             CASE 
               WHEN sa.manually_checked = TRUE THEN 
                 CASE WHEN sa.is_correct = TRUE THEN q.points * (SELECT COUNT(*) FROM choices c WHERE c.question_id = q.question_id AND c.is_correct = TRUE) ELSE 0 END
               ELSE
                 q.points * (
                   SELECT COUNT(*) FROM choices c
                   WHERE c.question_id = q.question_id AND c.is_correct = TRUE
                     AND COALESCE(sa.answer_text::jsonb ->> split_part(c.choice_text, E'\\x1e', 1), '') = split_part(c.choice_text, E'\\x1e', 2)
                 )
             END
           WHEN sa.is_correct = TRUE THEN q.points 
           ELSE 0 
         END
       ), 0) AS raw_score,
       COALESCE(SUM(
         CASE 
           WHEN q.question_type = 'matching' THEN 
             q.points * (SELECT COUNT(*) FROM choices c WHERE c.question_id = q.question_id AND c.is_correct = TRUE)
           ELSE q.points 
         END
       ), 0) AS total_points
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

  const { rows: examRows } = await pool.query(
    `SELECT exam_id FROM exam_sessions WHERE session_id = $1`,
    [sessionId],
  )
  const examId = examRows[0]?.exam_id
  if (examId) {
    await computeExamRanksQuery(examId)
  }

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

function normalizeSchedulePatch(schedulePatch) {
  if (schedulePatch === undefined) return {}
  if (schedulePatch instanceof Date || schedulePatch === null) {
    return { scheduledEnd: schedulePatch }
  }
  if (typeof schedulePatch === 'object' && schedulePatch !== null) {
    const out = {}
    if ('scheduledEnd' in schedulePatch) out.scheduledEnd = schedulePatch.scheduledEnd
    if ('scheduledStart' in schedulePatch) out.scheduledStart = schedulePatch.scheduledStart
    return out
  }
  return {}
}

export async function updateExamStatusByIdQuery(classId, examId, status, schedulePatch = undefined) {
  const pool = getPool()
  const patch = normalizeSchedulePatch(schedulePatch)
  let query = `UPDATE exams SET status = $1, updated_at = NOW()`
  const params = [status]

  if ('scheduledStart' in patch) {
    params.push(patch.scheduledStart ? new Date(patch.scheduledStart) : null)
    query += `, scheduled_start = $${params.length}`
  }
  if ('scheduledEnd' in patch) {
    params.push(patch.scheduledEnd ? new Date(patch.scheduledEnd) : null)
    query += `, scheduled_end = $${params.length}`
  }

  query += ` WHERE exam_id = $${params.length + 1} AND class_id = $${params.length + 2}`
  params.push(examId, classId)

  const { rowCount } = await pool.query(query, params)
  return rowCount > 0
}

export async function resetExamSessionsQuery(examId) {
  const pool = getPool()
  await pool.query(
    `DELETE FROM exam_results 
     WHERE session_id IN (SELECT session_id FROM exam_sessions WHERE exam_id = $1 AND status != 'submitted')`,
    [examId]
  )
  await pool.query(
    `UPDATE exam_sessions 
     SET status = 'in_progress', 
         submitted_at = NULL, 
         locked_at = NULL, 
         lock_reason = NULL, 
         auto_submitted = FALSE 
     WHERE exam_id = $1 AND status != 'submitted'`, 
    [examId]
  )
}

export async function unlockExamSessionsQuery(examId) {
  await ensureExamSessionLockedColumns()
  const pool = getPool()
  await pool.query(
    `UPDATE exam_sessions
     SET locked_at = NULL, lock_reason = NULL
     WHERE exam_id = $1 AND status <> 'submitted'`,
    [examId]
  )
}

export async function deleteExamSessionQuery(sessionId, examId) {
  const pool = getPool()
  const { rowCount } = await pool.query(
    `DELETE FROM exam_sessions WHERE session_id = $1 AND exam_id = $2 AND status = 'in_progress'`,
    [sessionId, examId]
  )
  return rowCount > 0
}
