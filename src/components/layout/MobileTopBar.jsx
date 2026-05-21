import { useLocation } from 'react-router-dom'
import PlpLogo from '@/components/brand/PlpLogo.jsx'
import AccountMenu from '@/components/layout/AccountMenu.jsx'
import { resolveShellPageTitle } from '@/config/shellConfig.js'

/**
 * @param {{
 *   settingsPath?: string | null,
 *   role: 'teacher' | 'student' | 'admin' | 'super_admin',
 * }} props
 */
export default function MobileTopBar({ settingsPath = null, role }) {
  const { pathname } = useLocation()
  const pageName = resolveShellPageTitle(role, pathname)

  return (
    <header className="acsis-mobile-top-bar">
      <div className="acsis-mobile-top-bar__brand">
        <div className="acsis-mobile-top-bar__logo">
          <PlpLogo className="acsis-logo-img" alt="" responsive />
        </div>
        <div className="acsis-mobile-top-bar__breadcrumb breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{pageName}</span>
        </div>
      </div>
      <AccountMenu
        settingsPath={settingsPath}
        showText={false}
        triggerClassName="acsis-mobile-account-trigger"
        menuSide="bottom"
      />
    </header>
  )
}
