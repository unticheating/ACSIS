import { DropdownMenuItem } from '@/components/ui/dropdown-menu.jsx'
import { cn } from '@/lib/utils'

const VARIANT_CLASSES = {
  default: 'focus:bg-accent focus:text-accent-foreground',
  destructive:
    '!text-red-600 focus:!text-red-600 focus:!bg-red-50 dark:!text-red-400 dark:focus:!text-red-400 dark:focus:!bg-red-950/40',
  success:
    'text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50 dark:text-emerald-400 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-300',
  warning:
    'text-amber-700 focus:text-amber-800 focus:bg-amber-50 dark:text-amber-400 dark:focus:bg-amber-950/40 dark:focus:text-amber-300',
}

const ICON_VARIANT_CLASSES = {
  default: 'text-muted-foreground',
  destructive: '!text-red-600 dark:!text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
}

/**
 * @param {{
 *   icon?: import('lucide-react').LucideIcon,
 *   variant?: 'default' | 'destructive' | 'success' | 'warning',
 *   children: import('react').ReactNode,
 *   className?: string,
 * } & import('@radix-ui/react-dropdown-menu').DropdownMenuItemProps} props
 */
export function DropdownMenuActionItem({
  icon: Icon,
  variant = 'default',
  children,
  className,
  ...props
}) {
  return (
    <DropdownMenuItem
      className={cn('cursor-pointer gap-2', VARIANT_CLASSES[variant], className)}
      {...props}
    >
      {Icon ? (
        <Icon
          size={16}
          strokeWidth={2}
          className={cn('shrink-0', ICON_VARIANT_CLASSES[variant])}
          aria-hidden
        />
      ) : null}
      <span className="flex-1">{children}</span>
    </DropdownMenuItem>
  )
}
