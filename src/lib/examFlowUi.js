/**
 * PostgreSQL-aligned exam lifecycle labels (see `sql/acsis.sql`, enum `exam_status`).
 * Wire these when the UI reads from the API. Local mock data may still use legacy strings.
 */
export const PG_EXAM_STATUS = {
  DRAFT: 'draft',
  WAITING: 'waiting',
  OPEN: 'open',
  CLOSED: 'closed',
}

/** @param {string | null | undefined} status */
export function normalizeExamStatus(status) {
  return (status || '').toLowerCase()
}

/** Draft only — not yet published to students. */
export function isExamDraft(status) {
  return normalizeExamStatus(status) === PG_EXAM_STATUS.DRAFT
}

/** Published (waiting lobby, live, or closed). */
export function isExamPublished(status) {
  const s = normalizeExamStatus(status)
  return s === PG_EXAM_STATUS.WAITING || s === PG_EXAM_STATUS.OPEN || s === PG_EXAM_STATUS.CLOSED
}

/** Faculty "on-going" tab: lobby or live. */
export function isExamOngoing(status) {
  const s = normalizeExamStatus(status)
  return s === PG_EXAM_STATUS.WAITING || s === PG_EXAM_STATUS.OPEN
}

/** Student can open lobby / session UI (exam must be live/lobby and not yet submitted). */
export function isExamEnterableByStudent(status, sessionStatus) {
  if ((sessionStatus || '').toLowerCase() === 'submitted') return false
  const s = normalizeExamStatus(status)
  return s === PG_EXAM_STATUS.WAITING || s === PG_EXAM_STATUS.OPEN
}

/** Badge label on student class stream — prefers personal session state. */
export function labelForStudentExam(exam) {
  if ((exam?.sessionStatus || '').toLowerCase() === 'submitted') {
    return exam.percentage != null ? `Submitted · ${exam.percentage}%` : 'Submitted'
  }
  if ((exam?.sessionStatus || '').toLowerCase() === 'in_progress') {
    const examSt = normalizeExamStatus(exam?.status)
    if (examSt === PG_EXAM_STATUS.OPEN) return 'In progress'
    if (examSt === PG_EXAM_STATUS.WAITING) return 'Joined · waiting'
  }
  return labelForPgExamStatus(exam?.status)
}

/** @param {string | null | undefined} status */
export function labelForPgExamStatus(status) {
  const s = normalizeExamStatus(status)
  const map = {
    draft: 'Draft',
    waiting: 'Lobby',
    open: 'Live',
    closed: 'Closed',
  }
  return map[s] ?? (status ? String(status) : 'Draft')
}

/** Class enroll vs exam lobby (schema: classes.access_code vs exams.password) */
export const COPY = {
  classAccessCode: 'Students join the class with this access code.',
  examPassword: 'Students enter this password to open the exam lobby.',
}
