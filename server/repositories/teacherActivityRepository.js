import { getPool } from '../db.js'
import { ensureTeacherActivitySchema } from '../lib/ensureTeacherActivitySchema.js'
import { EXAM_AUDIT_EVENT_TYPES } from '../lib/examAuditEvents.js'
import { formatAuditSectionLabel, labelForAuditEvent } from '../lib/examAuditEventLabels.js'

function mapExamAuditRow(row) {
  return {
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
  }
}

const EXAM_AUDIT_SELECT = `SELECT
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
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS "studentName"`

const EXAM_AUDIT_FROM = `FROM teacher_activity_logs tal
     LEFT JOIN classes c ON c.class_id = tal.class_id
     LEFT JOIN teaching_terms tt ON tt.term_id = c.term_id
     LEFT JOIN exams e ON e.exam_id = tal.exam_id
     LEFT JOIN exam_sections sec ON sec.section_id = tal.section_id
     LEFT JOIN institution_members sim ON sim.member_id = tal.student_member_id
     LEFT JOIN users su ON su.uid = sim.uid`

function buildExamAuditFilters({
  eventType = '',
  examId = '',
  sectionKey = '',
  search = '',
  dateFrom = '',
  dateTo = '',
}) {
  const params = []
  const clauses = [
    'tal.teacher_member_id = $1',
    'tal.exam_id IS NOT NULL',
    'tal.event_type = ANY($2::text[])',
  ]

  if (eventType) {
    params.push(eventType)
    clauses.push(`tal.event_type = $${params.length + 2}`)
  }

  if (examId) {
    params.push(Number(examId))
    clauses.push(`tal.exam_id = $${params.length + 2}`)
  }

  if (sectionKey) {
    if (String(sectionKey).startsWith('class:')) {
      params.push(Number(String(sectionKey).slice(6)))
      clauses.push(`tal.class_id = $${params.length + 2}`)
    } else {
      params.push(String(sectionKey))
      const idx = params.length + 2
      clauses.push(`(
        TRIM(
          COALESCE(tt.program_code, '') ||
          CASE
            WHEN COALESCE(tt.program_code, '') <> '' AND COALESCE(tt.section_code, '') <> '' THEN ' '
            ELSE ''
          END ||
          COALESCE(tt.section_code, '')
        ) = $${idx}
        OR c.class_name = $${idx}
      )`)
    }
  }

  if (dateFrom) {
    params.push(dateFrom)
    clauses.push(`tal.occurred_at >= $${params.length + 2}::date`)
  }

  if (dateTo) {
    params.push(dateTo)
    clauses.push(`tal.occurred_at < ($${params.length + 2}::date + interval '1 day')`)
  }

  const trimmedSearch = String(search || '').trim()
  if (trimmedSearch) {
    params.push(`%${trimmedSearch.toLowerCase()}%`)
    const idx = params.length + 2
    clauses.push(`LOWER(CONCAT_WS(' ',
      tal.event_type,
      COALESCE(tal.details, ''),
      COALESCE(c.class_name, ''),
      COALESCE(e.title, ''),
      COALESCE(sec.title, ''),
      COALESCE(tt.program_code, ''),
      COALESCE(tt.section_code, ''),
      COALESCE(TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name), '')
    )) LIKE $${idx}`)
  }

  return { clauses, params, trimmedSearch }
}

export async function listExamAuditLogsFilteredQuery(
  teacherMemberId,
  {
    limit = 100,
    eventType = '',
    examId = '',
    sectionKey = '',
    search = '',
    dateFrom = '',
    dateTo = '',
  } = {},
) {
  await ensureTeacherActivitySchema()
  const pool = getPool()
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500))
  const { clauses, params } = buildExamAuditFilters({
    eventType,
    examId,
    sectionKey,
    search,
    dateFrom,
    dateTo,
  })

  const limitIdx = params.length + 3
  const sql = `${EXAM_AUDIT_SELECT}
     ${EXAM_AUDIT_FROM}
     WHERE ${clauses.join(' AND ')}
     ORDER BY tal.occurred_at DESC
     LIMIT $${limitIdx}`

  const { rows } = await pool.query(sql, [teacherMemberId, EXAM_AUDIT_EVENT_TYPES, ...params, safeLimit])
  let mapped = rows.map(mapExamAuditRow)

  if (String(search || '').trim()) {
    const q = String(search).trim().toLowerCase()
    mapped = mapped.filter((row) => {
      const haystack = [
        labelForAuditEvent(row.eventType),
        row.details,
        row.className,
        row.examTitle,
        row.questionSetTitle,
        formatAuditSectionLabel(row),
        row.studentName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }

  return mapped
}

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
  return listExamAuditLogsFilteredQuery(teacherMemberId, { limit })
}

const INSTITUTION_AUDIT_SELECT = `SELECT
       tal.log_id AS id,
       tal.event_type AS "eventType",
       tal.details,
       tal.occurred_at AS "occurredAt",
       tal.class_id AS "classId",
       tal.exam_id AS "examId",
       tal.section_id AS "sectionId",
       tal.teacher_member_id AS "teacherMemberId",
       tal.student_member_id AS "studentMemberId",
       c.class_name AS "className",
       c.course_code AS "courseCode",
       tt.program_code AS "programCode",
       tt.section_code AS "sectionCode",
       e.title AS "examTitle",
       sec.title AS "questionSetTitle",
       TRIM(tu.first_name || ' ' || COALESCE(tu.middle_name || ' ', '') || tu.last_name) AS "teacherName",
       tim.role AS "actorRole",
       TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name) AS "studentName"`

const INSTITUTION_AUDIT_FROM = `FROM teacher_activity_logs tal
     JOIN institution_members tim ON tim.member_id = tal.teacher_member_id
     LEFT JOIN users tu ON tu.uid = tim.uid
     LEFT JOIN classes c ON c.class_id = tal.class_id
     LEFT JOIN teaching_terms tt ON tt.term_id = c.term_id
     LEFT JOIN exams e ON e.exam_id = tal.exam_id
     LEFT JOIN exam_sections sec ON sec.section_id = tal.section_id
     LEFT JOIN institution_members sim ON sim.member_id = tal.student_member_id
     LEFT JOIN users su ON su.uid = sim.uid`

function buildInstitutionAuditFilters({
  eventType = '',
  examId = '',
  sectionKey = '',
  teacherMemberId = '',
  search = '',
  dateFrom = '',
  dateTo = '',
}) {
  const params = []
  const clauses = ['tim.institution_id = $1']

  if (eventType) {
    params.push(eventType)
    clauses.push(`tal.event_type = $${params.length + 1}`)
  }

  if (examId) {
    params.push(Number(examId))
    clauses.push(`tal.exam_id = $${params.length + 1}`)
  }

  if (teacherMemberId) {
    params.push(Number(teacherMemberId))
    clauses.push(`tal.teacher_member_id = $${params.length + 1}`)
  }

  if (sectionKey) {
    if (String(sectionKey).startsWith('class:')) {
      params.push(Number(String(sectionKey).slice(6)))
      clauses.push(`tal.class_id = $${params.length + 1}`)
    } else {
      params.push(String(sectionKey))
      const idx = params.length + 1
      clauses.push(`(
        TRIM(
          COALESCE(tt.program_code, '') ||
          CASE
            WHEN COALESCE(tt.program_code, '') <> '' AND COALESCE(tt.section_code, '') <> '' THEN ' '
            ELSE ''
          END ||
          COALESCE(tt.section_code, '')
        ) = $${idx}
        OR c.class_name = $${idx}
      )`)
    }
  }

  if (dateFrom) {
    params.push(dateFrom)
    clauses.push(`tal.occurred_at >= $${params.length + 1}::date`)
  }

  if (dateTo) {
    params.push(dateTo)
    clauses.push(`tal.occurred_at < ($${params.length + 1}::date + interval '1 day')`)
  }

  const trimmedSearch = String(search || '').trim()
  if (trimmedSearch) {
    params.push(`%${trimmedSearch.toLowerCase()}%`)
    const idx = params.length + 1
    clauses.push(`LOWER(CONCAT_WS(' ',
      tal.event_type,
      COALESCE(tal.details, ''),
      COALESCE(c.class_name, ''),
      COALESCE(e.title, ''),
      COALESCE(sec.title, ''),
      COALESCE(tt.program_code, ''),
      COALESCE(tt.section_code, ''),
      COALESCE(TRIM(tu.first_name || ' ' || COALESCE(tu.middle_name || ' ', '') || tu.last_name), ''),
      COALESCE(TRIM(su.first_name || ' ' || COALESCE(su.middle_name || ' ', '') || su.last_name), '')
    )) LIKE $${idx}`)
  }

  return { clauses, params, trimmedSearch }
}

export async function listInstitutionAuditLogsFilteredQuery(
  institutionId,
  {
    limit = 100,
    eventType = '',
    examId = '',
    sectionKey = '',
    teacherMemberId = '',
    search = '',
    dateFrom = '',
    dateTo = '',
  } = {},
) {
  await ensureTeacherActivitySchema()
  const pool = getPool()
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500))
  const { clauses, params } = buildInstitutionAuditFilters({
    eventType,
    examId,
    sectionKey,
    teacherMemberId,
    search,
    dateFrom,
    dateTo,
  })

  const limitIdx = params.length + 2
  const sql = `${INSTITUTION_AUDIT_SELECT}
     ${INSTITUTION_AUDIT_FROM}
     WHERE ${clauses.join(' AND ')}
     ORDER BY tal.occurred_at DESC
     LIMIT $${limitIdx}`

  const { rows } = await pool.query(sql, [institutionId, ...params, safeLimit])
  let mapped = rows.map((row) => ({
    ...mapExamAuditRow(row),
    teacherMemberId: row.teacherMemberId,
    teacherName: row.teacherName?.trim() || null,
    actorRole: row.actorRole || null,
  }))

  if (String(search || '').trim()) {
    const q = String(search).trim().toLowerCase()
    mapped = mapped.filter((row) => {
      const haystack = [
        labelForAuditEvent(row.eventType),
        row.details,
        row.className,
        row.examTitle,
        row.questionSetTitle,
        formatAuditSectionLabel(row),
        row.studentName,
        row.teacherName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }

  return mapped
}