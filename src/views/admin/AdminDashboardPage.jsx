import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { fetchAdminDashboard, formatRelativeTime } from '@/lib/adminDashboardApi.js'
import '../../pages/admin-ui/style.css'

export default function AdminDashboardPage({ basePath = '/admin' }) {
  const [stats, setStats] = useState({ ongoingExams: 0, totalExams: 0, detectedStudents: 0 })
  const [ongoingExams, setOngoingExams] = useState([])
  const [detectedStudents, setDetectedStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminDashboard()
      setStats(data.stats || {})
      setOngoingExams(data.ongoingExams || [])
      setDetectedStudents(data.detectedStudents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function ticketViolation(sessionId) {
    if (window.confirm('Issue a ticket violation for this student session?')) {
      window.alert(`Ticket recorded for session ${sessionId} (workflow can be extended later).`)
    }
  }

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Dashboard</span>
        </div>
      </div>

      <div className="content-body">
        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <SummaryStatGrid>
          <SummaryStatCard
            label="On-Going Examinations"
            value={loading ? '…' : stats.ongoingExams}
            tone="success"
          />
          <SummaryStatCard
            label="Total Examinations"
            value={loading ? '…' : stats.totalExams}
            tone="success"
          />
          <SummaryStatCard
            label="Detected Students"
            value={loading ? '…' : stats.detectedStudents}
            tone="danger"
          />
        </SummaryStatGrid>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">On-Going Examinations</span>
            <Link to={`${basePath}/classes`} className="panel-view-all">
              View All
            </Link>
          </div>
          <div className="exam-list">
            {loading ? (
              <p className="um-loading">Loading…</p>
            ) : ongoingExams.length === 0 ? (
              <p className="admin-placeholder-lead" style={{ padding: '1rem' }}>
                No exams are open or waiting right now.
              </p>
            ) : (
              ongoingExams.map((exam) => (
                <div key={exam.id} className="exam-item">
                  <div className="exam-info">
                    <div className="exam-name">{exam.name}</div>
                    <div className="exam-by">by {exam.by}</div>
                  </div>
                  <div className="exam-timer-wrap">
                    <div className="exam-timer">{exam.status}</div>
                    <div className="exam-timer-sub">{formatRelativeTime(exam.updatedAt) || 'recently'}</div>
                  </div>
                  <div className="exam-progress">{exam.done}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Detected Students</span>
            <Link to={`${basePath}/violations`} className="panel-view-all">
              View All
            </Link>
          </div>
          <div className="detected-list">
            {loading ? (
              <p className="um-loading">Loading…</p>
            ) : detectedStudents.length === 0 ? (
              <p className="admin-placeholder-lead" style={{ padding: '1rem' }}>
                No students with proctoring warnings.
              </p>
            ) : (
              detectedStudents.map((student) => (
                <div key={student.sessionId} className="detected-item">
                  <div className="detected-info">
                    <div className="detected-name">
                      {student.strikes} — {student.studentName}
                    </div>
                    <div className="detected-sub">
                      {student.examTitle} · {student.subtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="view-info-link"
                    onClick={() => ticketViolation(student.sessionId)}
                  >
                    Issue ticket
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
