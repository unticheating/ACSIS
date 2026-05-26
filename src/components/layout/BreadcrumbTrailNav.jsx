import { Link, useNavigate } from 'react-router-dom'
import { coerceDisplayString } from '@/lib/coerceDisplay.js'

/**
 * @param {{ segments: { label: string, to?: string, state?: object }[] }} props
 */
function getBackTarget(parents) {
  for (let i = parents.length - 1; i >= 0; i -= 1) {
    if (parents[i]?.to) return parents[i]
  }
  return null
}

/**
 * @param {{ segments: { label: string, to?: string, state?: object }[], className?: string }} props
 */
export default function BreadcrumbTrailNav({ segments, className = '' }) {
  const navigate = useNavigate()

  const safe = (segments || []).filter((s) => coerceDisplayString(s?.label))
  if (!safe.length) return null

  const parents = safe.length > 1 ? safe.slice(0, -1) : []
  const current = safe[safe.length - 1]
  const currentLabel = coerceDisplayString(current.label)
  const backTarget = getBackTarget(parents)
  const backLabel = backTarget ? coerceDisplayString(backTarget.label) : ''

  function renderSegment(item, index, isLast) {
    const label = coerceDisplayString(item.label)
    return (
      <span key={`${label}-${index}`} className="breadcrumb__segment">
        <span className="sep">/</span>
        {item.to && !isLast ? (
          <Link to={item.to} state={item.state} className="breadcrumb__link">
            {label}
          </Link>
        ) : (
          <span className={isLast ? 'page-name' : 'breadcrumb__crumb'}>{label}</span>
        )}
      </span>
    )
  }

  function handleBack() {
    if (!backTarget?.to) return
    navigate(backTarget.to, { state: backTarget.state })
  }

  return (
    <span className={`breadcrumb__trail ${className}`.trim()}>
      {/* Desktop / wide: full trail */}
      <span className="breadcrumb__trail-full">
        {safe.map((item, index) => renderSegment(item, index, index === safe.length - 1))}
      </span>

      {/* Mobile: PLP ACSIS / … / current — tap … to go up one level */}
      <span className="breadcrumb__trail-mobile">
        {backTarget ? (
          <>
            <button
              type="button"
              className="breadcrumb__ellipsis"
              aria-label={backLabel ? `Back to ${backLabel}` : 'Back to previous page'}
              onClick={handleBack}
            >
              …
            </button>
            <span className="sep">/</span>
          </>
        ) : null}
        <span className="page-name breadcrumb__current">{currentLabel}</span>
      </span>
    </span>
  )
}
