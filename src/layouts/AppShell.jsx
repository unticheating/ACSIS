import { Outlet } from 'react-router-dom'
import AppSidebar from '../components/layout/AppSidebar.jsx'
import ShellBreadcrumb from '../components/layout/ShellBreadcrumb.jsx'
import { shellConfig } from '../config/shellConfig.js'
import '../pages/admin-ui/style.css'
import '../styles/sidebar-extras.css'
import '../styles/shell-dark.css'

/**
 * Shared chrome: fixed sidebar + padded main column (all roles).
 * @param {{ role: 'teacher' | 'student' | 'admin' | 'super_admin' }} props
 */
export default function AppShell({ role }) {
  const { nav } = shellConfig[role]
  const settingsPath =
    role === 'admin' ? '/admin/settings' : role === 'super_admin' ? '/super-admin/settings' : null

  return (
    <div className="acsis-app">
      <a className="acsis-skip-link" href="#acsis-main-content">
        Skip to main content
      </a>
      <AppSidebar items={nav} settingsPath={settingsPath} />
      <main className="acsis-main" id="acsis-main-content" tabIndex={-1}>
        {role === 'admin' || role === 'super_admin' ? (
          <div className="acsis-page">
            <Outlet />
          </div>
        ) : (
          <div className="acsis-page">
            <ShellBreadcrumb role={role} />
            <div className="content-body">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
