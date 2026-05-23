import { Link } from 'react-router-dom'
import '../styles/summary-stat-cards.css'
import { SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { cn } from '@/lib/utils'
import { useSession, demoAccounts } from '@/context/SessionContext.jsx'

function PortalCard({ accountId, title, description, letter }) {
  const { switchAccount } = useSession()
  const account = demoAccounts.find((a) => a.id === accountId)

  return (
    <button
      onClick={() => {
        if (account) switchAccount(account)
      }}
      className={cn('acsis-summary-stat acsis-card-surface', 'acsis-summary-stat--success')}
      style={{ 
        textDecoration: 'none', 
        color: 'inherit', 
        border: 'none', 
        background: 'var(--card-bg, #ffffff)', 
        textAlign: 'left', 
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div className="acsis-summary-stat__body">
        <span className="acsis-summary-stat__label">{title}</span>
        <span className="acsis-summary-stat__value" style={{ fontSize: '1.5rem' }}>
          {letter}
        </span>
        <span className="acsis-summary-stat__hint">{description}</span>
      </div>
    </button>
  )
}

/** Internal demo entry to role portals (not shown to end users on production login). */
export default function DevPortalsPage() {
  const { logout } = useSession()

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
          <button 
            onClick={() => logout()} 
            style={{ 
              color: 'var(--brand-plp, var(--acsis-brand-800, #14532d))', 
              fontWeight: 600, 
              background: 'none', 
              border: 'none', 
              padding: 0, 
              font: 'inherit', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ← Back to login
          </button>
        </p>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-mark, var(--acsis-brand-800, #14532d))', marginBottom: 8 }}>
          ACSIS — demo portals
        </h1>
        <p style={{ color: '#4b5563', marginBottom: 32, lineHeight: 1.5 }}>
          Jump directly into a role layout without going through the login screen.
        </p>
        <SummaryStatGrid className="!grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <PortalCard accountId="super" letter="X" title="Super admin" description="Platform / multi-tenant (demo)" />
          <PortalCard accountId="faculty" letter="T" title="Teacher" description="Dashboard, exams, live monitoring" />
          <PortalCard accountId="student" letter="S" title="Student" description="Enrolled classes, exam stream" />
          <PortalCard accountId="admin" letter="A" title="Admin" description="Subjects, students, violations" />
        </SummaryStatGrid>
      </div>
    </div>
  )
}
