import { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { formatViolationDateTime } from '@/lib/adminViolationsApi.js'
import { Printer } from 'lucide-react'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'

function formatTicketDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ViolationDetailModal({
  open,
  onOpenChange,
  loading,
  error,
  detail,
  maxWarnings,
}) {
  const slipRef = useRef(null)
  const { institution } = useInstitutionTheme()
  const instName = institution?.institutionName || 'ACSIS'
  const instAcronym = institution?.acronym || ''

  function handlePrint() {
    if (!slipRef.current) return
    const printWindow = window.open('', '_blank', 'width=600,height=800')
    if (!printWindow) return

    const content = slipRef.current.innerHTML
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Violation Ticket — ${detail?.student || 'Student'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #111827;
      background: #fff;
      padding: 32px 24px;
    }
    .ticket-slip { max-width: 520px; margin: 0 auto; }
    .ticket-header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
    .ticket-header__inst { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 2px; }
    .ticket-header__title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
    .ticket-header__sub { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .ticket-fields { display: grid; grid-template-columns: 1fr 1.6fr; gap: 4px 24px; margin-bottom: 12px; }
    .ticket-field { display: flex; flex-direction: column; padding: 6px 0; border-bottom: 1px dotted #d1d5db; font-size: 13px; }
    .ticket-field__label { font-weight: 600; color: #374151; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.03em; margin-bottom: 2px; }
    .ticket-field__value { font-weight: 500; text-align: left; color: #111827; }
    .ticket-field--full { grid-column: 1 / -1; }
    .ticket-section { margin-top: 16px; }
    .ticket-section__title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .ticket-attempt { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 10px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 4px; margin-bottom: 6px; font-size: 12px; }
    .ticket-attempt__event { font-weight: 600; color: #b45309; }
    .ticket-attempt__details { color: #6b7280; font-size: 11px; }
    .ticket-attempt__time { color: #6b7280; font-size: 11px; white-space: nowrap; text-align: right; }
    .ticket-note { margin-top: 22px; padding: 14px 16px; border: 1px solid #d1d5db; border-radius: 4px; background: #fefce8; }
    .ticket-note__title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #92400e; margin-bottom: 6px; }
    .ticket-note__text { font-size: 11.5px; color: #451a03; line-height: 1.55; }
    .ticket-footer { margin-top: 24px; padding-top: 14px; border-top: 2px solid #111827; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>${content}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 350)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog-content admin-violation-modal" aria-describedby={undefined}>
        <DialogHeader className="admin-dialog-header">
          <DialogTitle className="admin-dialog-title">Violation Ticket</DialogTitle>
          <DialogDescription className="admin-dialog-desc">
            Formal record of proctoring violation for this exam session.
          </DialogDescription>
        </DialogHeader>

        <div className="admin-dialog-body">
          {loading ? (
            <p className="um-loading">Loading session…</p>
          ) : error ? (
            <p className="um-banner-error" role="alert">
              {error}
            </p>
          ) : detail ? (
            <div ref={slipRef} className="ticket-slip">
              {/* ── Student Info ── */}
              <div className="ticket-fields">
                <div className="ticket-field">
                  <span className="ticket-field__label">Student No.</span>
                  <span className="ticket-field__value">{detail.schoolId || '—'}</span>
                </div>
                <div className="ticket-field">
                  <span className="ticket-field__label">Student Name</span>
                  <span className="ticket-field__value">{detail.student}</span>
                </div>
                <div className="ticket-field">
                  <span className="ticket-field__label">Exam</span>
                  <span className="ticket-field__value">{detail.exam}</span>
                </div>
                <div className="ticket-field">
                  <span className="ticket-field__label">Class</span>
                  <span className="ticket-field__value">
                    {detail.className}
                    <div style={{ fontSize: '11px', color: 'var(--fg-muted, #6b7280)', marginTop: '2px', fontWeight: 400 }}>
                      Prof. {detail.professorName}
                    </div>
                  </span>
                </div>
                {detail.ticketIssuedAt ? (
                  <div className="ticket-field">
                    <span className="ticket-field__label">Ticket Issued</span>
                    <span className="ticket-field__value">{formatTicketDate(detail.ticketIssuedAt)}</span>
                  </div>
                ) : null}
                {detail.percentage != null ? (
                  <div className="ticket-field">
                    <span className="ticket-field__label">Final Score</span>
                    <span className="ticket-field__value">
                      {detail.percentage}% ({detail.rawScore}/{detail.totalPoints})
                    </span>
                  </div>
                ) : null}
              </div>

              {/* ── Detection Attempts ── */}
              <div className="ticket-section">
                <div className="ticket-section__title">
                  Detection Attempts ({detail.logs?.length || 0})
                </div>
                {detail.logs?.length === 0 ? (
                  <p className="ticket-attempt" style={{ justifyContent: 'center', color: '#6b7280' }}>
                    No individual cheat events logged.
                  </p>
                ) : (
                  detail.logs.map((log, i) => (
                    <div key={log.id} className="ticket-attempt">
                      <div>
                        <div className="ticket-attempt__event">
                          #{i + 1} — {log.label || log.eventType}
                        </div>
                        {log.details ? (
                          <div className="ticket-attempt__details">{log.details}</div>
                        ) : null}
                      </div>
                      <div className="ticket-attempt__time">
                        {formatViolationDateTime(log.occurredAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Formal Note ── */}
              <div className="ticket-note">
                <div className="ticket-note__title">Notice</div>
                <div className="ticket-note__text">
                  The examiner/proctor assigned to this session did not dismiss or mark any of the above
                  detection attempts as false positives within the ACSIS proctoring system. As such, all
                  recorded detection events are considered confirmed violations of examination integrity
                  policy. This ticket is issued in accordance with the institution's academic integrity
                  guidelines. The student may file a formal appeal through the designated academic
                  affairs office within the prescribed period.
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="ticket-footer">
                <span>Ref: SES-{detail.sessionId}</span>
                <span>Generated {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="admin-dialog-footer">
          {detail && !loading ? (
            <button type="button" className="btn btn--primary" onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} />
              Print Ticket
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
