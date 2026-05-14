import { Link } from 'react-router-dom'
import { Building2, FileText, Settings, ShieldCheck } from 'lucide-react'
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

        <div className="stat-cards super-admin-stat-cards">
          <div className="stat-card green">
            <div className="stat-card-label">Institutions (demo)</div>
            <div className="stat-card-value">1</div>
          </div>
          <div className="stat-card green">
            <div className="stat-card-label">Active sessions</div>
            <div className="stat-card-value">—</div>
          </div>
          <div className="stat-card red">
            <div className="stat-card-label">Open incidents</div>
            <div className="stat-card-value">0</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Quick links</span>
          </div>
          <div className="super-admin-links">
            <Link to={`${base}/classes`} className="super-admin-link">
              <FileText size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>Classes across tenants</span>
            </Link>
            <Link to={`${base}/users`} className="super-admin-link">
              <Building2 size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>User management</span>
            </Link>
            <Link to={`${base}/settings`} className="super-admin-link">
              <Settings size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>System settings & appearance</span>
            </Link>
            <Link to={`${base}/violations`} className="super-admin-link">
              <ShieldCheck size={20} strokeWidth={2} aria-hidden className="super-admin-link__icon" />
              <span>Violation records</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
