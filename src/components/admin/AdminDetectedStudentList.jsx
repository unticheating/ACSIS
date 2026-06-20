import { resolveMaxWarnings } from '@/lib/examAntiCheat.js'
import '../../styles/teacher-detections-live.css'

function splitName(fullName) {
  const str = String(fullName || 'Student').trim()
  if (str.includes(',')) {
    return { firstName: str, lastName: '' }
  }
  const parts = str.split(/\s+/)
  if (parts.length < 2) return { firstName: parts[0] || 'Student', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function resolveDetectedTone(student, maxWarnings) {
  if (student.ticketIssued || student.status === 'ticketed') return 'ticketed'
  const strikes = Number(student.strikes || 0)
  const max = resolveMaxWarnings(maxWarnings)
  if (strikes >= max) return 'warn3'
  if (strikes === 2) return 'warn2'
  if (strikes === 1) return 'warn1'
  return 'ongoing'
}

function statusLabel(student, maxWarnings) {
  if (student.ticketIssued || student.status === 'ticketed') {
    return student.examTitle || 'Exam session'
  }
  const strikes = Number(student.strikes || 0)
  const max = resolveMaxWarnings(maxWarnings)
  const exam = student.examTitle ? `${student.examTitle} · ` : ''
  if (strikes >= max) return `${exam}Flagged (${strikes} warnings, max ${max})`
  if (strikes > 0) return `${exam}${strikes} warning${strikes === 1 ? '' : 's'}`
  return exam ? exam.replace(/ · $/, '') : 'Detected'
}

function seatInitials(student) {
  const f = student.firstName?.[0] || ''
  const l = student.lastName?.[0] || ''
  return (l && f ? l + f : l || f || '?').toUpperCase()
}

function normalizeStudent(raw, maxWarnings) {
  const split = splitName(raw.studentName)
  return {
    sessionId: raw.sessionId,
    firstName: raw.firstName || split.firstName,
    lastName: raw.lastName || split.lastName,
    avatarUrl: raw.avatarUrl || null,
    schoolId: raw.schoolId || '',
    examTitle: raw.examTitle || '',
    strikes: Number(raw.strikes || 0),
    status: raw.status,
    ticketIssued: Boolean(raw.ticketIssued || raw.ticketIssuedAt),
    tone: resolveDetectedTone(raw, maxWarnings),
    statusLabel: statusLabel(
      { ...raw, examTitle: raw.examTitle || '', ticketIssued: Boolean(raw.ticketIssued || raw.ticketIssuedAt) },
      maxWarnings,
    ),
  }
}

/**
 * @param {{
 *   students: object[],
 *   maxWarnings?: number,
 *   ticketingId?: number | null,
 *   onIssueTicket: (sessionId: number, alreadyTicketed: boolean) => void,
 * }} props
 */
export default function AdminDetectedStudentList({
  students,
  maxWarnings = 3,
  ticketingId = null,
  onIssueTicket,
}) {
  const items = (students || []).map((s) => normalizeStudent(s, maxWarnings))
  const max = resolveMaxWarnings(maxWarnings)

  return (
    <div className="detected-list">
      {items.map((student) => {
        return (
          <div key={student.sessionId} className="detected-item">
            <div className="detected-left">
              <div className={`strikes-badge strikes-badge--${student.tone}`}>
                <span className="strikes-count">
                  {student.strikes > 0 ? student.strikes : '—'}
                </span>
                <span className="strikes-label">strikes</span>
              </div>
              <div className="detected-info">
                <div className="detected-name">
                  {student.lastName ? (
                    <>
                      {student.lastName}{student.firstName ? `, ${student.firstName}` : ''}
                    </>
                  ) : (
                    student.firstName || 'Student'
                  )}
                  {student.examTitle && <span> in {student.examTitle}</span>}
                </div>
                <div className="detected-sub">
                  {student.schoolId ? `${student.schoolId} • ` : ''}
                  {student.statusLabel}
                </div>
              </div>
            </div>
            <div className="detected-right">
              {student.ticketIssued ? (
                <button
                  type="button"
                  className="view-receipt-btn"
                  onClick={() => onIssueTicket(student.sessionId, true)}
                >
                  View receipt
                </button>
              ) : (
                <button
                  type="button"
                  className="ticket-btn"
                  disabled={ticketingId === student.sessionId}
                  onClick={() => onIssueTicket(student.sessionId, false)}
                >
                  {ticketingId === student.sessionId ? 'Issuing…' : 'Issue ticket'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
