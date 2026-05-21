import { PanelLeftClose } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import AccountMenu from '@/components/layout/AccountMenu.jsx'
import PlpLogo from '@/components/brand/PlpLogo.jsx'

const COLLAPSED_CLASS = 'acsis-sidebar-collapsed'
const COLLAPSED_STORAGE_KEY = 'acsis.sidebarCollapsed'
const MOBILE_MQ = '(max-width: 767px)'

const itemClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

function readInitialCollapsed() {
  if (typeof window === 'undefined') return false
  let fromStorage = false
  try {
    fromStorage = window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    /* ignore */
  }
  const legacyDataset = document.documentElement.getAttribute('data-acsis-sidebar') === 'collapsed'
  if (legacyDataset && !fromStorage) {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    return true
  }
  return fromStorage
}

/**
 * @param {{ items: { to: string, label: string, end?: boolean, icon: import('react').ComponentType }[], settingsPath?: string | null }} props
 */
export default function AppSidebar({ items, settingsPath = null }) {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed)

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)

    function apply() {
      const isMobile = mq.matches
      document.documentElement.removeAttribute('data-acsis-sidebar')
      document.documentElement.classList.toggle(COLLAPSED_CLASS, !isMobile && collapsed)
    }

    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [collapsed])

  function persistCollapsed(next) {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function expandSidebar() {
    setCollapsed(false)
    persistCollapsed(false)
  }

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c
      persistCollapsed(next)
      return next
    })
  }

  function handleCollapsedSidebarClick() {
    if (collapsed) expandSidebar()
  }

  function stopExpandWhenCollapsed(e) {
    if (collapsed) e.stopPropagation()
  }

  return (
    <div
      className={`sidebar acsis-sidebar-desktop${collapsed ? ' acsis-sidebar--collapsed-expandable' : ''}`}
      id="main-sidebar"
      onClick={handleCollapsedSidebarClick}
      title={collapsed ? 'Click to expand sidebar' : undefined}
    >
      <div className="acsis-sidebar-header">
        <div className="acsis-logo-mark" title="Pamantasan ng Lungsod ng Pasig">
          <PlpLogo className="acsis-logo-img" width={36} height={36} alt="" />
        </div>
        {!collapsed ? (
          <button
            type="button"
            className="acsis-collapse-btn"
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapse()
            }}
            title="Collapse sidebar"
            aria-expanded
          >
            <PanelLeftClose size={18} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        {items.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={Boolean(end)}
            className={itemClass}
            onClick={stopExpandWhenCollapsed}
          >
            <Icon size={16} strokeWidth={2} className="admin-nav-icon" aria-hidden />
            <span className="acsis-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="acsis-sidebar-bottom" onClick={stopExpandWhenCollapsed}>
        <AccountMenu settingsPath={settingsPath} onTriggerClick={stopExpandWhenCollapsed} />
      </div>
    </div>
  )
}
