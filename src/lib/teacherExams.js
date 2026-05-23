export const EXAMS_STORAGE_KEY = 'teacherExams'

export function getStoredExams() {
  const raw = localStorage.getItem(EXAMS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredExams(exams) {
  localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams))
}

export function generateExamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
