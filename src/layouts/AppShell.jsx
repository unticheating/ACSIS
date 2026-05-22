import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import AppSidebar from '../components/layout/AppSidebar.jsx'
import RouteFallback from '../components/layout/RouteFallback.jsx'
import MobileBottomNav from '../components/layout/MobileBottomNav.jsx'
import MobileTopBar from '../components/layout/MobileTopBar.jsx'
import ShellBreadcrumb from '../components/layout/ShellBreadcrumb.jsx'
import { DetectionsToolbarProvider } from '../context/DetectionsToolbarContext.jsx'
import { shellConfig } from '../config/shellConfig.js'
import '../pages/admin-ui/style.css'
import '../styles/sidebar-extras.css'
import '../styles/mobile-shell.css'
import '../styles/summary-stat-cards.css'
import '../styles/shell-dark.css'
import '../styles/dark-mode-system.css'
import '../styles/light-mode-system.css'
import '../styles/route-fallback.css'

/**
 * Shared chrome: fixed sidebar + padded main column (all roles).
 * @param {{ role: 'teacher' | 'student' | 'admin' | 'super_admin' }} props
 */
export default function AppShell({ role }) {
  const { nav } = shellConfig[role]
  const settingsPath =
    role === 'admin' ? '/admin/settings' : role === 'super_admin' ? '/super-admin/settings' : null

  const mainContent =
    role === 'admin' || role === 'super_admin' ? (
      <div className="acsis-page">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    ) : (
      <div className="acsis-page">
        <ShellBreadcrumb role={role} />
        <div className="content-body">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    )

  const shell = (
    <>
      <a className="acsis-skip-link" href="#acsis-main-content">
        Skip to main content
      </a>
      <AppSidebar items={nav} settingsPath={settingsPath} />
      <MobileTopBar settingsPath={settingsPath} role={role} />
      <main className="acsis-main" id="acsis-main-content" tabIndex={-1}>
        {mainContent}
      </main>
      <MobileBottomNav items={nav} />
    </>
  )

  return (
    <div className="acsis-app">
      {role === 'teacher' ? (
        <DetectionsToolbarProvider>{shell}</DetectionsToolbarProvider>
      ) : (
        shell
      )}
    </div>
  )
}
