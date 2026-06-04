import { getPool } from '../db.js'
import { ensureExamSessionTicketColumns } from '../lib/ensureTicketSchema.js'
import { getExamSessionUserColumn } from '../lib/schemaCompat.js'
import { SQL_JOIN_STUDENTS, SQL_MEMBER_SCHOOL_ID } from '../lib/memberSql.js'

async function sessionMemberJoin(esAlias = 'es', imAlias = 'im') {
  const col = await getExamSessionUserColumn(getPool())
  return `${esAlias}.${col} = ${imAlias}.member_id`
}

export async function getInstitutionMaxWarnings(institutionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT max_warnings FROM institutions WHERE institution_id = $1`,
    [institutionId],
  )
  return Number(rows[0]?.max_warnings ?? 3)
}

export async function getAdminDashboardStatsQuery(institutionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
      (SELECT COUNT(*)
       FROM exams e
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = $1 AND c.is_active = TRUE
         AND e.is_archived = FALSE AND e.status IN ('open', 'waiting')) AS "ongoingExams",
      (SELECT COUNT(*)
       FROM exams e
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = $1 AND c.is_active = TRUE AND e.is_archived = FALSE) AS "totalExams",
      (SELECT COUNT(DISTINCT es.session_id)
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.exam_id
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = $1 AND c.is_active = TRUE AND es.warning_count > 0) AS "detectedStudents"`,
    [institutionId],
  )
  return rows[0]
}

export async function listOngoingExamsQuery(institutionId, limit = 5) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       e.exam_id AS id,
       e.title,
       e.status,
       e.updated_at,
       TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS "professorName",
       (SELECT COUNT(*)::int FROM exam_sessions es
        WHERE es.exam_id = e.exam_id AND es.status = 'submitted') AS submitted,
       (SELECT COUNT(*)::int FROM class_enrollments ce
        WHERE ce.class_id = c.class_id) AS enrolled
     FROM exams e
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON c.member_id = im.member_id
     JOIN users u ON im.uid = u.uid
     WHERE c.institution_id = $1 AND c.is_active = TRUE
       AND e.is_archived = FALSE AND e.status IN ('open', 'waiting')
     ORDER BY e.updated_at DESC
     LIMIT $2`,
    [institutionId, limit],
  )
  return rows
}

export async function listDetectedStudentsQuery(institutionId, maxWarnings, limit = 5) {
  await ensureExamSessionTicketColumns()
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'im')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS "sessionId",
       es.warning_count AS strikes,
       su.first_name AS "firstName",
       su.last_name AS "lastName",
       su.avatar_url AS "avatarUrl",
       ${SQL_MEMBER_SCHOOL_ID} AS "schoolId",
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS "studentName",
       e.title AS "examTitle",
       e.exam_id AS "examId",
       (SELECT cl.event_type::text
        FROM cheating_logs cl
        WHERE cl.session_id = es.session_id
        ORDER BY cl.occurred_at DESC
        LIMIT 1) AS "lastEvent",
       (SELECT cl.occurred_at
        FROM cheating_logs cl
        WHERE cl.session_id = es.session_id
        ORDER BY cl.occurred_at DESC
        LIMIT 1) AS "lastEventAt",
       es.ticket_issued_at AS "ticketIssuedAt",
       CASE
         WHEN es.ticket_issued_at IS NOT NULL THEN 'ticketed'
         WHEN es.warning_count >= $2 THEN 'flagged'
         ELSE 'warned'
       END AS status
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON ${memberJoin}
     ${SQL_JOIN_STUDENTS}
     JOIN users su ON im.uid = su.uid
     WHERE c.institution_id = $1 AND c.is_active = TRUE AND es.warning_count > 0
     ORDER BY es.warning_count DESC, es.started_at DESC
     LIMIT $3`,
    [institutionId, maxWarnings, limit],
  )
  return rows.map((r) => ({
    ...r,
    studentName: r.studentName?.trim() || 'Unknown student',
    ticketIssued: Boolean(r.ticketIssuedAt),
    subtitle:
      r.status === 'ticketed'
        ? `Ticket issued (${r.strikes} strike${r.strikes === 1 ? '' : 's'})`
        : r.status === 'flagged'
          ? `Flagged (${r.strikes} warnings, max ${maxWarnings})`
          : `Warned (${r.strikes} warning${r.strikes === 1 ? '' : 's'})`,
  }))
}

export async function issueViolationTicketQuery(institutionId, sessionId, adminMemberId) {
  await ensureExamSessionTicketColumns()
  const pool = getPool()
  const { rows } = await pool.query(
    `UPDATE exam_sessions es
     SET ticket_issued_at = NOW(),
         ticket_issued_by = $3
     FROM exams e
     JOIN classes c ON e.class_id = c.class_id
     WHERE es.exam_id = e.exam_id
       AND es.session_id = $1
       AND c.institution_id = $2
       AND c.is_active = TRUE
       AND es.ticket_issued_at IS NULL
     RETURNING es.session_id AS "sessionId", es.ticket_issued_at AS "ticketIssuedAt"`,
    [sessionId, institutionId, adminMemberId],
  )
  return rows[0] || null
}

export async function getViolationSessionDetailQuery(institutionId, sessionId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'im')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS "sessionId",
       es.status AS "sessionStatus",
       es.warning_count AS strikes,
       es.started_at AS "startedAt",
       es.submitted_at AS "submittedAt",
       es.ticket_issued_at AS "ticketIssuedAt",
       ${SQL_MEMBER_SCHOOL_ID} AS "schoolId",
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS student,
       e.exam_id AS "examId",
       e.title AS exam,
       e.status AS "examStatus",
       c.class_id AS "classId",
       c.class_name AS "className",
       TRIM(tu.first_name || ' ' || COALESCE(tu.middle_name || ' ', '') || tu.last_name) AS "professorName",
       er.raw_score AS "rawScore",
       er.total_points AS "totalPoints",
       er.percentage
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON ${memberJoin}
     ${SQL_JOIN_STUDENTS}
     JOIN users su ON im.uid = su.uid
     LEFT JOIN exam_results er ON er.session_id = es.session_id
     LEFT JOIN institution_members tim ON c.member_id = tim.member_id
     LEFT JOIN users tu ON tim.uid = tu.uid
     WHERE es.session_id = $1 AND c.institution_id = $2 AND c.is_active = TRUE`,
    [sessionId, institutionId],
  )
  if (!rows[0]) return null

  const { rows: logs } = await pool.query(
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

  const row = rows[0]
  return {
    sessionId: row.sessionId,
    sessionStatus: row.sessionStatus,
    strikes: Number(row.strikes || 0),
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    ticketIssuedAt: row.ticketIssuedAt,
    ticketIssued: Boolean(row.ticketIssuedAt),
    schoolId: row.schoolId || '',
    student: row.student?.trim() || 'Unknown student',
    examId: row.examId,
    exam: row.exam,
    examStatus: row.examStatus,
    classId: row.classId,
    className: row.className,
    professorName: row.professorName?.trim() || 'Unknown Instructor',
    rawScore: row.rawScore != null ? Number(row.rawScore) : null,
    totalPoints: row.totalPoints != null ? Number(row.totalPoints) : null,
    percentage: row.percentage != null ? Number(row.percentage) : null,
    logs: logs.map((l) => ({
      id: l.id,
      eventType: l.eventType,
      details: l.details,
      occurredAt: l.occurredAt,
      label: formatCheatEventLabel(l.eventType),
    })),
  }
}

export async function listViolationsQuery(institutionId, maxWarnings) {
  await ensureExamSessionTicketColumns()
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'im')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS id,
       es.warning_count AS strikes,
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS student,
       e.title AS exam,
       es.started_at AS "sessionStarted",
       (SELECT MAX(cl.occurred_at) FROM cheating_logs cl WHERE cl.session_id = es.session_id) AS "lastViolationAt",
       es.ticket_issued_at AS "ticketIssuedAt",
       CASE
         WHEN es.ticket_issued_at IS NOT NULL THEN 'Ticketed'
         WHEN es.warning_count >= $2 THEN 'Flagged'
         WHEN es.warning_count > 0 THEN 'Warned'
         ELSE 'Clear'
       END AS status
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON ${memberJoin}
     JOIN users su ON im.uid = su.uid
     WHERE c.institution_id = $1 AND c.is_active = TRUE
       AND (es.warning_count > 0 OR EXISTS (
         SELECT 1 FROM cheating_logs cl WHERE cl.session_id = es.session_id
       ))
     ORDER BY es.warning_count DESC, "lastViolationAt" DESC NULLS LAST`,
    [institutionId, maxWarnings],
  )
  return rows.map((r) => ({
    id: r.id,
    student: r.student?.trim() || 'Unknown student',
    exam: r.exam,
    strikes: Number(r.strikes || 0),
    status: r.status,
    ticketIssued: Boolean(r.ticketIssuedAt),
    date: r.lastViolationAt || r.sessionStarted,
  }))
}

export async function getMonitoringStatsQuery(institutionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.exam_id
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = $1 AND c.is_active = TRUE
         AND es.status = 'in_progress' AND e.status = 'open') AS "activeSessions",
      (SELECT COUNT(*)::int
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.exam_id
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = $1 AND c.is_active = TRUE
         AND es.status = 'in_progress' AND e.status IN ('open', 'waiting')) AS "beingMonitored",
      (SELECT COUNT(*)::int
       FROM cheating_logs cl
       JOIN exam_sessions es ON cl.session_id = es.session_id
       JOIN exams e ON es.exam_id = e.exam_id
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = $1 AND c.is_active = TRUE
         AND cl.occurred_at > NOW() - INTERVAL '5 minutes') AS "recentAlerts"`,
    [institutionId],
  )
  return rows[0]
}

export async function listMonitoringActivityQuery(institutionId, limit = 20) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'im')
  const { rows } = await pool.query(
    `SELECT
       cl.log_id AS id,
       cl.event_type::text AS event,
       cl.occurred_at AS "occurredAt",
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS name,
       su.avatar_url AS "avatarUrl",
       e.title AS exam,
       c.class_name AS "className",
       TRIM(pu.first_name || ' ' || COALESCE(pu.middle_name || ' ', '') || pu.last_name) AS "professorName",
       es.status AS "sessionStatus",
       es.warning_count AS "warningCount",
       cl.dismissed_at AS "dismissedAt",
       ROW_NUMBER() OVER (PARTITION BY cl.session_id ORDER BY cl.occurred_at ASC) AS "warningOrdinal"
     FROM cheating_logs cl
     JOIN exam_sessions es ON cl.session_id = es.session_id
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON ${memberJoin}
     JOIN users su ON im.uid = su.uid
     LEFT JOIN institution_members pm ON c.member_id = pm.member_id
     LEFT JOIN users pu ON pm.uid = pu.uid
     WHERE c.institution_id = $1 AND c.is_active = TRUE
     ORDER BY cl.occurred_at DESC
     LIMIT $2`,
    [institutionId, limit],
  )

  return rows.map((r) => {
    let status = 'warning'
    if (['alt_tab', 'devtools_open', 'copy_attempt', 'paste_attempt'].includes(r.event)) {
      status = 'alert'
    }
    if (r.sessionStatus === 'in_progress' && r.event === 'window_blur') {
      status = 'warning'
    }
    return {
      id: r.id,
      name: r.name?.trim() || 'Unknown student',
      avatarUrl: r.avatarUrl,
      exam: r.exam,
      className: r.className,
      professorName: r.professorName?.trim() || null,
      event: formatCheatEventLabel(r.event),
      time: r.occurredAt,
      status,
      warningCount: Number(r.warningCount || 0),
      warningOrdinal: Number(r.warningOrdinal || 0),
      dismissed: Boolean(r.dismissedAt),
    }
  })
}

export async function listActiveMonitoringSessionsQuery(institutionId) {
  const pool = getPool()
  const memberJoin = await sessionMemberJoin('es', 'im')
  const { rows } = await pool.query(
    `SELECT
       es.session_id AS id,
       su.last_name AS name,
       su.avatar_url AS "avatarUrl",
       e.title AS exam,
       es.started_at AS "startedAt",
       es.warning_count AS "warningCount"
     FROM exam_sessions es
     JOIN exams e ON es.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON ${memberJoin}
     JOIN users su ON im.uid = su.uid
     WHERE c.institution_id = $1 AND c.is_active = TRUE
       AND es.status = 'in_progress' AND e.status IN ('open', 'waiting')
     ORDER BY es.started_at DESC`,
    [institutionId],
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name?.trim() || 'Unknown student',
    avatarUrl: r.avatarUrl,
    exam: r.exam,
    event: 'Active session',
    time: r.startedAt,
    status: 'active',
    warningCount: Number(r.warningCount || 0),
  }))
}

export async function listAdminReportsQuery(institutionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       rl.report_log_id AS id,
       rl.report_type::text AS "reportType",
       rl.generated_at AS "generatedAt",
       e.title AS "examTitle",
       c.class_name AS "className",
       TRIM(u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name) AS "generatedByName"
     FROM report_logs rl
     JOIN exams e ON rl.exam_id = e.exam_id
     JOIN classes c ON e.class_id = c.class_id
     JOIN institution_members im ON rl.generated_by = im.member_id
     JOIN users u ON im.uid = u.uid
     WHERE c.institution_id = $1
     ORDER BY rl.generated_at DESC
     LIMIT 100`,
    [institutionId],
  )
  return rows
}

function formatCheatEventLabel(event) {
  const map = {
    alt_tab: 'Tab switch detected',
    copy_attempt: 'Copy attempt',
    paste_attempt: 'Paste attempt',
    window_blur: 'Window blur',
    devtools_open: 'Developer tools opened',
    screenshot_attempt: 'Screenshot attempt',
    win_key: 'Windows / system key',
    other: 'Suspicious activity',
  }
  return map[event] || String(event || 'Activity')
}

export async function updateClassQuery(institutionId, classId, { name, academicYear, semester }) {
  const pool = getPool()
  const { rows } = await pool.query(
    `UPDATE classes
     SET class_name = $1, school_year = $2, semester = $3, updated_at = NOW()
     WHERE class_id = $4 AND institution_id = $5 AND is_active = TRUE
     RETURNING class_id AS id, class_name AS name, school_year AS "academicYear", semester`,
    [name, academicYear, semester, classId, institutionId],
  )
  return rows[0] || null
}

export async function deactivateClassQuery(institutionId, classId) {
  const pool = getPool()
  const { rowCount } = await pool.query(
    `UPDATE classes SET is_active = FALSE, updated_at = NOW()
     WHERE class_id = $1 AND institution_id = $2 AND is_active = TRUE`,
    [classId, institutionId],
  )
  return rowCount > 0
}

export async function listExamsForInstitutionQuery(institutionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       e.class_id AS "classId",
       e.exam_id AS id,
       e.title,
       e.password AS code,
       e.scheduled_start AS "scheduledStart",
       e.scheduled_end AS "scheduledEnd",
       e.status,
       (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.exam_id) AS "questionCount",
       (SELECT COUNT(*)::int FROM exam_sessions es WHERE es.exam_id = e.exam_id) AS "joinedCount",
       (SELECT COUNT(*)::int FROM exam_sessions es
        WHERE es.exam_id = e.exam_id AND es.status = 'submitted') AS "submittedCount"
     FROM exams e
     JOIN classes c ON e.class_id = c.class_id
     WHERE c.institution_id = $1 AND c.is_active = TRUE AND e.is_archived = FALSE
     ORDER BY e.created_at DESC`,
    [institutionId],
  )
  return rows
}
