import { Link } from 'react-router-dom'
import { BarChart3, Building2, Settings } from 'lucide-react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
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
            <Link to={`${base}/institutions`} className="super-admin-link">
              <Building2 size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>Institutions</span>
            </Link>
            <Link to={`${base}/users`} className="super-admin-link">
              <Building2 size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>User management</span>
            </Link>
            <Link to={`${base}/settings`} className="super-admin-link">
              <Settings size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>System settings</span>
            </Link>
            <Link to={`${base}/analytics`} className="super-admin-link">
              <BarChart3 size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>System analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
