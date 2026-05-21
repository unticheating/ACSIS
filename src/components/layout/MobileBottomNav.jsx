import { useRef } from 'react'
import { NavLink } from 'react-router-dom'

const itemClass = ({ isActive }) => `acsis-bottom-nav__item${isActive ? ' is-active' : ''}`

/** @param {{ to: string, label: string, mobileLabel?: string, end?: boolean, icon: import('react').ComponentType }} props */
function BottomNavItem({ to, label, mobileLabel, end, icon: Icon }) {
  const iconRef = useRef(null)

  return (
    <NavLink
      to={to}
      end={Boolean(end)}
      className={itemClass}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <span className="acsis-bottom-nav__icon-wrap" aria-hidden>
        <Icon ref={iconRef} size={24} strokeWidth={2} className="acsis-bottom-nav__icon" />
      </span>
      <span className="acsis-bottom-nav__label">{mobileLabel ?? label}</span>
    </NavLink>
  )
}

/** @param {{ items: { to: string, label: string, mobileLabel?: string, end?: boolean, icon: import('react').ComponentType }[] }} props */
export default function MobileBottomNav({ items }) {
  return (
    <nav className="acsis-mobile-bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <BottomNavItem key={item.to} {...item} />
      ))}
    </nav>
  )
}
