import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import QuickActionLink from '@/components/icons/QuickActionLink.jsx'
import {
  ChartBarIcon,
  FileDescriptionIcon,
  GearIcon,
  GlobeIcon,
  UsersIcon,
} from '@/components/icons/hoverIcons.js'
import '../../pages/admin-ui/style.css'

/** Platform home — separate from institution admin dashboard. */
export default function SuperAdminDashboardPage() {
  const base = '/super-admin'

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
          Multi-tenant control plane (demo). Institution admins use <strong>/admin</strong>; this area is for platform
          operators only.
        </p>

        <SummaryStatGrid>
          <SummaryStatCard label="Institutions (demo)" value={1} tone="success" />
          <SummaryStatCard label="Active sessions" value="—" tone="success" />
          <SummaryStatCard label="Open incidents" value={0} tone="danger" />
        </SummaryStatGrid>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Quick links</span>
          </div>
          <div className="super-admin-links">
            <QuickActionLink to={`${base}/institutions`} icon={GlobeIcon}>
              Institutions
            </QuickActionLink>
            <QuickActionLink to={`${base}/users`} icon={UsersIcon}>
              User management
            </QuickActionLink>
            <QuickActionLink to={`${base}/settings`} icon={GearIcon}>
              System settings
            </QuickActionLink>
            <QuickActionLink to={`${base}/analytics`} icon={ChartBarIcon}>
              System analytics
            </QuickActionLink>
          </div>
        </div>
      </div>
    </div>
  )
}
