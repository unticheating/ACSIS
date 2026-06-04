import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Activity, AlertTriangle, Eye } from 'lucide-react'
import { fetchAdminMonitoring, formatRelativeTime } from '@/lib/adminMonitoringApi.js'
import {
  fetchAdminViolationDetail,
  fetchAdminViolations,
  formatViolationDate,
  violationStatusClass,
} from '@/lib/adminViolationsApi.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { Download } from 'lucide-react'
import { acsisToastError } from '@/lib/acsisToast.js'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import ViolationDetailModal from '@/views/admin/ViolationDetailModal.jsx'
import '../../pages/admin-ui/style.css'

const ACTIVITY_FULL_LIMIT = 50

function getOrdinal(n) {
  if (n <= 0) return ''
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

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

function ActivityFeedItems({ activities, loading, startDelay = 0.25 }) {
  if (loading) {
    return <p className="um-loading">Loading activity…</p>
  }
  if (activities.length === 0) {
    return <p className="admin-placeholder-lead">No recent exam activity.</p>
  }
  return (
    <div className="activity-feed">
      {activities.map((act, index) => (
        <FadeIn
          key={`${act.status}-${act.id}`}
          delay={startDelay + index * 0.05}
          className={`activity-item${act.dismissed ? ' activity-item--dismissed' : ''}`}
        >
          <div className="activity-left">
            <div className={`activity-avatar-ring ring-${act.status}`}>
              {act.avatarUrl ? (
                <img src={act.avatarUrl} alt="" className="activity-avatar" />
              ) : (
                <span className="activity-avatar activity-avatar--placeholder">
                  {(act.name || '?')[0]}
                </span>
              )}
            </div>
            <div className="activity-info">
              <div className="activity-name">
                {act.name}
                {act.dismissed ? <span className="activity-dismissed-badge">Dismissed</span> : null}
              </div>
              <div className="activity-sub">
                {act.event}
                {act.warningOrdinal > 0 ? ` · ${getOrdinal(act.warningOrdinal)} warning` : ''}
              </div>
              <div className="activity-meta">
                {act.exam}
                {act.className ? ` · ${act.className}` : ''}
                {act.professorName ? ` · Prof. ${act.professorName}` : ''}
              </div>
            </div>
          </div>
          <div className="activity-right">
            <span className="activity-time">{formatRelativeTime(act.time) || 'now'}</span>
          </div>
        </FadeIn>
      ))}
    </div>
  )
}

export default function AdminMonitoringPage() {
  const { acronym } = useInstitutionTheme()
  const [searchParams] = useSearchParams()
  const showAllActivity = searchParams.get('view') === 'activity'

  const [stats, setStats] = useState({ activeSessions: 0, beingMonitored: 0, recentAlerts: 0 })
  const [activities, setActivities] = useState([])
  const [hasMoreActivity, setHasMoreActivity] = useState(false)
  const [violations, setViolations] = useState([])
  const [violationsCount, setViolationsCount] = useState(0)
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
      const [monitorData, violationData] = await Promise.all([
        fetchAdminMonitoring(
          showAllActivity ? { activityLimit: ACTIVITY_FULL_LIMIT } : undefined,
        ),
        fetchAdminViolations(),
      ])
      setStats(monitorData.stats || {})
      setActivities(monitorData.activities || [])
      setHasMoreActivity(Boolean(monitorData.hasMoreActivity))
      setViolations(violationData.violations || [])
      setViolationsCount(violationData.count ?? violationData.violations?.length ?? 0)
      setMaxWarnings(violationData.maxWarnings ?? 3)
    } catch (err) {
      setActivities([])
      setViolations([])
      const msg = err instanceof Error ? err.message : 'Failed to load monitoring data.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [showAllActivity])

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

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Monitoring</span>
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

          {loading ? (
            <p className="um-loading">Loading violation records…</p>
          ) : violations.length === 0 ? (
            <p className="admin-placeholder-lead">No proctoring violations recorded yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Strikes</th>
                    <th>Student</th>
                    <th>Exam</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="admin-table__actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, index) => (
                    <FadeIn key={v.id} as="tr" delay={0.25 + index * 0.05}>
                      <td className="admin-table__strikes">{v.strikes}</td>
                      <td className="admin-table__student">{v.student}</td>
                      <td>{v.exam}</td>
                      <td>{formatViolationDate(v.date)}</td>
                      <td>
                        <span
                          className={`violation-status-badge vstatus-${violationStatusClass(v.status)}`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="admin-table__actions">
                        <button type="button" className="view-btn" onClick={() => viewViolation(v.id)}>
                          View Receipt
                        </button>
                      </td>
                    </FadeIn>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeIn>

        <FadeIn delay={0.3} className="panel" id="admin-activity-feed">
          <div className="panel-header">
            <span className="panel-title">Live activity feed across all classes</span>
            {!showAllActivity && hasMoreActivity ? (
              <Link to="/admin/monitoring?view=activity" className="panel-view-all">
                View All
              </Link>
            ) : showAllActivity ? (
              <Link to="/admin/monitoring" className="panel-view-all">
                Show less
              </Link>
            ) : (
              <button type="button" className="panel-view-all" onClick={load} disabled={loading}>
                Refresh
              </button>
            )}
          </div>
          <ActivityFeedItems activities={activities} loading={loading} startDelay={0.35} />
          {!loading && !showAllActivity && hasMoreActivity ? (
            <div className="panel-footer-link">
              <Link to="/admin/monitoring?view=activity" className="panel-view-all panel-view-all--footer">
                View All
              </Link>
            </div>
          ) : null}
        </FadeIn>
      </div>

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
