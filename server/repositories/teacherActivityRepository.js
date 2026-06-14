import { getPool } from '../db.js'
import { ensureTeacherActivitySchema } from '../lib/ensureTeacherActivitySchema.js'
import { EXAM_AUDIT_EVENT_TYPES } from '../lib/examAuditEvents.js'

export async function recordTeacherActivityQuery({
  teacherMemberId,
  eventType,
  classId = null,
  examId = null,
  sectionId = null,
  studentMemberId = null,
  details = null,
}) {
  if (!teacherMemberId || !eventType) return null
  await ensureTeacherActivitySchema()
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO teacher_activity_logs (
      teacher_member_id, class_id, exam_id, section_id, student_member_id, event_type, details
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING log_id AS id, occurred_at AS "occurredAt"`,
    [teacherMemberId, classId, examId, sectionId, studentMemberId, eventType, details],
  )
  return rows[0] || null
}

export async function listTeacherActivityLogsQuery(teacherMemberId, limit = 50) {
  await ensureTeacherActivitySchema()
  const pool = getPool()
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100))
  const { rows } = await pool.query(
    `SELECT
       tal.log_id AS id,
       tal.event_type AS "eventType",
       tal.details,
       tal.occurred_at AS "occurredAt",
       tal.class_id AS "classId",
       tal.exam_id AS "examId",
       tal.student_member_id AS "studentMemberId",
       c.class_name AS "className",
       e.title AS "examTitle",
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS "studentName"
     FROM teacher_activity_logs tal
     LEFT JOIN classes c ON c.class_id = tal.class_id
     LEFT JOIN exams e ON e.exam_id = tal.exam_id
     LEFT JOIN institution_members sim ON sim.member_id = tal.student_member_id
     LEFT JOIN users su ON su.uid = sim.uid
     WHERE tal.teacher_member_id = $1
     ORDER BY tal.occurred_at DESC
     LIMIT $2`,
    [teacherMemberId, safeLimit],
  )
  return rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    details: row.details,
    occurredAt: row.occurredAt,
    classId: row.classId,
    examId: row.examId,
    studentMemberId: row.studentMemberId,
    className: row.className,
    examTitle: row.examTitle,
    studentName: row.studentName || null,
  }))
}

export async function listExamAuditLogsQuery(teacherMemberId, limit = 50) {
  await ensureTeacherActivitySchema()
  const pool = getPool()
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100))
  const { rows } = await pool.query(
    `SELECT
       tal.log_id AS id,
       tal.event_type AS "eventType",
       tal.details,
       tal.occurred_at AS "occurredAt",
       tal.class_id AS "classId",
       tal.exam_id AS "examId",
       tal.section_id AS "sectionId",
       tal.student_member_id AS "studentMemberId",
       c.class_name AS "className",
       c.course_code AS "courseCode",
       tt.program_code AS "programCode",
       tt.section_code AS "sectionCode",
       e.title AS "examTitle",
       sec.title AS "questionSetTitle",
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS "studentName"
     FROM teacher_activity_logs tal
     LEFT JOIN classes c ON c.class_id = tal.class_id
     LEFT JOIN teaching_terms tt ON tt.term_id = c.term_id
     LEFT JOIN exams e ON e.exam_id = tal.exam_id
     LEFT JOIN exam_sections sec ON sec.section_id = tal.section_id
     LEFT JOIN institution_members sim ON sim.member_id = tal.student_member_id
     LEFT JOIN users su ON su.uid = sim.uid
     WHERE tal.teacher_member_id = $1
       AND tal.exam_id IS NOT NULL
       AND tal.event_type = ANY($2::text[])
     ORDER BY tal.occurred_at DESC
     LIMIT $3`,
    [teacherMemberId, EXAM_AUDIT_EVENT_TYPES, safeLimit],
  )
  return rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    details: row.details,
    occurredAt: row.occurredAt,
    classId: row.classId,
    examId: row.examId,
    sectionId: row.sectionId,
    questionSetTitle: row.questionSetTitle || null,
    programCode: row.programCode || null,
    sectionCode: row.sectionCode || null,
    courseCode: row.courseCode || null,
    studentMemberId: row.studentMemberId,
    className: row.className,
    examTitle: row.examTitle,
    studentName: row.studentName || null,
  }))
}