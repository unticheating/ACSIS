import { useLocation } from 'react-router-dom'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import { useDetectionsToolbar } from '@/context/DetectionsToolbarContext.jsx'
import AccountMenu from '@/components/layout/AccountMenu.jsx'
import DetectionsSeatSettingsMenu from '@/components/teacher/DetectionsSeatSettingsMenu.jsx'
import { resolveShellPageTitle } from '@/config/shellConfig.js'

/**
 * @param {{
 *   settingsPath?: string | null,
 *   role: 'teacher' | 'student' | 'admin' | 'super_admin',
 * }} props
 */
export default function MobileTopBar({ settingsPath = null, role }) {
  const { acronym, logo } = useInstitutionTheme()
  const { pathname } = useLocation()
  const pageName = resolveShellPageTitle(role, pathname)
  const ctx = useDetectionsToolbar()
  const toolbar = ctx?.toolbar
  const showDetectionsSettings = role === 'teacher' && pathname === '/teacher/detections' && toolbar

  return (
    <header className="acsis-mobile-top-bar">
      <div className="acsis-mobile-top-bar__brand">
        <div className="acsis-mobile-top-bar__logo">
          <InstitutionLogo logo={logo} alt="" responsive />
        </div>
        <div className="acsis-mobile-top-bar__breadcrumb breadcrumb">
          <span className="brand-plp">{acronym}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{pageName}</span>
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
