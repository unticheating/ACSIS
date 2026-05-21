import { Link } from 'react-router-dom'
import '../styles/summary-stat-cards.css'
import { SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { cn } from '@/lib/utils'

function PortalCard({ to, title, description, letter }) {
  return (
    <Link
      to={to}
      className={cn('acsis-summary-stat', 'acsis-summary-stat--success')}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="acsis-summary-stat__body">
        <span className="acsis-summary-stat__label">{title}</span>
        <span className="acsis-summary-stat__value" style={{ fontSize: '1.5rem' }}>
          {letter}
        </span>
        <span className="acsis-summary-stat__hint">{description}</span>
      </div>
    </Link>
  )
}

/** Internal demo entry to role portals (not shown to end users on production login). */
export default function DevPortalsPage() {
  return (
    <div
      className="acsis-dev-portals"
      style={{
        minHeight: '100vh',
        padding: '48px 24px',
        background: 'linear-gradient(135deg, #f0fdf4 60%, #dcfce7 100%)',
        fontFamily: 'var(--font-app, Google Sans, system-ui, sans-serif)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
        <p style={{ marginBottom: 16 }}>
          <Link to="/" style={{ color: 'var(--brand-plp, #14532d)', fontWeight: 600 }}>
            ← Back to login
          </Link>
        </p>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-mark, #14532d)', marginBottom: 8 }}>
          PLP ACSIS — demo portals
        </h1>
        <p style={{ color: '#4b5563', marginBottom: 32, lineHeight: 1.5 }}>
          Jump directly into a role layout without going through the login screen.
        </p>
        <SummaryStatGrid className="!grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <PortalCard to="/super-admin" letter="X" title="Super admin" description="Platform / multi-tenant (demo)" />
          <PortalCard to="/teacher" letter="T" title="Teacher" description="Dashboard, exams, live monitoring" />
          <PortalCard to="/student/my-classes" letter="S" title="Student" description="Enrolled classes, exam stream" />
          <PortalCard to="/admin" letter="A" title="Admin" description="Subjects, students, violations" />
        </SummaryStatGrid>
      </div>
    </div>
  )
}
