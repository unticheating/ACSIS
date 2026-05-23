export const SCHOOL_ID_REGEX = /^\d{2}-\d{5}$/

/** @param {string} value */
export function formatSchoolIdInput(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 7)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

/**
 * @param {string} schoolId
 * @param {boolean} required
 * @param {'student' | 'faculty' | 'admin' | string} [role]
 */
export function validateSchoolIdClient(schoolId, required, role = '') {
  const id = String(schoolId || '').trim()
  if (!id) {
    if (!required) return null
    return role === 'student' ? 'Student number is required.' : 'Student / employee ID is required.'
  }
  if (!SCHOOL_ID_REGEX.test(id)) {
    return 'ID must follow format 00-00000 (example: 24-00123).'
  }
  return null
}
