import { ensureExamSessionTicketColumns } from './ensureTicketSchema.js'

/**
 * Platform-wide stats and per-institution violation comparison for super admins.
 */

/**
 * @param {import('pg').Pool} pool
 */
export async function getSuperAdminOverviewQuery(pool) {
  await ensureExamSessionTicketColumns()
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM institutions WHERE is_active = TRUE) AS "activeInstitutions",
       (SELECT COUNT(*)::int FROM institutions) AS "totalInstitutions",
       (SELECT COUNT(*)::int FROM institution_members im WHERE im.role = 'admin' AND im.is_active = TRUE) AS "institutionAdmins",
       (SELECT COUNT(*)::int FROM institution_members im WHERE im.role = 'student' AND im.is_active = TRUE) AS "totalStudents",
       (SELECT COUNT(*)::int FROM institution_members im WHERE im.role = 'faculty' AND im.is_active = TRUE) AS "totalFaculty",
       (SELECT COUNT(*)::int FROM exams e WHERE e.is_archived = FALSE) AS "totalExams",
       (SELECT COUNT(*)::int FROM exam_sessions es WHERE es.status = 'submitted') AS "submittedSessions",
       (SELECT COUNT(*)::int FROM cheating_logs) AS "totalViolationEvents",
       (SELECT COUNT(DISTINCT es.session_id)::int
        FROM exam_sessions es
        WHERE es.warning_count > 0) AS "flaggedSessions"`,
  )
  return rows[0] || {}
}

/**
 * @param {import('pg').Pool} pool
 */
export async function listInstitutionViolationComparisonQuery(pool) {
  await ensureExamSessionTicketColumns()
  const { rows } = await pool.query(
    `SELECT
       i.institution_id AS "institutionId",
       i.institution_name AS "institutionName",
       i.acronym,
       i.max_warnings AS "maxWarnings",
       i.is_active AS "isActive",
       COUNT(DISTINCT im.member_id) FILTER (WHERE im.role = 'student' AND im.is_active = TRUE)::int AS "studentCount",
       COUNT(DISTINCT im.member_id) FILTER (WHERE im.role = 'faculty' AND im.is_active = TRUE)::int AS "facultyCount",
       COUNT(DISTINCT im.member_id) FILTER (WHERE im.role = 'admin' AND im.is_active = TRUE)::int AS "adminCount",
       COUNT(DISTINCT e.exam_id) FILTER (WHERE e.is_archived = FALSE)::int AS "examCount",
       COUNT(DISTINCT es.session_id) FILTER (WHERE es.status = 'submitted')::int AS "submittedCount",
       COUNT(DISTINCT es.session_id) FILTER (WHERE es.warning_count > 0)::int AS "flaggedSessions",
       COALESCE(SUM(es.warning_count), 0)::int AS "totalWarnings",
       COUNT(cl.log_id)::int AS "violationEvents",
       COUNT(DISTINCT es.session_id) FILTER (WHERE es.ticket_issued_at IS NOT NULL)::int AS "ticketsIssued"
     FROM institutions i
     LEFT JOIN institution_members im ON im.institution_id = i.institution_id
     LEFT JOIN classes c ON c.institution_id = i.institution_id AND c.is_active = TRUE
     LEFT JOIN exams e ON e.class_id = c.class_id
     LEFT JOIN exam_sessions es ON es.exam_id = e.exam_id
     LEFT JOIN cheating_logs cl ON cl.session_id = es.session_id
     GROUP BY i.institution_id, i.institution_name, i.acronym, i.max_warnings, i.is_active
     ORDER BY "violationEvents" DESC, i.institution_name ASC`,
  )
  return rows.map((r) => ({
    ...r,
    violationsPerExam:
      r.examCount > 0 ? Math.round((Number(r.violationEvents) / Number(r.examCount)) * 100) / 100 : 0,
    flaggedRate:
      r.submittedCount > 0
        ? Math.round((Number(r.flaggedSessions) / Number(r.submittedCount)) * 10000) / 100
        : 0,
  }))
}

/**
 * Monthly violation trend per institution (last 6 months).
 * @param {import('pg').Pool} pool
 */
export async function listInstitutionViolationTrendsQuery(pool) {
  const { rows } = await pool.query(
    `SELECT
       i.institution_id AS "institutionId",
       i.acronym,
       to_char(date_trunc('month', cl.occurred_at), 'YYYY-MM') AS month,
       COUNT(cl.log_id)::int AS "eventCount"
     FROM cheating_logs cl
     JOIN exam_sessions es ON es.session_id = cl.session_id
     JOIN exams e ON e.exam_id = es.exam_id
     JOIN classes c ON c.class_id = e.class_id
     JOIN institutions i ON i.institution_id = c.institution_id
     WHERE cl.occurred_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
     GROUP BY i.institution_id, i.acronym, date_trunc('month', cl.occurred_at)
     ORDER BY month ASC, i.acronym ASC`,
  )
  return rows
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 */
export async function listInstitutionAdminsQuery(pool, institutionId) {
  const { rows } = await pool.query(
    `SELECT u.uid, u.first_name, u.last_name, u.email, im.member_id AS "memberId", im.is_active AS "isActive"
     FROM institution_members im
     JOIN users u ON u.uid = im.uid
     WHERE im.institution_id = $1 AND im.role = 'admin'
     ORDER BY u.last_name, u.first_name`,
    [institutionId],
  )
  return rows.map((r) => ({
    uid: r.uid,
    memberId: r.memberId,
    name: `${r.first_name} ${r.last_name}`.trim(),
    email: r.email,
    isActive: r.isActive,
  }))
}
