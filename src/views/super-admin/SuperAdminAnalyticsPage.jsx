import { useCallback, useEffect, useMemo, useState } from 'react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import { fetchSuperAdminAnalytics } from '@/lib/superAdminAnalyticsApi.js'
import '../../pages/admin-ui/style.css'
import '../../styles/super-admin-institutions.css'

function formatMonthLabel(ym) {
  if (!ym) return ym
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

export default function SuperAdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)
  const [institutions, setInstitutions] = useState([])
  const [trends, setTrends] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchSuperAdminAnalytics()
      setOverview(data.overview || null)
      setInstitutions(data.institutions || [])
      setTrends(data.trends || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const months = useMemo(() => {
    const set = new Set(trends.map((t) => t.month))
    return [...set].sort()
  }, [trends])

  const trendByInstitution = useMemo(() => {
    const map = new Map()
    for (const row of trends) {
      const key = row.institutionId
      if (!map.has(key)) {
        map.set(key, { institutionId: key, acronym: row.acronym, byMonth: {} })
      }
      map.get(key).byMonth[row.month] = row.eventCount
    }
    return [...map.values()]
  }, [trends])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">System analytics</span>
        </div>
      </div>

      <div className="content-body">
        <p className="admin-placeholder-lead super-admin-intro">
          Compare institutions platform-wide — exams, integrity alerts, and violation trends.
        </p>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        ) : (
          <>
            <SummaryStatGrid>
              <SummaryStatCard
                label="Active institutions"
                value={overview?.activeInstitutions ?? 0}
                tone="success"
              />
              <SummaryStatCard label="Institution admins" value={overview?.institutionAdmins ?? 0} />
              <SummaryStatCard label="Total students" value={overview?.totalStudents ?? 0} />
              <SummaryStatCard
                label="Violation events"
                value={overview?.totalViolationEvents ?? 0}
                tone="danger"
              />
              <SummaryStatCard label="Flagged sessions" value={overview?.flaggedSessions ?? 0} tone="danger" />
              <SummaryStatCard label="Submitted exams" value={overview?.submittedSessions ?? 0} />
            </SummaryStatGrid>

            <FadeIn className="panel" delay={0.05}>
              <div className="panel-header">
                <span className="panel-title">Institution comparison</span>
              </div>
              <div className="acsis-exam-detail__table-wrap">
                <table className="acsis-exam-detail__table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Students</th>
                      <th>Exams</th>
                      <th>Submitted</th>
                      <th>Flagged</th>
                      <th>Violations</th>
                      <th>Flagged rate</th>
                      <th>Tickets</th>
                      <th>Admins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.length === 0 ? (
                      <tr>
                        <td colSpan={9}>No institutions yet.</td>
                      </tr>
                    ) : (
                      institutions.map((row) => (
                        <tr key={row.institutionId}>
                          <td>
                            <strong>{row.acronym || '—'}</strong>
                            <div className="text-xs text-muted-foreground">{row.institutionName}</div>
                          </td>
                          <td>{row.studentCount}</td>
                          <td>{row.examCount}</td>
                          <td>{row.submittedCount}</td>
                          <td>{row.flaggedSessions}</td>
                          <td>{row.violationEvents}</td>
                          <td>{row.flaggedRate}%</td>
                          <td>{row.ticketsIssued}</td>
                          <td>{row.adminCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </FadeIn>

            {months.length > 0 ? (
              <FadeIn className="panel" delay={0.1}>
                <div className="panel-header">
                  <span className="panel-title">Violation trends (last 6 months)</span>
                </div>
                <div className="acsis-exam-detail__table-wrap">
                  <table className="acsis-exam-detail__table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        {months.map((m) => (
                          <th key={m}>{formatMonthLabel(m)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trendByInstitution.map((row) => (
                        <tr key={row.institutionId}>
                          <td>{row.acronym}</td>
                          {months.map((m) => (
                            <td key={m}>{row.byMonth[m] ?? 0}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FadeIn>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
