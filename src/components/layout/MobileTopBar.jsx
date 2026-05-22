import { Link, useLocation } from 'react-router-dom'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import { useDetectionsToolbar } from '@/context/DetectionsToolbarContext.jsx'
import AccountMenu from '@/components/layout/AccountMenu.jsx'
import DetectionsSeatSettingsMenu from '@/components/teacher/DetectionsSeatSettingsMenu.jsx'
import { resolveShellPageTitle } from '@/config/shellConfig.js'
import { useTeacherShellBreadcrumbSegments } from '@/context/TeacherShellBreadcrumbContext.jsx'

/**
 * @param {{ settingsPath?: string | null, role: 'teacher' | 'student' | 'admin' | 'super_admin' }} props
 */
export default function MobileTopBar({ settingsPath = null, role }) {
  const { acronym, logo } = useInstitutionTheme()
  const { pathname } = useLocation()
  const extraTeacherSegments = useTeacherShellBreadcrumbSegments()
  const ctx = useDetectionsToolbar()
  const toolbar = ctx?.toolbar
  const showDetectionsSettings = role === 'teacher' && pathname === '/teacher/detections' && toolbar

  const myClassesRoot = { label: 'My Classes', to: '/teacher/my-classes' }
  let items
  if (role === 'teacher') {
    if (extraTeacherSegments?.length) {
      items = [myClassesRoot, ...extraTeacherSegments]
    } else if (pathname === '/teacher/my-classes') {
      items = [{ label: 'My Classes' }]
    } else if (pathname.startsWith('/teacher/my-classes/')) {
      items = [myClassesRoot]
    } else {
      items = [{ label: resolveShellPageTitle('teacher', pathname) }]
    }
  } else {
    items = [{ label: resolveShellPageTitle(role, pathname) }]
  }

  return (
    <header className="acsis-mobile-top-bar">
      <div className="acsis-mobile-top-bar__brand">
        <div className="acsis-mobile-top-bar__logo">
          <InstitutionLogo logo={logo} alt="" responsive />
        </div>
        <div className="acsis-mobile-top-bar__breadcrumb breadcrumb">
          <span className="brand-plp">{acronym}</span>
          <span className="brand-acsis"> ACSIS</span>
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <span key={`${item.label}-${index}`}>
                <span className="sep">/</span>
                {item.to && !isLast ? (
                  <Link to={item.to} className="breadcrumb__link">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'page-name' : 'breadcrumb__crumb'}>{item.label}</span>
                )}
              </span>
            )
          })}
        </div>
      </div>
      <div className="acsis-mobile-top-bar__actions">
        {showDetectionsSettings ? (
          <DetectionsSeatSettingsMenu
            seatSettings={toolbar.seatSettings}
            onFillModeChange={toolbar.onFillModeChange}
            triggerClassName="acsis-detections-settings-btn acsis-detections-settings-btn--mobile"
          />
        ) : null}
        <AccountMenu
          settingsPath={settingsPath}
          showText={false}
          triggerClassName="acsis-mobile-account-trigger"
          menuSide="bottom"
        />
      </div>
    </header>
  )
}
