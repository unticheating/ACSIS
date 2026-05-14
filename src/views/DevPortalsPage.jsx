import { Link } from 'react-router-dom'
import '../pages/teacher-ui/teacher_dashboard.css'

function PortalCard({ to, title, description, letter }) {
  return (
    <Link to={to} className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="stat-card-body">
        <span className="stat-card-label">{title}</span>
        <span className="stat-card-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {letter}
        </span>
        <span className="stat-card-label" style={{ marginTop: 8, fontWeight: 500 }}>
          {description}
        </span>
      </div>
    </Link>
  )
}

/** Internal demo entry to role portals (not shown to end users on production login). */
export default function DevPortalsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '48px 24px',
        background: 'linear-gradient(135deg, #f0fdf4 60%, #dcfce7 100%)',
        fontFamily: 'var(--font-app, Google Sans, system-ui, sans-serif)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
        <p style={{ marginBottom: 16 }}>
          <Link to="/" style={{ color: '#166534', fontWeight: 600 }}>
            ← Back to login
          </Link>
        </p>
        <h1 style={{ fontSize: '1.75rem', color: '#166534', marginBottom: 8 }}>PLP ACSIS — demo portals</h1>
        <p style={{ color: '#4b5563', marginBottom: 32, lineHeight: 1.5 }}>
          Jump directly into a role layout without going through the login screen.
        </p>
        <div
          className="td-dashboard stats-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          <PortalCard to="/super-admin" letter="X" title="Super admin" description="Platform / multi-tenant (demo)" />
          <PortalCard to="/teacher" letter="T" title="Teacher" description="Dashboard, exams, live monitoring" />
          <PortalCard to="/student/my-classes" letter="S" title="Student" description="Enrolled classes, exam stream" />
          <PortalCard to="/admin" letter="A" title="Admin" description="Subjects, students, violations" />
        </div>
      </div>
    </div>
  )
}
