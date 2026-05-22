import { NavLink } from 'react-router-dom'

const itemClass = ({ isActive }) => `acsis-bottom-nav__item${isActive ? ' is-active' : ''}`

/** @param {{ items: { to: string, label: string, mobileLabel?: string, end?: boolean, icon: import('react').ComponentType<{ size?: number, strokeWidth?: number, className?: string, 'aria-hidden'?: boolean }> }[] }} props */
export default function MobileBottomNav({ items }) {
  return (
    <nav className="acsis-mobile-bottom-nav" aria-label="Main navigation">
      {items.map(({ to, label, mobileLabel, end, icon: Icon }) => (
        <NavLink key={to} to={to} end={Boolean(end)} className={itemClass}>
          <span className="acsis-bottom-nav__icon-wrap" aria-hidden>
            <Icon size={24} strokeWidth={2} className="acsis-bottom-nav__icon" />
          </span>
          <span className="acsis-bottom-nav__label">{mobileLabel ?? label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
