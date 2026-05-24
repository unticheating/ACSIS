/** PostgreSQL `exam_status` enum — see sql/acsis.sql */
export const EXAM_STATUS = {
  DRAFT: 'draft',
  WAITING: 'waiting',
  OPEN: 'open',
  CLOSED: 'closed',
}

/** Statuses visible to enrolled students (not draft). */
export const STUDENT_VISIBLE_STATUSES = [
  EXAM_STATUS.WAITING,
  EXAM_STATUS.OPEN,
  EXAM_STATUS.CLOSED,
]

/** SQL fragment for student-visible exams: `e.status IN (...)` */
export const STUDENT_VISIBLE_STATUS_SQL = `('waiting', 'open', 'closed')`

/**
 * Publish = release exam password / lobby (draft → waiting).
 * @param {string} currentStatus
 */
export function nextStatusAfterPublish(currentStatus) {
  const s = (currentStatus || '').toLowerCase()
  if (s === EXAM_STATUS.DRAFT) return EXAM_STATUS.WAITING
  return null
}

/** Faculty starts the exam — students can answer (waiting → open). */
export function nextStatusAfterStart(currentStatus) {
  const s = (currentStatus || '').toLowerCase()
  if (s === EXAM_STATUS.WAITING || s === EXAM_STATUS.CLOSED) return EXAM_STATUS.OPEN
  return null
}

/** Faculty ends the exam — no new attempts (open/waiting → closed). */
export function nextStatusAfterClose(currentStatus) {
  const s = (currentStatus || '').toLowerCase()
  if (s === EXAM_STATUS.OPEN || s === EXAM_STATUS.WAITING) return EXAM_STATUS.CLOSED
  return null
}
