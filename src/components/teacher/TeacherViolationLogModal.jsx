import { AlertTriangle, X } from 'lucide-react'
import { labelForCheatEvent, MAX_EXAM_WARNINGS } from '@/lib/examAntiCheat.js'
import '../../styles/teacher-detections-live.css'

function formatViolationLabel(v) {
  if (v.label) return v.label
  const base = labelForCheatEvent(v.eventType) || v.eventType || 'event'
  const detail = v.details ? ` — ${v.details}` : ''
  const when = v.occurredAt ? new Date(v.occurredAt).toLocaleTimeString() : ''
  return `${base}${detail}${when ? ` (${when})` : ''}`
}

function statusLabelForTone(tone) {
  const map = {
    absent: 'Enrolled — not joined yet',
    ongoing: 'Active — no warnings',
    warn1: '1 warning',
    warn2: '2 warnings',
    warn3: 'Max warnings — locked for submit',
    submitted: 'Exam submitted',
    on_hold: 'On hold — not submitted',
  }
  return map[tone] || tone
}

function resolveViolatorTone({ warningCount, status }) {
  if (status === 'submitted') return 'submitted'
  if (status === 'on_hold') return 'warn3'
  const strikes = Number(warningCount || 0)
  if (strikes >= MAX_EXAM_WARNINGS) return 'warn3'
  if (strikes === 2) return 'warn2'
  if (strikes === 1) return 'warn1'
  return 'ongoing'
}

function displayStudentName(student) {
  if (!student) return 'Student'
  if (student.lastName) {
    return `${student.lastName}, ${student.firstName || student.studentName || ''}`.trim()
  }
  return student.studentName || student.firstName || 'Student'
}

export function normalizeTeacherViolationEntry(v) {
  return {
    id: v.id,
    label: formatViolationLabel(v),
    dismissedAt: v.dismissedAt || null,
    eventType: v.eventType,
    details: v.details,
    occurredAt: v.occurredAt,
  }
}

export default function TeacherViolationLogModal({
  open,
  onClose,
  student,
  violations = [],
  maxWarnings = MAX_EXAM_WARNINGS,
  onDismissViolation,
  dismissingLogId = null,
  dismissError = '',
  loading = false,
}) {
  if (!open || !student) return null

  const tone = resolveViolatorTone(student)
  const strikes = Number(student.warningCount || 0)

  return (
    <div
      className="acsis-detections-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="acsis-detections-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-violation-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`p-4 sm:p-6 text-white flex justify-between items-start gap-3 acsis-detections-modal__header acsis-detections-modal__header--${tone}`}
        >
          <div className="min-w-0">
            <h3 id="teacher-violation-log-title" className="text-lg sm:text-2xl font-bold truncate">
              {displayStudentName(student)}
            </h3>
            {student.schoolId ? (
              <p className="opacity-90 text-sm sm:text-base">{student.schoolId}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-6 h-6" aria-hidden />
          </button>
        </div>

        <div className="acsis-detections-modal__body">
          <div className="acsis-detections-modal__summary">
            <div>
              <div className="acsis-detections-modal__label">Current status</div>
              <div className={`acsis-detections-modal__status acsis-detections-modal__status--${tone}`}>
                {statusLabelForTone(tone)}
              </div>
            </div>
            <div className="acsis-detections-modal__strikes-block">
              <div className="acsis-detections-modal__label">Warnings</div>
              <div className="acsis-detections-modal__strikes-value">
                {strikes} / {maxWarnings}
              </div>
            </div>
          </div>

          <div className="acsis-detections-modal__violations">
            <h4 className="acsis-detections-modal__violations-title">Violation log</h4>
            <p className="acsis-detections-modal__violations-hint">
              Mark a detection as false positive to remove one warning and unlock the student if they
              were locked for max warnings.
            </p>
            {dismissError ? (
              <p className="acsis-detections-modal__error" role="alert">
                {dismissError}
              </p>
            ) : null}
            {loading ? (
              <p className="acsis-detections-modal__empty">Loading violations…</p>
            ) : violations.length > 0 ? (
              <ul className="space-y-3">
                {violations.map((v) => {
                  const dismissed = Boolean(v.dismissedAt)
                  const label = typeof v === 'string' ? v : v.label || formatViolationLabel(v)
                  const logId = typeof v === 'object' && v.id != null ? v.id : null
                  return (
                    <li
                      key={logId ?? label}
                      className={`acsis-detections-violation${dismissed ? ' acsis-detections-violation--dismissed' : ''}`}
                    >
                      <div className="acsis-detections-violation__main">
                        <AlertTriangle
                          className={`w-4 h-4 mt-0.5 shrink-0 acsis-detections-modal__violation-icon acsis-detections-modal__violation-icon--${tone}`}
                          aria-hidden
                        />
                        <span className="acsis-detections-violation__text">{label}</span>
                      </div>
                      {dismissed ? (
                        <span className="acsis-detections-violation__badge">False positive</span>
                      ) : logId ? (
                        <button
                          type="button"
                          className="acsis-detections-violation__dismiss"
                          disabled={dismissingLogId === logId}
                          onClick={() => onDismissViolation?.(v)}
                        >
                          {dismissingLogId === logId ? 'Saving…' : 'Mark false positive'}
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="acsis-detections-modal__empty">No suspicious activity detected.</p>
            )}
          </div>
        </div>

        <div className="acsis-detections-modal__footer">
          <button type="button" onClick={onClose} className="acsis-detections-modal__close-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
