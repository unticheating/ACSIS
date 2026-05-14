import { useLocation } from 'react-router-dom'
import { resolveShellPageTitle } from '@/config/shellConfig.js'

/**
 * Shared top bar for teacher & student (admin pages keep their own headers).
 * @param {{ role: 'teacher' | 'student' }} props
 */
export default function ShellBreadcrumb({ role }) {
  const { pathname } = useLocation()
  const pageName = resolveShellPageTitle(role, pathname)

  return (
    <header className="content-header w-full">
      <div className="breadcrumb">
        <span className="brand-plp">PLP</span>
        <span className="brand-acsis"> ACSIS</span>
        <span className="sep">/</span>
        <span className="page-name">{pageName}</span>
      </div>
    </header>
  )
}
