import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Building2, ChevronRight, Settings, UsersRound } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SummaryStatCard } from '@/components/dashboard/SummaryStatCard.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import { fetchSuperAdminAnalytics } from '@/lib/superAdminAnalyticsApi.js'
import '../../pages/admin-ui/style.css'
import '../../styles/super-admin-dashboard.css'

const FALLBACK_COLORS = ['#334155', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2']
const TREND_WEEK_COUNT = 52

const QUICK_ACTIONS = [
  { to: 'institutions', label: 'Institutions', icon: Building2 },
  { to: 'analytics', label: 'System analytics', icon: BarChart3 },
  { to: 'users', label: 'User management', icon: UsersRound },
  { to: 'settings', label: 'System settings', icon: Settings },
]

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay() || 7
  if (day !== 1) {
    date.setDate(date.getDate() - (day - 1))
  }
  return date
}

function getLastWeeks(count = TREND_WEEK_COUNT) {
  const weeks = []
  const currentMonday = getMonday(new Date())
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() - offset * 7)
    weeks.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return weeks
}

function formatWeekLabel(weekStr) {
  if (!weekStr) return weekStr
  const [y, m, d] = weekStr.split('-')
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  return dateObj.toLocaleString(undefined, { month: 'short', day: 'numeric' })
}

function buildInstitutionSeries(institutions, trendRows, valueKey) {
  const instMap = new Map(
    institutions.map((inst, index) => [
      inst.institutionId,
      {
        institutionId: inst.institutionId,
        acronym: inst.acronym,
        primaryColor: inst.primaryColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      },
    ]),
  )

  for (const row of trendRows) {
    if (!instMap.has(row.institutionId)) {
      instMap.set(row.institutionId, {
        institutionId: row.institutionId,
        acronym: row.acronym,
        primaryColor: row.primaryColor || FALLBACK_COLORS[instMap.size % FALLBACK_COLORS.length],
      })
    }
  }

  const mergedInstitutions = [...instMap.values()]
  const weeks = getLastWeeks()
  const series = mergedInstitutions.map((inst) => ({
    institutionId: inst.institutionId,
    key: inst.acronym || `Inst ${inst.institutionId}`,
    color: inst.primaryColor,
  }))

  const byInstWeek = new Map()
  for (const row of trendRows) {
    byInstWeek.set(`${row.institutionId}:${row.week}`, row[valueKey] ?? 0)
  }

  const data = weeks.map((week) => {
    const point = { week, label: formatWeekLabel(week) }
    for (const line of series) {
      point[line.key] = byInstWeek.get(`${line.institutionId}:${week}`) ?? 0
    }
    return point
  })

  return { data, series, weeks }
}

function InstitutionTrendChart({ title, subtitle, data, series, emptyLabel }) {
  const hasChart = series.length > 0
  const hasValues = data.some((point) =>
    series.some((line) => Number(point[line.key] ?? 0) > 0),
  )

  return (
    <FadeIn className="panel super-admin-dashboard__chart-panel" delay={0.08}>
      <div className="panel-header">
        <div>
          <span className="panel-title">{title}</span>
          {subtitle ? <p className="super-admin-dashboard__actions-sub">{subtitle}</p> : null}
        </div>
      </div>
      <div className="super-admin-dashboard__chart-body">
        {hasChart ? (
          <>
            <div className="super-admin-dashboard__chart-legend" aria-hidden={series.length <= 1}>
              {series.map((line) => (
                <span key={line.key} className="super-admin-dashboard__legend-item">
                  <span
                    className="super-admin-dashboard__legend-swatch"
                    style={{ backgroundColor: line.color }}
                  />
                  {line.key}
                </span>
              ))}
            </div>
            {!hasValues ? (
              <p className="super-admin-dashboard__chart-empty super-admin-dashboard__chart-empty--inline">
                No activity yet in this period. The timeline below shows the past year at zero.
              </p>
            ) : null}
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="super-admin-dashboard__chart-tooltip">
                        <p className="super-admin-dashboard__chart-tooltip-title">{label}</p>
                        {payload.map((entry) => (
                          <div key={entry.dataKey} className="super-admin-dashboard__chart-tooltip-row">
                            <span
                              className="super-admin-dashboard__legend-swatch"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.dataKey}</span>
                            <span className="super-admin-dashboard__chart-tooltip-value">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                {series.map((line) => (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    stroke={line.color}
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3, strokeWidth: 0, fill: line.color }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: line.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="super-admin-dashboard__chart-empty">{emptyLabel}</p>
        )}
      </div>
    </FadeIn>
  )
}

function DashboardQuickAction({ to, icon: Icon, children }) {
  return (
    <Link to={to} className="super-admin-quick-action">
      <span className="super-admin-quick-action__icon-wrap" aria-hidden>
        <Icon size={20} strokeWidth={2} className="admin-nav-icon" />
      </span>
      <span className="super-admin-quick-action__label">{children}</span>
      <ChevronRight size={16} strokeWidth={2} className="super-admin-quick-action__chevron" aria-hidden />
    </Link>
  )
}

/** Platform home — separate from institution admin dashboard. */
export default function SuperAdminDashboardPage() {
  const base = '/super-admin'
  const [overview, setOverview] = useState(null)
  const [institutions, setInstitutions] = useState([])
  const [violationTrends, setViolationTrends] = useState([])
  const [onboardingTrends, setOnboardingTrends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchSuperAdminAnalytics()
      .then((data) => {
        setOverview(data.overview || null)
        setInstitutions(data.institutions || [])
        setViolationTrends(data.trends || [])
        setOnboardingTrends(data.onboardingTrends || [])
      })
      .catch(() => {
        setOverview(null)
        setInstitutions([])
        setViolationTrends([])
        setOnboardingTrends([])
      })
      .finally(() => setLoading(false))
  }, [])

  const institutionColors = useMemo(
    () =>
      institutions.map((inst, index) => ({
        institutionId: inst.institutionId,
        acronym: inst.acronym,
        primaryColor: inst.primaryColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      })),
    [institutions],
  )

  const violationChart = useMemo(
    () => buildInstitutionSeries(institutionColors, violationTrends, 'eventCount'),
    [institutionColors, violationTrends],
  )

  const onboardingChart = useMemo(
    () => buildInstitutionSeries(institutionColors, onboardingTrends, 'memberCount'),
    [institutionColors, onboardingTrends],
  )

  return (
    <div className="acsis-stack super-admin-dashboard">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Super admin</span>
        </div>
      </div>

      <div className="content-body">
        <div className="super-admin-dashboard__hero">
          <div className="super-admin-dashboard__stats-grid">
            <SummaryStatCard
              label="Active institutions"
              value={loading ? '…' : (overview?.activeInstitutions ?? '—')}
              tone="success"
              delay={0.02}
            />
            <SummaryStatCard
              label="Institution admins"
              value={loading ? '…' : (overview?.institutionAdmins ?? '—')}
              delay={0.04}
            />
            <SummaryStatCard
              label="Violation events"
              value={loading ? '…' : (overview?.totalViolationEvents ?? '—')}
              tone="danger"
              delay={0.06}
            />
            <SummaryStatCard
              label="Flagged sessions"
              value={loading ? '…' : (overview?.flaggedSessions ?? '—')}
              tone="danger"
              delay={0.08}
            />
          </div>

          <FadeIn className="panel super-admin-dashboard__actions" delay={0.05}>
            <div className="super-admin-dashboard__actions-header">
              <h2 className="super-admin-dashboard__actions-title">Quick actions</h2>
              <p className="super-admin-dashboard__actions-sub">Jump to platform tools.</p>
            </div>
            <div className="super-admin-dashboard__actions-list">
              {QUICK_ACTIONS.map((action) => (
                <DashboardQuickAction
                  key={action.to}
                  to={`${base}/${action.to}`}
                  icon={action.icon}
                >
                  {action.label}
                </DashboardQuickAction>
              ))}
            </div>
          </FadeIn>
        </div>

        <div className="super-admin-dashboard__charts">
          <InstitutionTrendChart
            title="Violation trends"
            subtitle="Last year by week, per institution"
            data={violationChart.data}
            series={violationChart.series}
            emptyLabel="No violation events recorded in the past year."
          />
          <InstitutionTrendChart
            title="Onboarding trends"
            subtitle="New members by week, per institution color"
            data={onboardingChart.data}
            series={onboardingChart.series}
            emptyLabel="No new member onboarding in the past year."
          />
        </div>
      </div>
    </div>
  )
}
