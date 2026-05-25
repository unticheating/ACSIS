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

/** Lobby join window has opened (scheduled start is null or already passed). */
export function isLobbyOpenForJoin(scheduledStart) {
  if (!scheduledStart) return true
  const opensAt = new Date(scheduledStart).getTime()
  return Number.isFinite(opensAt) && Date.now() >= opensAt
}

/** Lobby is posted but scheduled start is still in the future. */
export function isExamLobbyScheduledFuture(status, scheduledStart) {
  if (normalizeExamStatus(status) !== PG_EXAM_STATUS.WAITING) return false
  if (!scheduledStart) return false
  return !isLobbyOpenForJoin(scheduledStart)
}

/** Student may enter the lobby with an exam code (lobby only, after scheduled start). */
export function canStudentJoinExamLobby(status, sessionStatus, scheduledStart) {
  if ((sessionStatus || '').toLowerCase() === 'submitted') return false
  if (normalizeExamStatus(status) !== PG_EXAM_STATUS.WAITING) return false
  return isLobbyOpenForJoin(scheduledStart)
}

/**
 * Student may enter the exam code (lobby while waiting, or join while live if not yet in session).
 */
export function canStudentEnterExamCode(status, sessionStatus, scheduledStart) {
  if ((sessionStatus || '').toLowerCase() === 'submitted') return false
  const sess = (sessionStatus || '').toLowerCase()
  if (sess === 'in_progress') return false
  const s = normalizeExamStatus(status)
  if (s === PG_EXAM_STATUS.WAITING) return isLobbyOpenForJoin(scheduledStart)
  if (s === PG_EXAM_STATUS.OPEN) return true
  return false
}

/**
 * Student can open the exam session UI: lobby join while waiting (after start time), or continue if already in session when live.
 */
export function isExamEnterableByStudent(status, sessionStatus, scheduledStart) {
  if ((sessionStatus || '').toLowerCase() === 'submitted') return false
  const s = normalizeExamStatus(status)
  const sess = (sessionStatus || '').toLowerCase()
  if (s === PG_EXAM_STATUS.WAITING) {
    if (sess === 'in_progress') return true
    return isLobbyOpenForJoin(scheduledStart)
  }
  if (s === PG_EXAM_STATUS.OPEN && sess === 'in_progress') return true
  return false
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
