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
       sm.member_id AS "memberId",
       sm.school_id AS "schoolId",
       u.uid,
       u.first_name,
       u.middle_name,
       u.last_name,
       (SELECT COUNT(*)::int FROM student_answers sa WHERE sa.session_id = es.session_id) AS "answerCount",
       (SELECT COUNT(*)::int FROM cheating_logs cl WHERE cl.session_id = es.session_id) AS "violationCount"
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN institution_members sm ON ${memberJoin}
     JOIN users u ON sm.uid = u.uid
     LEFT JOIN exam_results er ON er.session_id = es.session_id
     WHERE e.exam_id = $1 AND e.class_id = $2
     ORDER BY es.submitted_at DESC NULLS LAST, es.started_at DESC`,
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
    schoolId: r.schoolId || '',
    studentName: formatStudentName(r) || 'Unknown student',
    answerCount: Number(r.answerCount || 0),
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
       sa.is_correct AS "isCorrect"
     FROM student_answers sa
     JOIN questions q ON q.question_id = sa.question_id
     LEFT JOIN choices c ON c.choice_id = sa.choice_id
     WHERE sa.session_id = $1
     ORDER BY q.order_num ASC`,
    [sessionId],
  )
  return rows.map((r) => ({
    id: r.id,
    questionId: r.questionId,
    questionText: r.questionText,
    questionType: r.questionType,
    answer: r.choiceText || r.answerText || '—',
    isCorrect: r.isCorrect,
  }))
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
