import { useCallback, useEffect, useState } from 'react'
import { fetchAdminMonitoring, formatRelativeTime } from '@/lib/adminMonitoringApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import '../../pages/admin-ui/style.css'

export default function AdminMonitoringPage() {
  const [stats, setStats] = useState({ activeSessions: 0, beingMonitored: 0, recentAlerts: 0 })
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminMonitoring()
      setStats(data.stats || {})
      setActivities(data.activities || [])
    } catch (err) {
      setActivities([])
      const msg = err instanceof Error ? err.message : 'Failed to load monitoring data.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
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
          <div className="monitor-stat-card">
            <div className="monitor-stat-icon green">
              <i className="fas fa-wave-square" aria-hidden />
            </div>
            <div className="monitor-stat-info">
              <div className="monitor-stat-label">Active sessions</div>
              <div className="monitor-stat-value">{loading ? '…' : stats.activeSessions}</div>
            </div>
          </div>
          <div className="monitor-stat-card">
            <div className="monitor-stat-icon green">
              <i className="fas fa-eye" aria-hidden />
            </div>
            <div className="monitor-stat-info">
              <div className="monitor-stat-label">Being monitored</div>
              <div className="monitor-stat-value">{loading ? '…' : stats.beingMonitored}</div>
            </div>
          </div>
          <div className="monitor-stat-card">
            <div className="monitor-stat-icon red">
              <i className="fas fa-exclamation-triangle" aria-hidden />
            </div>
            <div className="monitor-stat-info">
              <div className="monitor-stat-label">Alerts (last 5m)</div>
              <div className="monitor-stat-value">{loading ? '…' : stats.recentAlerts}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Live activity feed</span>
            <button type="button" className="panel-view-all" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="um-loading">Loading activity…</p>
          ) : activities.length === 0 ? (
            <p className="admin-placeholder-lead">No recent exam activity.</p>
          ) : (
            <div className="activity-feed">
              {activities.map((act) => (
                <div key={`${act.status}-${act.id}`} className="activity-item">
                  <div className="activity-left">
                    <span className={`activity-dot dot-${act.status}`} />
                    <div className="activity-info">
                      <div className="activity-name">{act.name}</div>
                      <div className="activity-sub">
                        {act.exam} · {act.event}
                        {act.warningCount > 0 ? ` · ${act.warningCount} warning(s)` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="activity-right">
                    <span className="activity-time">{formatRelativeTime(act.time) || 'now'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
