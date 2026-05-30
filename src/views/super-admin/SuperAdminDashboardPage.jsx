import { useEffect, useState } from 'react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import QuickActionLink from '@/components/icons/QuickActionLink.jsx'
import {
  ChartBarIcon,
  FileDescriptionIcon,
  GearIcon,
  GlobeIcon,
  UsersIcon,
} from '@/components/icons/hoverIcons.js'
import { fetchSuperAdminAnalytics } from '@/lib/superAdminAnalyticsApi.js'
import '../../pages/admin-ui/style.css'

/** Platform home — separate from institution admin dashboard. */
export default function SuperAdminDashboardPage() {
  const base = '/super-admin'
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    fetchSuperAdminAnalytics()
      .then((data) => setOverview(data.overview || null))
      .catch(() => setOverview(null))
  }, [])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Super admin</span>
        </div>
      </div>

      <div className="content-body">
        <p className="admin-placeholder-lead super-admin-intro">
          Multi-tenant control plane. Institution admins use <strong>/admin</strong>; this area is for platform
          operators only.
        </p>

        <SummaryStatGrid>
          <SummaryStatCard
            label="Active institutions"
            value={overview?.activeInstitutions ?? '—'}
            tone="success"
          />
          <SummaryStatCard label="Institution admins" value={overview?.institutionAdmins ?? '—'} />
          <SummaryStatCard
            label="Violation events"
            value={overview?.totalViolationEvents ?? '—'}
            tone="danger"
          />
          <SummaryStatCard label="Flagged sessions" value={overview?.flaggedSessions ?? '—'} tone="danger" />
        </SummaryStatGrid>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Quick links</span>
          </div>
          <div className="super-admin-links">
            <QuickActionLink to={`${base}/institutions`} icon={GlobeIcon}>
              Institutions
            </QuickActionLink>
            <QuickActionLink to={`${base}/analytics`} icon={ChartBarIcon}>
              System analytics
            </QuickActionLink>
            <QuickActionLink to={`${base}/users`} icon={UsersIcon}>
              User management
            </QuickActionLink>
            <QuickActionLink to={`${base}/settings`} icon={GearIcon}>
              System settings
            </QuickActionLink>
            <QuickActionLink to={`${base}/reports`} icon={FileDescriptionIcon}>
              Reports
            </QuickActionLink>
          </div>
        </div>
      </div>
    </div>
  )
}
