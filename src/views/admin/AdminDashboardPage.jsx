import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminDetectedStudentList from '@/components/admin/AdminDetectedStudentList.jsx'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { fetchAdminDashboard, formatRelativeTime } from '@/lib/adminDashboardApi.js'
import { issueViolationTicket } from '@/lib/adminViolationsApi.js'
import { resolveMaxWarnings } from '@/lib/examAntiCheat.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import '../../pages/admin-ui/style.css'

export default function AdminDashboardPage({ basePath = '/admin' }) {
  const { acronym } = useInstitutionTheme()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  const [stats, setStats] = useState({ ongoingExams: 0, totalExams: 0, detectedStudents: 0 })
  const [ongoingExams, setOngoingExams] = useState([])
  const [pendingFaculty, setPendingFaculty] = useState([])
  const [detectedStudents, setDetectedStudents] = useState([])
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [hasMoreOngoing, setHasMoreOngoing] = useState(false)
  const [hasMorePendingFaculty, setHasMorePendingFaculty] = useState(false)
  const [hasMoreDetected, setHasMoreDetected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ticketingId, setTicketingId] = useState(null)

  const previewLimit = 5

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminDashboard()
      setStats(data.stats || {})
      setMaxWarnings(data.maxWarnings ?? 3)
      setOngoingExams((data.ongoingExams || []).slice(0, previewLimit))
      setPendingFaculty((data.pendingFaculty || []).slice(0, previewLimit))
      setDetectedStudents((data.detectedStudents || []).slice(0, previewLimit))
      setHasMoreOngoing(Boolean(data.hasMoreOngoingExams))
      setHasMorePendingFaculty(Boolean(data.hasMorePendingFaculty))
      setHasMoreDetected(Boolean(data.hasMoreDetectedStudents))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function ticketViolation(sessionId, alreadyTicketed) {
    if (alreadyTicketed) return
    const ok = await confirm({
      title: 'Issue violation ticket?',
      description: 'This will create an official violation ticket for this student session.',
      confirmLabel: 'Issue ticket',
    })
    if (!ok) return

    setTicketingId(sessionId)
    try {
      await issueViolationTicket(sessionId)
      acsisToastSuccess('Violation ticket issued.')
      await load()
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to issue ticket.')
    } finally {
      setTicketingId(null)
    }
  }

  const max = resolveMaxWarnings(maxWarnings)
  const displayDetectedStudents = detectedStudents.filter(
    (s) => s.ticketIssued || s.status === 'ticketed' || (s.strikes && s.strikes >= max)
  )

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
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
            label="Pending Approvals"
            value={loading ? '…' : (stats.pendingFaculty || 0)}
            tone="warning"
            delay={0.1}
          />
          <SummaryStatCard
            label="Total Examinations"
            value={loading ? '…' : stats.totalExams}
            tone="success"
            delay={0.2}
          />
          <SummaryStatCard
            label="Detected Students"
            value={loading ? '…' : stats.detectedStudents}
            tone="danger"
            delay={0.3}
          />
        </SummaryStatGrid>

        <FadeIn className="panel" delay={0.4}>
          <div className="panel-header">
            <span className="panel-title">Pending Faculty Approvals</span>
            <Link to={`${basePath}/faculty-approval`} className="panel-view-all">
              {hasMorePendingFaculty && stats.pendingFaculty > pendingFaculty.length
                ? `View All (${stats.pendingFaculty})`
                : 'View All'}
            </Link>
          </div>
          <div className="faculty-approval-list">
            {loading ? (
              <p className="um-loading">Loading…</p>
            ) : pendingFaculty.length === 0 ? (
              <p className="admin-placeholder-lead" style={{ padding: '1rem' }}>
                No faculty members are pending approval right now.
              </p>
            ) : (
              pendingFaculty.map((faculty) => (
                <div key={faculty.id} className="faculty-approval-item" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div className="faculty-info">
                    <div className="exam-name" title={faculty.name}>
                      {faculty.name}
                    </div>
                    <div className="exam-by" title={faculty.email}>
                      {faculty.email}
                    </div>
                  </div>
                  <div className="faculty-action">
                     <span className="exam-timer">{formatRelativeTime(faculty.createdAt) || 'recent'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </FadeIn>

        <FadeIn className="panel" delay={0.5}>
          <div className="panel-header">
            <span className="panel-title">Detected Students</span>
            <Link to={`${basePath}/monitoring#admin-all-violations`} className="panel-view-all">
              {hasMoreDetected && stats.detectedStudents > displayDetectedStudents.length
                ? `View All (${stats.detectedStudents})`
                : 'View All'}
            </Link>
          </div>
          {loading ? (
            <p className="um-loading">Loading…</p>
          ) : displayDetectedStudents.length === 0 ? (
            <p className="admin-placeholder-lead" style={{ padding: '1rem' }}>
              No students with proctoring warnings.
            </p>
          ) : (
            <AdminDetectedStudentList
              students={displayDetectedStudents}
              maxWarnings={maxWarnings}
              ticketingId={ticketingId}
              onIssueTicket={ticketViolation}
            />
          )}
        </FadeIn>
      </div>
      {ConfirmDialog}
    </div>
  )
}
