import { getPool } from '../db.js';

export async function findClassByAccessCode(code) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT class_id, class_name, institution_id, member_id, school_year, semester, access_code
     FROM classes WHERE UPPER(access_code) = UPPER($1) AND is_active = TRUE`,
    [code]
  );
  return result.rows[0] || null;
}

export async function getStudentMember(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT member_id, institution_id, role
     FROM institution_members
     WHERE member_id = $1 AND is_active = TRUE AND is_pending = FALSE`,
    [memberId],
  );
  return result.rows[0] || null;
}

export async function checkEnrollment(memberId, classId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT enrollment_id FROM class_enrollments WHERE member_id = $1 AND class_id = $2',
    [memberId, classId]
  );
  return result.rows.length > 0;
}

export async function enrollStudent(memberId, classId) {
  const pool = getPool();
  const result = await pool.query(
    'INSERT INTO class_enrollments (class_id, member_id) VALUES ($1, $2) RETURNING enrollment_id',
    [classId, memberId]
  );
  return result.rows[0];
}

export async function getEnrolledClasses(memberId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT c.class_id as id, c.class_name as name, c.school_year as "academicYear", c.semester
     FROM classes c
     JOIN class_enrollments ce ON ce.class_id = c.class_id
     WHERE ce.member_id = $1 AND c.is_active = TRUE
     ORDER BY ce.enrolled_at DESC`,
    [memberId]
  );
  return result.rows;
}
