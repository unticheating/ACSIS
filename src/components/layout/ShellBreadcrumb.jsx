import { useLocation } from 'react-router-dom'
import { resolveShellPageTitle } from '@/config/shellConfig.js'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import { useDetectionsToolbar } from '@/context/DetectionsToolbarContext.jsx'
import DetectionsSeatSettingsMenu from '@/components/teacher/DetectionsSeatSettingsMenu.jsx'

/**
 * Shared top bar for teacher & student (admin pages keep their own headers).
 * @param {{ role: 'teacher' | 'student' }} props
 */
export default function ShellBreadcrumb({ role }) {
  const { acronym } = useInstitutionTheme()
  const { pathname } = useLocation()
  const pageName = resolveShellPageTitle(role, pathname)
  const ctx = useDetectionsToolbar()
  const toolbar = ctx?.toolbar
  const showDetectionsSettings = role === 'teacher' && pathname === '/teacher/detections' && toolbar

  return (
    <header className="content-header w-full">
      <div className="breadcrumb">
        <span className="brand-plp">{acronym}</span>
        <span className="brand-acsis"> ACSIS</span>
        <span className="sep">/</span>
        <span className="page-name">{pageName}</span>
      </div>
      {showDetectionsSettings ? (
        <div className="content-header__actions">
          <DetectionsSeatSettingsMenu
            seatSettings={toolbar.seatSettings}
            onFillModeChange={toolbar.onFillModeChange}
          />
        </div>
      ) : null}
    </header>
  )
}
