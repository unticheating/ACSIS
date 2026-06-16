function userInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * @param {{ user?: { name?: string, avatarUrl?: string | null }, className?: string, size?: 'md' | 'lg' }} props
 */
export default function UserAvatar({ user, className = '', size = 'md' }) {
  const url = user?.avatarUrl
  const sizeClass = size === 'lg' ? ' um-avatar--lg' : ''

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`um-avatar um-avatar--img${sizeClass}${className ? ` ${className}` : ''}`}
      />
    )
  }

  return (
    <span
      className={`um-avatar${sizeClass}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {userInitials(user?.name)}
    </span>
  )
}
