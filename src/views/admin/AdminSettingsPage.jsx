import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext.jsx'
import '../../pages/admin-ui/style.css'

/**
 * @param {{ basePath?: string }} props
 */
export default function AdminSettingsPage({ basePath = '/admin' }) {
  const { theme, setTheme } = useTheme()
  const isPlatform = basePath === '/super-admin'

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">System settings</span>
        </div>
      </div>
      <div className="content-body">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Appearance</span>
          </div>
          <p className="admin-settings-lead">
            Choose light or dark for the app shell. This preference is saved on this browser.
          </p>
          <div className="admin-settings-appearance">
            <button
              type="button"
              className={`admin-settings-mode${theme === 'light' ? ' is-active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={18} strokeWidth={2} aria-hidden />
              <span>Light</span>
            </button>
            <button
              type="button"
              className={`admin-settings-mode${theme === 'dark' ? ' is-active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={18} strokeWidth={2} aria-hidden />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">{isPlatform ? 'Platform' : 'Institution'}</span>
          </div>
          <p className="admin-placeholder-lead">
            {isPlatform
              ? 'Super admin tools (tenant provisioning, billing, audit) will connect here. Use the sidebar for classes and users in this demo.'
              : 'Branding, LDAP, email, and exam policies will connect here when wired to your backend.'}
          </p>
          <p className="admin-settings-back">
            <Link to={basePath}>← Back to dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
