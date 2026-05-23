import { getPool } from '../db.js'
import { getExamSessionUserColumn } from '../lib/schemaCompat.js'

async function sessionMemberJoin(esAlias = 'es', smAlias = 'sm') {
  const col = await getExamSessionUserColumn(getPool())
  return `${esAlias}.${col} = ${smAlias}.member_id`
}

function formatStudentName(row) {
  return [row.first_name, row.middle_name, row.last_name]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function listExamSessionsForExamQuery(classId, examId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'sm')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS "sessionId",
       es.status,
       es.warning_count AS "warningCount",
       es.started_at AS "startedAt",
       es.submitted_at AS "submittedAt",
       er.raw_score AS "rawScore",
       er.total_points AS "totalPoints",
       er.percentage,
       er.rank,
       er.score_released AS "scoreReleased",
       sm.member_id AS "memberId",
       sm.school_id AS "schoolId",
       u.uid,
       u.first_name,
       u.middle_name,
       u.last_name,
       (SELECT COUNT(*)::int FROM student_answers sa WHERE sa.session_id = es.session_id) AS "answerCount",
       (SELECT COUNT(*)::int FROM student_answers sa
        WHERE sa.session_id = es.session_id AND sa.manually_checked = FALSE) AS "uncheckedCount",
       (SELECT COUNT(*)::int FROM cheating_logs cl WHERE cl.session_id = es.session_id) AS "violationCount"
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN institution_members sm ON ${memberJoin}
     JOIN users u ON sm.uid = u.uid
     LEFT JOIN exam_results er ON er.session_id = es.session_id
     WHERE e.exam_id = $1 AND e.class_id = $2
     ORDER BY er.rank ASC NULLS LAST, er.percentage DESC NULLS LAST, u.last_name, u.first_name`,
    [examId, classId],
  )

  return rows.map((r) => ({
    sessionId: r.sessionId,
    memberId: r.memberId,
    status: r.status,
    warningCount: Number(r.warningCount || 0),
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    rawScore: r.rawScore != null ? Number(r.rawScore) : null,
    totalPoints: r.totalPoints != null ? Number(r.totalPoints) : null,
    percentage: r.percentage != null ? Number(r.percentage) : null,
    rank: r.rank != null ? Number(r.rank) : null,
    scoreReleased: Boolean(r.scoreReleased),
    schoolId: r.schoolId || '',
    studentName: formatStudentName(r) || 'Unknown student',
    answerCount: Number(r.answerCount || 0),
    uncheckedCount: Number(r.uncheckedCount || 0),
    reviewComplete:
      r.status !== 'submitted' ||
      (Number(r.answerCount || 0) > 0 && Number(r.uncheckedCount || 0) === 0),
    violationCount: Number(r.violationCount || 0),
  }))
}

export async function listStudentAnswersForSessionQuery(sessionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       sa.answer_id AS id,
       sa.question_id AS "questionId",
       q.question_text AS "questionText",
       q.question_type AS "questionType",
       sa.answer_text AS "answerText",
       c.choice_text AS "choiceText",
       sa.is_correct AS "isCorrect",
       sa.manually_checked AS "manuallyChecked",
       sa.checked_by AS "checkedBy",
       sa.checked_at AS "checkedAt",
       (SELECT c2.choice_text FROM choices c2
        WHERE c2.question_id = q.question_id AND c2.is_correct = TRUE
        LIMIT 1) AS "expectedAnswer"
     FROM student_answers sa
     JOIN questions q ON q.question_id = sa.question_id
     LEFT JOIN exam_sections s ON s.section_id = q.section_id
     LEFT JOIN choices c ON c.choice_id = sa.choice_id
     WHERE sa.session_id = $1
     ORDER BY COALESCE(s.order_num, 9999), q.order_num ASC`,
    [sessionId],
  )
  return rows.map((r) => ({
    id: r.id,
    questionId: r.questionId,
    questionText: r.questionText,
    questionType: r.questionType,
    answer: r.choiceText || r.answerText || '—',
    isCorrect: r.isCorrect,
    manuallyChecked: Boolean(r.manuallyChecked),
    checkedBy: r.checkedBy,
    checkedAt: r.checkedAt,
    expectedAnswer: r.expectedAnswer || null,
  }))
}

export async function updateManualAnswerGradeQuery(sessionId, answerId, { isCorrect, checkedBy }) {
  const pool = getPool()
  const { rowCount } = await pool.query(
    `UPDATE student_answers sa
     SET is_correct = $1,
         manually_checked = TRUE,
         checked_by = $2,
         checked_at = NOW()
     FROM exam_sessions es
     WHERE sa.answer_id = $3
       AND sa.session_id = $4
       AND es.session_id = sa.session_id`,
    [Boolean(isCorrect), checkedBy, answerId, sessionId],
  )
  return rowCount > 0
}

/** Dense rank by raw_score desc, then earlier submit wins ties. */
export async function computeExamRanksQuery(examId) {
  const pool = getPool()
  await pool.query(
    `WITH ranked AS (
       SELECT
         er.result_id,
         RANK() OVER (
           ORDER BY er.raw_score DESC NULLS LAST,
             es.submitted_at ASC NULLS LAST
         )::int AS new_rank
       FROM exam_results er
       JOIN exam_sessions es ON es.session_id = er.session_id
       WHERE es.exam_id = $1 AND es.status = 'submitted'
     )
     UPDATE exam_results er
     SET rank = ranked.new_rank
     FROM ranked
     WHERE er.result_id = ranked.result_id`,
    [examId],
  )
}

export async function getTopRankedSessionQuery(examId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'sm')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS "sessionId",
       er.rank,
       er.percentage,
       er.raw_score AS "rawScore",
       TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS "studentName",
       sm.school_id AS "schoolId"
     FROM exam_results er
     JOIN exam_sessions es ON es.session_id = er.session_id
     JOIN institution_members sm ON ${memberJoin}
     JOIN users u ON sm.uid = u.uid
     WHERE es.exam_id = $1 AND er.rank = 1
     ORDER BY er.percentage DESC NULLS LAST
     LIMIT 1`,
    [examId],
  )
  return rows[0] || null
}

export async function insertReportLogQuery(examId, generatedBy, reportType) {
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO report_logs (exam_id, generated_by, report_type)
     VALUES ($1, $2, $3::report_type)
     RETURNING report_log_id AS id, generated_at AS "generatedAt"`,
    [examId, generatedBy, reportType],
  )
  return rows[0]
}

export async function releaseExamScoresQuery(examId) {
  const pool = getPool()
  await pool.query(
    `UPDATE exam_results er
     SET score_released = TRUE, released_at = COALESCE(released_at, NOW())
     FROM exam_sessions es
     WHERE er.session_id = es.session_id AND es.exam_id = $1`,
    [examId],
  )
}

export async function listSessionsForScoreEmailQuery(examId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'sm')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS "sessionId",
       er.raw_score AS "rawScore",
       er.total_points AS "totalPoints",
       er.percentage,
       er.email_sent AS "emailSent",
       u.email,
       TRIM(u.first_name || ' ' || u.last_name) AS "studentName",
       e.title AS "examTitle"
     FROM exam_sessions es
     JOIN exam_results er ON er.session_id = es.session_id
     JOIN exams e ON e.exam_id = es.exam_id
     JOIN institution_members sm ON ${memberJoin}
     JOIN users u ON sm.uid = u.uid
     WHERE es.exam_id = $1 AND es.status = 'submitted'`,
    [examId],
  )
  return rows
}

export async function markResultEmailSentQuery(sessionId) {
  const pool = getPool()
  await pool.query(
    `UPDATE exam_results SET email_sent = TRUE WHERE session_id = $1`,
    [sessionId],
  )
}

export async function getMemberDisplayNameQuery(memberId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS name
     FROM institution_members im
     JOIN users u ON u.uid = im.uid
     WHERE im.member_id = $1`,
    [memberId],
  )
  return rows[0]?.name || 'Faculty'
}

export async function listStudentPerformanceQuery(studentMemberId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'sm')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS "sessionId",
       e.exam_id AS "examId",
       e.title AS "examTitle",
       c.class_id AS "classId",
       c.class_name AS "className",
       es.status,
       es.submitted_at AS "submittedAt",
       er.raw_score AS "rawScore",
       er.total_points AS "totalPoints",
       er.percentage,
       es.warning_count AS "warningCount"
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members sm ON ${memberJoin}
     LEFT JOIN exam_results er ON er.session_id = es.session_id
     WHERE sm.member_id = $1
       AND (es.status != 'submitted' OR er.score_released = TRUE)
     ORDER BY es.submitted_at DESC NULLS LAST, es.started_at DESC`,
    [studentMemberId],
  )
  return rows
}

/** One live exam per teacher: open beats waiting, then most recently updated. */
export async function getTeacherActiveMonitoringExamQuery(teacherMemberId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       e.exam_id AS id,
       e.title,
       e.status,
       e.password AS code,
       e.time_limit AS duration,
       e.updated_at AS "updatedAt",
       c.class_id AS "classId",
       c.class_name AS "className"
     FROM exams e
     JOIN classes c ON e.class_id = c.class_id
     WHERE c.member_id = $1 AND c.is_active = TRUE AND e.is_archived = FALSE
       AND e.status IN ('open', 'waiting')
     ORDER BY
       CASE e.status WHEN 'open' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END,
       e.updated_at DESC
     LIMIT 1`,
    [teacherMemberId],
  )
  return rows[0] || null
}

export async function closeOtherTeacherOngoingExamsQuery(teacherMemberId, classId, examId) {
  const pool = getPool()
  await pool.query(
    `UPDATE exams e
     SET status = 'closed', updated_at = NOW()
     FROM classes c
     WHERE e.class_id = c.class_id
       AND c.member_id = $1
       AND c.is_active = TRUE
       AND e.is_archived = FALSE
       AND e.status IN ('open', 'waiting')
       AND NOT (e.exam_id = $3 AND c.class_id = $2)`,
    [teacherMemberId, classId, examId],
  )
}

export async function listClassEnrolledStudentsQuery(classId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       sm.member_id AS "memberId",
       sm.school_id AS "schoolId",
       u.first_name,
       u.middle_name,
       u.last_name
     FROM class_enrollments ce
     JOIN institution_members sm ON ce.member_id = sm.member_id
     JOIN users u ON sm.uid = u.uid
     WHERE ce.class_id = $1
     ORDER BY u.last_name, u.first_name`,
    [classId],
  )
  return rows.map((r) => ({
    memberId: r.memberId,
    schoolId: r.schoolId || '',
    studentName: formatStudentName(r) || 'Unknown student',
  }))
}

export async function listExamsForTeacherReportsQuery(memberId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       e.exam_id AS id,
       e.title,
       e.status,
       c.class_id AS "classId",
       c.class_name AS "className",
       (SELECT COUNT(*)::int FROM exam_sessions es WHERE es.exam_id = e.exam_id) AS "sessionCount",
       (SELECT COUNT(*)::int FROM exam_sessions es
        WHERE es.exam_id = e.exam_id AND es.status = 'submitted') AS "submittedCount"
     FROM exams e
     JOIN classes c ON e.class_id = c.class_id
     WHERE c.member_id = $1 AND c.is_active = TRUE AND e.is_archived = FALSE
     ORDER BY e.created_at DESC`,
    [memberId],
  )
  return rows
}

export async function listCheatingLogsForExamQuery(examId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'sm')
  const { rows } = await pool.query(
    `SELECT
       cl.log_id AS id,
       cl.session_id AS "sessionId",
       cl.event_type::text AS "eventType",
       cl.details,
       cl.occurred_at AS "occurredAt",
       TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS "studentName",
       sm.school_id AS "schoolId"
     FROM cheating_logs cl
     JOIN exam_sessions es ON cl.session_id = es.session_id
     JOIN institution_members sm ON ${memberJoin}
     JOIN users u ON sm.uid = u.uid
     WHERE es.exam_id = $1
     ORDER BY cl.occurred_at DESC`,
    [examId],
  )
  return rows
}

export async function listCheatingLogsForSessionQuery(sessionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       cl.log_id AS id,
       cl.event_type::text AS "eventType",
       cl.details,
       cl.occurred_at AS "occurredAt"
     FROM cheating_logs cl
     WHERE cl.session_id = $1
     ORDER BY cl.occurred_at ASC`,
    [sessionId],
  )
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    details: r.details,
    occurredAt: r.occurredAt,
    label: [r.eventType, r.details].filter(Boolean).join(' — '),
  }))
}

export async function getExamSubmissionStatsQuery(examId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM class_enrollments ce
        WHERE ce.class_id = e.class_id) AS enrolled,
       (SELECT COUNT(*)::int FROM exam_sessions es WHERE es.exam_id = e.exam_id) AS joined,
       (SELECT COUNT(*)::int FROM exam_sessions es
        WHERE es.exam_id = e.exam_id AND es.status = 'submitted') AS submitted
     FROM exams e
     WHERE e.exam_id = $1`,
    [examId],
  )
  return rows[0] || { enrolled: 0, joined: 0, submitted: 0 }
}
