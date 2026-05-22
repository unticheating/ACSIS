import { useRef } from 'react'
import { Link } from 'react-router-dom'

/**
 * Dashboard quick-action link with Its Hover icon animation on row hover.
 * @param {{ to: string, icon: import('react').ForwardRefExoticComponent, children: import('react').ReactNode, className?: string }} props
 */
export default function QuickActionLink({ to, icon: Icon, children, className = 'super-admin-link' }) {
  const iconRef = useRef(null)

  return (
    <Link
      to={to}
      className={className}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <Icon ref={iconRef} size={20} strokeWidth={2} className={`${className}__icon`} aria-hidden />
      <span>{children}</span>
    </Link>
  )
}
