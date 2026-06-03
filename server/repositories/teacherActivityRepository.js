import { getPool } from '../db.js'
import { ensureTeacherActivitySchema } from '../lib/ensureTeacherActivitySchema.js'

export async function recordTeacherActivityQuery({
  teacherMemberId,
  eventType,
  classId = null,
  examId = null,
  studentMemberId = null,
  details = null,
}) {
  if (!teacherMemberId || !eventType) return null
  await ensureTeacherActivitySchema()
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO teacher_activity_logs (
      teacher_member_id, class_id, exam_id, student_member_id, event_type, details
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING log_id AS id, occurred_at AS "occurredAt"`,
    [teacherMemberId, classId, examId, studentMemberId, eventType, details],
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