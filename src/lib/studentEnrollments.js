import { findClassByAccessCode } from './classesExams.js'

export const STUDENT_ENROLLED_KEY = 'acsis.student.enrolledClassIds'

export const STUDENT_ENROLLMENTS_EVENT = 'acsis-student-enrollments-changed'

function notify() {
  window.dispatchEvent(new Event(STUDENT_ENROLLMENTS_EVENT))
}

export function getEnrolledClassIds() {
  try {
    const raw = localStorage.getItem(STUDENT_ENROLLED_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p.map(String) : []
  } catch {
    return []
  }
}

export function setEnrolledClassIds(ids) {
  const unique = [...new Set(ids.map(String))]
  localStorage.setItem(STUDENT_ENROLLED_KEY, JSON.stringify(unique))
  notify()
}

/** @returns {{ ok: true, classId: string, className: string, already?: boolean } | { ok: false, error: string }} */
export function enrollByAccessCode(raw) {
  const cls = findClassByAccessCode(raw)
  if (!cls) return { ok: false, error: 'No class matches that access code. Check with your instructor.' }
  const id = String(cls.id)
  const ids = getEnrolledClassIds()
  if (ids.includes(id)) return { ok: true, already: true, classId: id, className: cls.name }
  setEnrolledClassIds([...ids, id])
  return { ok: true, classId: id, className: cls.name }
}

export function isEnrolled(classId) {
  return getEnrolledClassIds().includes(String(classId))
}

export function unenroll(classId) {
  setEnrolledClassIds(getEnrolledClassIds().filter((x) => x !== String(classId)))
}
