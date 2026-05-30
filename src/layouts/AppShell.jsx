import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { resolveShellPageTitle } from '../config/shellConfig.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import AppSidebar from '../components/layout/AppSidebar.jsx'
import RouteFallback from '../components/layout/RouteFallback.jsx'
import MobileBottomNav from '../components/layout/MobileBottomNav.jsx'
import MobileTopBar from '../components/layout/MobileTopBar.jsx'
import ShellBreadcrumb from '../components/layout/ShellBreadcrumb.jsx'
import { DetectionsToolbarProvider } from '../context/DetectionsToolbarContext.jsx'
import { TeacherShellBreadcrumbProvider } from '../context/TeacherShellBreadcrumbContext.jsx'
import { shellConfig } from '../config/shellConfig.js'
import '../pages/admin-ui/style.css'
import '../styles/sidebar-extras.css'
import '../styles/mobile-shell.css'
import '../styles/summary-stat-cards.css'
import '../styles/shell-dark.css'
import '../styles/dark-mode-system.css'
import '../styles/scrollbars.css'
import '../styles/light-mode-system.css'
import '../styles/route-fallback.css'

/**
 * Shared chrome: fixed sidebar + padded main column (all roles).
 * @param {{ role: 'teacher' | 'student' | 'admin' | 'super_admin' }} props
 */
export default function AppShell({ role }) {
  const { pathname } = useLocation()
  const pageTitle = resolveShellPageTitle(role, pathname)
  useDocumentTitle(pageTitle)

  const { nav } = shellConfig[role]
  const settingsPath =
    role === 'admin' ? '/admin/settings' : role === 'super_admin' ? '/super-admin/settings' : null

  const portalChrome =
    role === 'admin' || role === 'super_admin' ? (
      <>
        <MobileTopBar settingsPath={settingsPath} role={role} />
        <main className="acsis-main" id="acsis-main-content" tabIndex={-1}>
          <div className="acsis-page">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <MobileBottomNav items={nav} />
      </>
    ) : (
      <>
        <MobileTopBar settingsPath={settingsPath} role={role} />
        <main className="acsis-main" id="acsis-main-content" tabIndex={-1}>
          <div className="acsis-page">
            <ShellBreadcrumb role={role} />
            <div className="content-body">
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
        <MobileBottomNav items={nav} />
      </>
    )

  const teacherChrome = (
    <DetectionsToolbarProvider>
      <TeacherShellBreadcrumbProvider>{portalChrome}</TeacherShellBreadcrumbProvider>
    </DetectionsToolbarProvider>
  )

  return (
    <div className="acsis-app">
      <a className="acsis-skip-link" href="#acsis-main-content">
        Skip to main content
      </a>
      <AppSidebar items={nav} settingsPath={settingsPath} />
      {role === 'teacher' ? teacherChrome : portalChrome}
    </div>
  )
}
