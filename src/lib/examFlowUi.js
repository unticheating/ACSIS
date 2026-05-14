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
export function labelForPgExamStatus(status) {
  const s = (status || '').toLowerCase()
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
