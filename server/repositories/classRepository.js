import { getPool } from '../db.js';

export async function createClassQuery(institutionId, memberId, className, schoolYear, semester, accessCode) {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO classes (institution_id, member_id, class_name, school_year, semester, access_code)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING class_id as id, class_name as name, school_year as "academicYear", semester, access_code as "accessCode"`,
    [institutionId, memberId, className, schoolYear, semester, accessCode]
  );
  return result.rows[0];
}

export async function listAdminClassesQuery(institutionId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       c.class_id as id, 
       c.class_name as name, 
       c.school_year as "academicYear", 
       c.semester, 
       c.access_code as "accessCode",
       c.member_id as "professorId",
       u.first_name || ' ' || u.last_name as "professorName"
     FROM classes c
     JOIN institution_members im ON c.member_id = im.member_id
     JOIN users u ON im.uid = u.uid
     WHERE c.institution_id = $1 AND c.is_active = TRUE
     ORDER BY c.created_at DESC`,
    [institutionId]
  );
  return result.rows;
}

export async function listTeacherClassesQuery(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       class_id as id, 
       class_name as name, 
       school_year as "academicYear", 
       semester, 
       access_code as "accessCode"
     FROM classes
     WHERE member_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [memberId]
  );
  return result.rows;
}

export async function getClassByIdQuery(classId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 
       c.class_id as id, 
       c.class_name as name, 
       c.school_year as "academicYear", 
       c.semester,
       c.access_code as "accessCode"
     FROM classes c
     WHERE c.class_id = $1
     LIMIT 1`,
    [classId]
  );
  return result.rows[0] || null;
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
