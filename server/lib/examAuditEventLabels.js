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

/** PDF / print badge colors aligned with exam-audit-logs UI badges. */
export const AUDIT_EVENT_COLORS = {
  exam_created: { text: '#166534', bg: '#e8f8ed', border: '#86efac' },
  exam_published: { text: '#115e59', bg: '#e0f7f5', border: '#5eead4' },
  exam_assigned: { text: '#0e7490', bg: '#e0f7fa', border: '#67e8f9' },
  exam_started: { text: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
  exam_restarted: { text: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
  exam_ended: { text: '#4338ca', bg: '#eef2ff', border: '#a5b4fc' },
  scores_released: { text: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' },
  answer_corrected: { text: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  exam_code_updated: { text: '#334155', bg: '#f1f5f9', border: '#94a3b8' },
  exam_deleted: { text: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
  violation_dismissed: { text: '#be185d', bg: '#fdf2f8', border: '#f9a8d4' },
}

const DEFAULT_AUDIT_EVENT_COLORS = { text: '#334155', bg: '#f1f5f9', border: '#94a3b8' }

export function colorsForAuditEvent(eventType) {
  return AUDIT_EVENT_COLORS[eventType] || DEFAULT_AUDIT_EVENT_COLORS
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
