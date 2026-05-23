import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminViolationDetail,
  fetchAdminViolations,
  formatViolationDate,
  formatViolationDateTime,
  violationStatusClass,
} from '@/lib/adminViolationsApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import '../../pages/admin-ui/style.css'

export default function AdminViolationsPage() {
  const [violations, setViolations] = useState([])
  const [count, setCount] = useState(0)
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminViolations()
      setViolations(data.violations || [])
      setCount(data.count ?? data.violations?.length ?? 0)
      setMaxWarnings(data.maxWarnings ?? 3)
    } catch (err) {
      setViolations([])
      const msg = err instanceof Error ? err.message : 'Failed to load violations.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function viewViolation(sessionId) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    try {
      const data = await fetchAdminViolationDetail(sessionId)
      setDetail(data.detail)
      if (data.maxWarnings != null) setMaxWarnings(data.maxWarnings)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load session detail.'
      setDetailError(msg)
      acsisToastError(msg)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetail(null)
    setDetailError(null)
  }

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Violation records</span>
        </div>
      </div>

      <div className="content-body">
        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <FadeIn delay={0.1} className="panel">
          <div className="panel-header">
            <span className="panel-title">
              All violations
              <span className="violation-count">({loading ? '…' : count})</span>
            </span>
          </div>

          {loading ? (
            <p className="um-loading">Loading violation records…</p>
          ) : violations.length === 0 ? (
            <p className="admin-placeholder-lead">No proctoring violations recorded yet.</p>
          ) : (
            <div className="violation-list">
              {violations.map((v, index) => (
                <FadeIn key={v.id} delay={0.15 + (index * 0.05)} className="violation-item">
                  <div className="violation-left">
                    <div className="strikes-badge">
                      <span className="strikes-count">{v.strikes}</span>
                      <span className="strikes-label">strikes</span>
                    </div>
                    <div className="violation-info">
                      <div className="violation-name">{v.student}</div>
                      <div className="violation-sub">
                        {v.exam} · {formatViolationDate(v.date)}
                      </div>
                    </div>
                  </div>
                  <div className="violation-right">
                    <span className={`violation-status-badge vstatus-${violationStatusClass(v.status)}`}>
                      {v.status}
                    </span>
                    <button type="button" className="view-btn" onClick={() => viewViolation(v.id)}>
                      View
                    </button>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </FadeIn>
      </div>

      {detailOpen ? (
        <div
          className="admin-violation-modal-backdrop"
          role="presentation"
          onClick={closeDetail}
          onKeyDown={(e) => e.key === 'Escape' && closeDetail()}
        >
          <div
            className="admin-violation-modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="violation-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span id="violation-detail-title" className="panel-title">
                Proctoring detail
              </span>
              <button type="button" className="view-btn" onClick={closeDetail}>
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="um-loading">Loading session…</p>
            ) : detailError ? (
              <p className="um-banner-error" role="alert">
                {detailError}
              </p>
            ) : detail ? (
              <div className="admin-violation-detail">
                <dl className="admin-violation-detail__grid">
                  <div>
                    <dt>Student</dt>
                    <dd>
                      {detail.student}
                      {detail.schoolId ? (
                        <span className="admin-violation-detail__muted"> · ID {detail.schoolId}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Exam</dt>
                    <dd>
                      {detail.exam} ({detail.examStatus})
                    </dd>
                  </div>
                  <div>
                    <dt>Class</dt>
                    <dd>{detail.className}</dd>
                  </div>
                  <div>
                    <dt>Session</dt>
                    <dd>
                      {detail.sessionStatus} · {detail.strikes} / {maxWarnings} strikes
                    </dd>
                  </div>
                  <div>
                    <dt>Started</dt>
                    <dd>{formatViolationDateTime(detail.startedAt)}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatViolationDateTime(detail.submittedAt)}</dd>
                  </div>
                  {detail.percentage != null ? (
                    <div>
                      <dt>Score</dt>
                      <dd>
                        {detail.percentage}% ({detail.rawScore}/{detail.totalPoints})
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <h3 className="admin-violation-detail__logs-title">Activity log</h3>
                {detail.logs?.length === 0 ? (
                  <p className="admin-placeholder-lead">No individual cheat events logged (warnings may be from session count only).</p>
                ) : (
                  <ul className="admin-violation-log-list">
                    {detail.logs.map((log) => (
                      <li key={log.id} className="admin-violation-log-item">
                        <span className="admin-violation-log-item__event">{log.label || log.eventType}</span>
                        {log.details ? (
                          <span className="admin-violation-log-item__details">{log.details}</span>
                        ) : null}
                        <span className="admin-violation-log-item__time">{formatViolationDateTime(log.occurredAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
