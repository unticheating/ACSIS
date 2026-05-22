const EXAM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short code students type to enter the exam lobby (stored in exams.password). */
export function generateExamPassword(length = 6) {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += EXAM_CODE_CHARS[Math.floor(Math.random() * EXAM_CODE_CHARS.length)]
  }
  return code
}

export function normalizeExamPassword(value) {
  return String(value || '').trim().toUpperCase()
}
