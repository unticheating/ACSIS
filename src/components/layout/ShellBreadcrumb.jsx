import { Link, useLocation } from 'react-router-dom'
import { coerceDisplayString } from '@/lib/coerceDisplay.js'
import { resolveShellPageTitle } from '@/config/shellConfig.js'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import { useDetectionsToolbar } from '@/context/DetectionsToolbarContext.jsx'
import { useTeacherShellBreadcrumbSegments } from '@/context/TeacherShellBreadcrumbContext.jsx'
import { useStudentShellBreadcrumbSegments } from '@/context/StudentShellBreadcrumbContext.jsx'
import DetectionsSeatSettingsMenu from '@/components/teacher/DetectionsSeatSettingsMenu.jsx'
import DetectionsViewModeToggle from '@/components/teacher/DetectionsViewModeToggle.jsx'

/**
 * @param {{ role: 'teacher' | 'student', segments: { label: string, to?: string, state?: object }[] }} props
 */
function BreadcrumbTrail({ segments }) {
  const { acronym } = useInstitutionTheme()

  return (
    <div className="breadcrumb">
      <span className="breadcrumb__brand">
        <span className="brand-plp">{coerceDisplayString(acronym)}</span>
        <span className="brand-acsis"> ACSIS</span>
      </span>
      <span className="breadcrumb__trail">
        {segments.map((item, index) => {
          const isLast = index === segments.length - 1
          return (
            <span key={`${coerceDisplayString(item.label)}-${index}`} className="breadcrumb__segment">
              <span className="sep">/</span>
              {item.to && !isLast ? (
                <Link to={item.to} state={item.state} className="breadcrumb__link">
                  {coerceDisplayString(item.label)}
                </Link>
              ) : (
                <span className={isLast ? 'page-name' : 'breadcrumb__crumb'}>
                  {coerceDisplayString(item.label)}
                </span>
              )}
            </span>
          )
        })}
      </span>
    </div>
  )
}

/**
 * @param {{ role: 'teacher' | 'student' }} props
 */
function resolveTeacherSegments(pathname, extraSegments) {
  const myClassesRoot = { label: 'My Classes', to: '/teacher/my-classes' }
  if (extraSegments?.length) {
    return [myClassesRoot, ...extraSegments]
  }
  if (pathname === '/teacher/my-classes') {
    return [{ label: 'My Classes' }]
  }
  if (pathname.startsWith('/teacher/my-classes/')) {
    return [myClassesRoot]
  }
  return [{ label: resolveShellPageTitle('teacher', pathname) }]
}

/**
 * Shared top bar for teacher & student (admin pages keep their own headers).
 * @param {{ role: 'teacher' | 'student' }} props
 */
export default function ShellBreadcrumb({ role }) {
  const { pathname } = useLocation()
  const extraTeacherSegments = useTeacherShellBreadcrumbSegments()
  const ctx = useDetectionsToolbar()
  const toolbar = ctx?.toolbar
  const isDetectionsPage = role === 'teacher' && pathname === '/teacher/detections'

  const segments =
    role === 'teacher'
      ? resolveTeacherSegments(pathname, extraTeacherSegments)
      : [{ label: resolveShellPageTitle(role, pathname) }]

  return (
    <header className="content-header w-full">
      <BreadcrumbTrail segments={segments} />
      {isDetectionsPage ? (
        <div className="content-header__actions acsis-detections-header-actions">
          {toolbar ? (
            <>
              <DetectionsViewModeToggle
                viewMode={toolbar.viewMode}
                onViewModeChange={toolbar.onViewModeChange}
              />
              <DetectionsSeatSettingsMenu
                seatSettings={toolbar.seatSettings}
                onFillModeChange={toolbar.onFillModeChange}
              />
            </>
          ) : (
            <>
              <span
                className="acsis-detections-view-toggle acsis-detections-view-toggle--placeholder"
                aria-hidden
              />
              <span
                className="acsis-detections-settings-btn acsis-detections-settings-btn--placeholder"
                aria-hidden
              />
            </>
          )}
        </div>
      ) : null}
    </header>
  )
}
