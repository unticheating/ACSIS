import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const StreamBackLink = forwardRef(function StreamBackLink(
  { to, children, className = 'acsis-stream-back', iconSize = 16, ...props },
  ref,
) {
  return (
    <Link ref={ref} to={to} className={className} {...props}>
      <ChevronLeft size={iconSize} strokeWidth={2.25} aria-hidden className="shrink-0" />
      {children}
    </Link>
  )
})

export default StreamBackLink
