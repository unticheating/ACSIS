import { getPool } from '../db.js';
import { SQL_JOIN_STUDENTS, SQL_MEMBER_SCHOOL_ID } from '../lib/memberSql.js';

export async function createClassQuery(
  institutionId,
  memberId,
  courseCode,
  className,
  schoolYear,
  semester,
  accessCode,
  termId = null,
) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO classes (institution_id, member_id, course_code, class_name, school_year, semester, access_code, term_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING class_id as id, course_code as "courseCode", class_name as name, school_year as "academicYear", semester, access_code as "accessCode", term_id as "termId", header_pattern as "headerPattern", header_color as "headerColor"`,
    [institutionId, memberId, courseCode, className, schoolYear, semester, accessCode, termId],
  );
  return result.rows[0];
}

export async function listAdminClassesQuery(institutionId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       c.class_id as id, 
       c.course_code as "courseCode",
       c.class_name as name, 
       c.school_year as "academicYear", 
       c.semester, 
       c.access_code as "accessCode",
       c.member_id as "professorId",
       u.first_name || ' ' || u.last_name as "professorName",
       COALESCE(ex.exams, '[]'::json) AS exams
     FROM classes c
     JOIN institution_members im ON c.member_id = im.member_id
     JOIN users u ON im.uid = u.uid
     LEFT JOIN LATERAL (
       SELECT json_agg(
         json_build_object(
           'id', e.exam_id,
           'title', e.title,
           'code', e.password,
           'scheduledStart', e.scheduled_start,
           'scheduledEnd', e.scheduled_end,
           'status', e.status,
           'questionCount', (
             SELECT COUNT(*)::int FROM questions q WHERE q.exam_id = e.exam_id
           )
         )
         ORDER BY e.created_at DESC
       ) AS exams
       FROM exams e
       WHERE e.class_id = c.class_id
     ) ex ON TRUE
     WHERE c.institution_id = $1 AND c.is_active = TRUE
     ORDER BY c.created_at DESC`,
    [institutionId]
  );
  return result.rows.map((row) => ({
    ...row,
    exams: Array.isArray(row.exams) ? row.exams : [],
  }));
}

export async function listTeacherClassesQuery(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       c.class_id as id,
       c.course_code as "courseCode",
       c.class_name as name, 
       c.school_year as "academicYear", 
       c.semester, 
       c.access_code as "accessCode",
       c.header_pattern as "headerPattern",
       c.header_color as "headerColor",
       c.term_id as "termId",
       t.section_code as "sectionCode",
       (SELECT COUNT(*)::int FROM exams e
        WHERE e.class_id = c.class_id AND e.is_archived = FALSE) as "examCount",
       (SELECT COUNT(*)::int FROM class_enrollments ce
        WHERE ce.class_id = c.class_id) as "enrollmentCount"
     FROM classes c
     LEFT JOIN teaching_terms t ON t.term_id = c.term_id
     WHERE c.member_id = $1 AND c.is_active = TRUE
     ORDER BY c.created_at DESC`,
    [memberId]
  );
  return result.rows.map((row) => ({
    ...row,
    exams: Array.from({ length: Number(row.examCount || 0) }),
  }));
}

export async function getClassByIdQuery(classId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       c.class_id as id, 
       c.course_code as "courseCode",
       c.class_name as name, 
       c.school_year as "academicYear", 
       c.semester,
       c.access_code as "accessCode",
       c.header_pattern as "headerPattern",
       c.header_color as "headerColor",
       c.term_id as "termId",
       t.program_code as "programCode",
       t.section_code as "sectionCode",
       (SELECT COUNT(*)::int FROM class_enrollments ce
        WHERE ce.class_id = c.class_id) as "enrollmentCount"
     FROM classes c
     LEFT JOIN teaching_terms t ON t.term_id = c.term_id
     WHERE c.class_id = $1
     LIMIT 1`,
    [classId]
  );
  return result.rows[0] || null;
}

export async function getTeacherClassByIdQuery(classId, memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       c.class_id as id, 
       c.course_code as "courseCode",
       c.class_name as name, 
       c.school_year as "academicYear", 
       c.semester,
       c.access_code as "accessCode",
       c.header_pattern as "headerPattern",
       c.header_color as "headerColor",
       c.term_id as "termId",
       t.program_code as "programCode",
       t.section_code as "sectionCode",
       (SELECT COUNT(*)::int FROM class_enrollments ce
        WHERE ce.class_id = c.class_id) as "enrollmentCount"
     FROM classes c
     LEFT JOIN teaching_terms t ON t.term_id = c.term_id
     WHERE c.class_id = $1 AND c.member_id = $2 AND c.is_active = TRUE
     LIMIT 1`,
    [classId, memberId],
  );
  return result.rows[0] || null;
}

export async function listClassEnrolledStudentsQuery(classId, memberId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       im.member_id AS "memberId",
       ${SQL_MEMBER_SCHOOL_ID} AS "schoolId",
       u.first_name,
       u.middle_name,
       u.last_name,
       ce.enrolled_at AS "enrolledAt"
     FROM class_enrollments ce
     JOIN classes c ON c.class_id = ce.class_id
     JOIN institution_members im ON ce.member_id = im.member_id
     ${SQL_JOIN_STUDENTS}
     JOIN users u ON im.uid = u.uid
     WHERE ce.class_id = $1 AND c.member_id = $2 AND c.is_active = TRUE
     ORDER BY u.last_name, u.first_name`,
    [classId, memberId],
  );
  return rows.map((r) => {
    const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean);
    return {
      memberId: r.memberId,
      schoolId: r.schoolId || '',
      studentName: parts.join(' ').trim() || 'Unknown student',
      enrolledAt: r.enrolledAt,
    };
  });
}

export async function updateTeacherClassQuery(classId, memberId, { courseCode, name, headerPattern, headerColor }) {
  const pool = getPool();
  const colorParam = headerColor === undefined ? '__KEEP__' : headerColor;
  const { rows } = await pool.query(
    `UPDATE classes
     SET course_code = COALESCE($3, course_code),
         class_name = COALESCE($4, class_name),
         header_pattern = COALESCE($5, header_pattern),
         header_color = CASE WHEN $6::text = '__KEEP__' THEN header_color ELSE $6::text END,
         updated_at = NOW()
     WHERE class_id = $1 AND member_id = $2 AND is_active = TRUE
     RETURNING class_id AS id, course_code AS "courseCode", class_name AS name,
               school_year AS "academicYear", semester, access_code AS "accessCode", term_id AS "termId",
               header_pattern AS "headerPattern", header_color AS "headerColor"`,
    [classId, memberId, courseCode ?? null, name ?? null, headerPattern ?? null, colorParam],
  );
  return rows[0] || null;
}

export async function deactivateTeacherClassQuery(classId, memberId) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `UPDATE classes SET is_active = FALSE, updated_at = NOW()
     WHERE class_id = $1 AND member_id = $2 AND is_active = TRUE`,
    [classId, memberId],
  );
  return rowCount > 0;
}

export async function getTeacherDashboardStatsQuery(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM classes WHERE member_id = $1 AND is_active = TRUE) as "totalClasses",
      (SELECT COUNT(*) 
       FROM exams e 
       JOIN classes c ON e.class_id = c.class_id 
       WHERE c.member_id = $1 AND c.is_active = TRUE AND e.status IN ('open', 'waiting')) as "activeExams",
      (SELECT COUNT(DISTINCT ce.member_id)
       FROM class_enrollments ce
       JOIN classes c ON ce.class_id = c.class_id
       WHERE c.member_id = $1 AND c.is_active = TRUE) as "totalStudents"`,
    [memberId]
  );
  return result.rows[0];
}
