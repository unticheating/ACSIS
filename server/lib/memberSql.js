/**
 * Shared SQL fragments for institution_members + students subtype.
 * Alias for institution_members must be `im`.
 */

/** @type {string} */
export const SQL_JOIN_STUDENTS =
  `LEFT JOIN students st ON st.member_id = im.member_id AND im.role = 'student'`

/**
 * School / employee ID for display and reports:
 * students → students.student_number; faculty/admin → institution_members.school_id
 * @type {string}
 */
export const SQL_MEMBER_SCHOOL_ID =
  `CASE WHEN im.role = 'student' THEN st.student_number ELSE im.school_id END`
