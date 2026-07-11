import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, Download, Eye } from 'lucide-react'
import { fetchAdminMonitoring } from '@/lib/adminMonitoringApi.js'
import {
  fetchAdminViolationDetail,
  fetchAdminViolations,
  formatViolationDate,
  issueViolationTicket,
} from '@/lib/adminViolationsApi.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { resolveMaxWarnings } from '@/lib/examAntiCheat.js'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import AdminDetectedStudentList from '@/components/admin/AdminDetectedStudentList.jsx'
import AdminAuditTrailPanel from '@/components/admin/AdminAuditTrailPanel.jsx'
import ViolationDetailModal from '@/views/admin/ViolationDetailModal.jsx'
import '../../pages/admin-ui/style.css'

function exportViolationsCsv(violations) {
  const headers = ['Student', 'Exam', 'Date', 'Strikes', 'Status']
  const rows = violations.map((v) => [
    `"${v.student}"`,
    `"${v.exam}"`,
    `"${formatViolationDate(v.date)}"`,
    v.strikes,
    `"${v.status}"`,
  ])
  const csvContent =
    'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `all-violations-${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function AdminMonitoringPage() {
  const { acronym } = useInstitutionTheme()
  const { confirm, ConfirmDialog } = useAcsisConfirm()

  const [stats, setStats] = useState({ activeSessions: 0, beingMonitored: 0, recentAlerts: 0 })
  const [violations, setViolations] = useState([])
  const [violationsCount, setViolationsCount] = useState(0)
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [ticketingId, setTicketingId] = useState(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true)
      setError(null)
    }
    try {
      const [monitorData, violationData] = await Promise.all([
        fetchAdminMonitoring(),
        fetchAdminViolations(),
      ])
      if (isBackground) setError(null)
      setStats(monitorData.stats || {})
      setViolations(violationData.violations || [])
      setViolationsCount(violationData.count ?? violationData.violations?.length ?? 0)
      setMaxWarnings(violationData.maxWarnings ?? 3)
    } catch (err) {
      if (!isBackground) {
        setViolations([])
      }
      const msg = err instanceof Error ? err.message : 'Failed to load monitoring data.'
      setError(msg)
      if (!isBackground) acsisToastError(msg)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

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

  async function ticketViolation(sessionId, alreadyTicketed) {
    if (alreadyTicketed) {
      viewViolation(sessionId)
      return
    }
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
      await load(false)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to issue ticket.')
    } finally {
      setTicketingId(null)
    }
  }

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Monitoring and Audit</span>
        </div>
      </div>

      <div className="content-body">
        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="monitor-stat-cards">
          <FadeIn delay={0.05} className="monitor-stat-card">
            <div className="monitor-stat-icon green" aria-hidden>
              <Activity className="monitor-stat-icon__svg" strokeWidth={2.25} />
            </div>
            <div className="monitor-stat-info">
              <div className="monitor-stat-label">Active sessions</div>
              <div className="monitor-stat-value">{loading ? '…' : stats.activeSessions}</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.1} className="monitor-stat-card">
            <div className="monitor-stat-icon green" aria-hidden>
              <Eye className="monitor-stat-icon__svg" strokeWidth={2.25} />
            </div>
            <div className="monitor-stat-info">
              <div className="monitor-stat-label">Being monitored</div>
              <div className="monitor-stat-value">{loading ? '…' : stats.beingMonitored}</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.15} className="monitor-stat-card">
            <div className="monitor-stat-icon red" aria-hidden>
              <AlertTriangle className="monitor-stat-icon__svg" strokeWidth={2.25} />
            </div>
            <div className="monitor-stat-info">
              <div className="monitor-stat-label">Alerts (last 5m)</div>
              <div className="monitor-stat-value">{loading ? '…' : stats.recentAlerts}</div>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.2} className="panel" id="admin-all-violations">
          <div className="panel-header panel-header--split">
            <span className="panel-title">
              All violations
              <span className="violation-count">({loading ? '…' : violationsCount})</span>
            </span>
            <button
              type="button"
              className="btn btn--outline btn--compact"
              onClick={() => exportViolationsCsv(violations)}
              disabled={loading || violations.length === 0}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {(() => {
            const max = resolveMaxWarnings(maxWarnings)
            const displayViolations = violations.filter(
              (v) => v.status === 'ticketed' || (v.strikes && v.strikes >= max)
            ).sort((a, b) => {
              const aIsUnticketed = a.status !== 'ticketed';
              const bIsUnticketed = b.status !== 'ticketed';
              if (aIsUnticketed && !bIsUnticketed) return -1;
              if (!aIsUnticketed && bIsUnticketed) return 1;
              return 0;
            })

            return loading ? (
              <p className="um-loading">Loading violation records…</p>
            ) : displayViolations.length === 0 ? (
              <p className="admin-placeholder-lead">No maxed proctoring violations recorded yet.</p>
            ) : (
              <div className="admin-table-container admin-table-container--list-override">
                <AdminDetectedStudentList
                  students={displayViolations.map((v) => ({
                    sessionId: v.id,
                    studentName: v.student,
                    examTitle: v.exam,
                    strikes: v.strikes,
                    status: v.status,
                    ticketIssued: String(v.status || '').toLowerCase() === 'ticketed',
                  }))}
                  maxWarnings={maxWarnings}
                  ticketingId={ticketingId}
                  onIssueTicket={ticketViolation}
                />
              </div>
            )
          })()}
        </FadeIn>

        <AdminAuditTrailPanel />
      </div>

      {ConfirmDialog}
      <ViolationDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        loading={detailLoading}
        error={detailError}
        detail={detail}
        maxWarnings={maxWarnings}
      />
    </div>
  )
}
