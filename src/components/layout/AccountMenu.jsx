import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import { useSession } from '@/context/SessionContext.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'

/**
 * @param {{
 *   settingsPath?: string | null,
 *   showText?: boolean,
 *   triggerClassName?: string,
 *   onTriggerClick?: (e: import('react').MouseEvent) => void,
 *   menuSide?: 'top' | 'bottom',
 * }} props
 */
export default function AccountMenu({
  settingsPath = null,
  showText = true,
  triggerClassName = 'acsis-profile-card acsis-profile-card--trigger',
  onTriggerClick,
  menuSide = 'top',
}) {
  const { accounts, activeAccount, switchAccount, logout, sessionMode } = useSession()
  const { theme, toggleTheme } = useTheme()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  const otherAccounts =
    sessionMode === 'demo' ? accounts.filter((a) => a.id !== activeAccount.id) : []

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Account menu"
          onClick={onTriggerClick}
        >
          <div className="acsis-profile-avatar">{activeAccount.avatarLetter}</div>
          {showText ? (
            <>
              <div className="acsis-profile-text">
                <span className="acsis-profile-name">{activeAccount.displayName}</span>
                <span className="acsis-profile-role">{activeAccount.roleLabel}</span>
              </div>
              <span className="acsis-profile-switch" aria-hidden>
                <ChevronsUpDown size={18} strokeWidth={2} />
              </span>
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={menuSide}
        align="end"
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
        <DropdownMenuActionItem
          icon={theme === 'dark' ? Sun : Moon}
          onSelect={(e) => {
            e.preventDefault()
            toggleTheme()
          }}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </DropdownMenuActionItem>
        <DropdownMenuSeparator />
        <DropdownMenuActionItem
          icon={LogOut}
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault()
            void (async () => {
              const ok = await confirm({
                title: 'Log out?',
                description: 'You will need to sign in again to continue.',
                confirmLabel: 'Log out',
                destructive: true,
              })
              if (ok) logout()
            })()
          }}
        >
          Log out
        </DropdownMenuActionItem>
      </DropdownMenuContent>
      {ConfirmDialog}
    </DropdownMenu>
  )
}
