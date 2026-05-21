export const YEAR_LEVEL_OPTIONS = [
  { value: '', label: 'Select year level' },
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
]

export const SCHOOL_ID_REGEX = /^\d{2}-\d{5}$/

/** @param {string} value */
export function formatSchoolIdInput(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 7)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

/** @param {string} schoolId @param {boolean} required */
export function validateSchoolIdClient(schoolId, required) {
  const id = String(schoolId || '').trim()
  if (!id) {
    return required ? 'Student / employee ID is required.' : null
  }
  if (!SCHOOL_ID_REGEX.test(id)) {
    return 'ID must follow format 00-00000 (example: 24-00123).'
  }
  return null
}

/** @param {string} yearLevel @param {boolean} required */
export function validateYearLevelClient(yearLevel, required) {
  const v = String(yearLevel || '').trim()
  if (!v) {
    return required ? 'Year level is required for students.' : null
  }
  if (!YEAR_LEVEL_OPTIONS.some((o) => o.value && o.value === v)) {
    return 'Select a valid year level.'
  }
  return null
}
