import { resolveMaxWarnings } from '@/lib/examAntiCheat.js'
import '../../styles/teacher-detections-live.css'

function splitName(fullName) {
  const parts = String(fullName || 'Student').trim().split(/\s+/)
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
    <ul className="acsis-detections-list-view__cards acsis-admin-detected-list">
      {items.map((student) => (
        <li key={student.sessionId} className="acsis-admin-detected-list__row">
          <div
            className={`acsis-detections-list-card acsis-detections-list-card--${student.tone} acsis-detections-list-card--violator acsis-admin-detected-list__card`}
          >
            <div
              className={`acsis-detections-list-card__strikes acsis-detections-list-card__strikes--${student.tone === 'ticketed' ? 'warn3' : student.tone}`}
              aria-label={`${student.strikes} of ${max} warnings`}
            >
              <span className="acsis-detections-list-card__strikes-value">
                {student.strikes > 0 ? student.strikes : '—'}
              </span>
              <span className="acsis-detections-list-card__strikes-label">/{max}</span>
            </div>
            <div className="acsis-detections-list-card__body">
              <span
                className={`acsis-detections-list-card__avatar acsis-detections-list-card__avatar--${student.tone === 'ticketed' ? 'warn3' : student.tone}`}
              >
                {student.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  seatInitials(student)
                )}
              </span>
              <span className="acsis-detections-list-card__meta">
                <span className="acsis-detections-list-card__name">
                  {student.lastName ? (
                    <>
                      <span className="acsis-detections-list-card__name-last">
                        {student.lastName}
                      </span>
                      {student.firstName ? (
                        <span className="acsis-detections-list-card__name-first">
                          , {student.firstName}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    student.firstName || 'Student'
                  )}
                </span>
                <span className="acsis-detections-list-card__sub">
                  {student.schoolId ? (
                    <span className="acsis-detections-list-card__id">{student.schoolId}</span>
                  ) : null}
                  <span
                    className={`acsis-detections-list-card__status acsis-detections-list-card__status--${student.tone === 'ticketed' ? 'warn3' : student.tone}`}
                  >
                    {student.statusLabel}
                  </span>
                </span>
              </span>
            </div>
            <div className="acsis-admin-detected-list__card-action">
              {student.ticketIssued ? (
                <span className="violation-status-badge vstatus-ticketed">Ticketed</span>
              ) : (
                <button
                  type="button"
                  className="view-info-link ticket-btn"
                  disabled={ticketingId === student.sessionId}
                  onClick={() => onIssueTicket(student.sessionId, false)}
                >
                  {ticketingId === student.sessionId ? 'Issuing…' : 'Issue ticket'}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
