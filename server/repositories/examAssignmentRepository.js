import { getPool } from '../db.js'
import { ensureExamAssignmentSchema } from '../lib/ensureExamAssignmentSchema.js'
import { SQL_JOIN_STUDENTS, SQL_MEMBER_SCHOOL_ID } from '../lib/memberSql.js'
import { getTeacherClassByIdQuery } from './classRepository.js'

function uniquePositiveIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite).filter((value) => value > 0))]
}

function formatStudentName(row) {
  return [row.first_name, row.middle_name, row.last_name]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getExamAssignmentAccessQuery(examId, memberId) {
  await ensureExamAssignmentSchema()
  const pool = getPool()
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM exam_assignments
     WHERE exam_id = $1`,
    [examId],
  )
  const assignedTotal = Number(countRows[0]?.total || 0)
  if (assignedTotal === 0) {
    return { hasAssignments: false, allowed: true, assignedTotal: 0 }
  }

  const { rows } = await pool.query(
    `SELECT 1
     FROM exam_assignments
     WHERE exam_id = $1 AND member_id = $2
     LIMIT 1`,
    [examId, memberId],
  )

  return {
    hasAssignments: true,
    allowed: rows.length > 0,
    assignedTotal,
  }
}

export async function listTeacherExamAssignmentRosterQuery(classId, examId, teacherMemberId) {
  const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
  if (!cls) return null

  await ensureExamAssignmentSchema()
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       im.member_id AS "memberId",
       ${SQL_MEMBER_SCHOOL_ID} AS "schoolId",
       u.first_name,
       u.middle_name,
       u.last_name,
       EXISTS(
         SELECT 1
         FROM exam_assignments ea
         WHERE ea.exam_id = $2 AND ea.member_id = im.member_id
       ) AS "assigned"
     FROM class_enrollments ce
     JOIN institution_members im ON ce.member_id = im.member_id
     ${SQL_JOIN_STUDENTS}
     JOIN users u ON im.uid = u.uid
     WHERE ce.class_id = $1
     ORDER BY u.last_name, u.first_name`,
    [classId, examId],
  )

  return {
    students: rows.map((row) => ({
      memberId: row.memberId,
      schoolId: row.schoolId || '',
      studentName: formatStudentName(row) || 'Unknown student',
      assigned: Boolean(row.assigned),
    })),
    assignedStudentIds: rows.filter((row) => Boolean(row.assigned)).map((row) => Number(row.memberId)),
  }
}

export async function replaceExamAssignmentsQuery(classId, examId, teacherMemberId, studentMemberIds) {
  const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
  if (!cls) return null

  await ensureExamAssignmentSchema()
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: enrolledRows } = await client.query(
      `SELECT ce.member_id
       FROM class_enrollments ce
       WHERE ce.class_id = $1`,
      [classId],
    )
    const allowedIds = new Set(enrolledRows.map((row) => Number(row.member_id)))
    const nextIds = uniquePositiveIds(studentMemberIds).filter((memberId) => allowedIds.has(memberId))

    await client.query(`DELETE FROM exam_assignments WHERE exam_id = $1`, [examId])
    for (const memberId of nextIds) {
      await client.query(
        `INSERT INTO exam_assignments (exam_id, member_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (exam_id, member_id)
         DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()`,
        [examId, memberId, teacherMemberId],
      )
    }

    await client.query('COMMIT')
    return {
      assignedStudentIds: nextIds,
      assignedCount: nextIds.length,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}