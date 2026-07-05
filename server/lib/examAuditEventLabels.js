/** User-facing labels for exam audit log event types. */
export const EVENT_TYPE_LABELS = {
  exam_created: 'Exam created',
  exam_published: 'Exam published',
  exam_assigned: 'Exam assigned',
  exam_started: 'Exam started',
  exam_restarted: 'Exam restarted',
  exam_ended: 'Exam ended',
  scores_released: 'Scores released',
  answer_corrected: 'Answer corrected',
  exam_code_updated: 'Exam code updated',
  exam_deleted: 'Exam deleted',
  violation_dismissed: 'Violation dismissed',
}

export function labelForAuditEvent(eventType) {
  if (EVENT_TYPE_LABELS[eventType]) return EVENT_TYPE_LABELS[eventType]
  return String(eventType || 'Activity').replace(/_/g, ' ')
}

export function formatAuditSectionLabel(row) {
  const program = String(row?.programCode || '').trim()
  const code = String(row?.sectionCode || '').trim()
  if (program && code) return `${program} ${code}`
  if (program || code) return program || code
  return row?.className || '—'
}

export function formatAuditDetails(row) {
  const parts = []
  if (row?.studentName) parts.push(row.studentName)
  if (row?.questionSetTitle) parts.push(`Question set: ${row.questionSetTitle}`)
  if (row?.details) parts.push(row.details)
  return parts.join(' · ') || '—'
}
