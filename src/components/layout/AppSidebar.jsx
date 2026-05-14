import { ChevronsUpDown, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

const COLLAPSED_CLASS = 'acsis-sidebar-collapsed'
const COLLAPSED_STORAGE_KEY = 'acsis.sidebarCollapsed'

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

export default function AppSidebar({ items, settingsPath = null }) {
  const { accounts, activeAccount, switchAccount } = useSession()
  const { theme, toggleTheme } = useTheme()
  const otherAccounts = accounts.filter((a) => a.id !== activeAccount.id)
  const [collapsed, setCollapsed] = useState(readInitialCollapsed)

  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-acsis-sidebar')
    document.documentElement.classList.toggle(COLLAPSED_CLASS, collapsed)
  }, [collapsed])

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <div className="sidebar" id="main-sidebar">
      <div className="acsis-sidebar-header">
        <div className="acsis-logo-mark" title="Pamantasan ng Lungsod ng Pasig">
          PLP
        </div>
        <button
          type="button"
          className="acsis-collapse-btn"
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <CollapseIcon size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <nav className="sidebar-nav">
        {items.map(({ to, label, end, icon: Icon }) => (
          <NavLink key={to} to={to} end={Boolean(end)} className={itemClass}>
            <Icon size={16} strokeWidth={2} className="admin-nav-icon" aria-hidden />
            <span className="acsis-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="acsis-sidebar-bottom">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="acsis-profile-card acsis-profile-card--trigger"
              aria-label="Account menu"
            >
              <div className="acsis-profile-avatar">{activeAccount.avatarLetter}</div>
              <div className="acsis-profile-text">
                <span className="acsis-profile-name">{activeAccount.displayName}</span>
                <span className="acsis-profile-role">{activeAccount.roleLabel}</span>
              </div>
              <span className="acsis-profile-switch" aria-hidden>
                <ChevronsUpDown size={18} strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            className="acsis-account-dropdown z-[200] min-w-[220px] max-w-[min(320px,calc(100vw-24px))]"
          >
            {otherAccounts.length > 0
              ? otherAccounts.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    className="flex cursor-pointer flex-col items-start gap-0.5 py-2 font-semibold"
                    onSelect={() => switchAccount(a)}
                  >
                    {a.displayName}
                    <span className="text-xs font-medium text-muted-foreground">{a.roleLabel}</span>
                  </DropdownMenuItem>
                ))
              : null}
            {otherAccounts.length > 0 ? <DropdownMenuSeparator /> : null}
            {settingsPath ? (
              <DropdownMenuItem asChild className="cursor-pointer p-0 focus:bg-transparent">
                <Link
                  to={settingsPath}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                >
                  <Settings size={16} strokeWidth={2} aria-hidden />
                  Settings
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={(e) => {
                e.preventDefault()
                toggleTheme()
              }}
            >
              {theme === 'dark' ? <Sun size={16} strokeWidth={2} aria-hidden /> : <Moon size={16} strokeWidth={2} aria-hidden />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/40 dark:focus:text-red-300"
              onSelect={(e) => {
                if (!window.confirm('Are you sure you want to logout?')) {
                  e.preventDefault()
                } else {
                  window.location.assign('/')
                }
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
