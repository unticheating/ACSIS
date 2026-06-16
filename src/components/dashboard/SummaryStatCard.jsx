import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import FadeIn from '@/components/ui/fade-in.jsx'

/**
 * @param {{
 *   label: string,
 *   value: import('react').ReactNode,
 *   icon?: import('react').ReactNode,
 *   tone?: 'default' | 'success' | 'danger',
 *   hint?: string,
 *   className?: string,
 *   delay?: number,
 * }} props
 */
export function SummaryStatCard({
  label,
  value,
  icon,
  tone = 'default',
  hint,
  className,
  delay = 0,
}) {
  return (
    <FadeIn
      delay={delay}
      className={cn(
        'acsis-summary-stat acsis-card-surface',
        tone !== 'default' && `acsis-summary-stat--${tone}`,
        className,
      )}
    >
      <div className="acsis-summary-stat__body">
        <span className="acsis-summary-stat__label">{label}</span>
        <span className="acsis-summary-stat__value">{value}</span>
        {hint ? <span className="acsis-summary-stat__hint">{hint}</span> : null}
      </div>
      {icon ? <div className="acsis-summary-stat__icon">{icon}</div> : null}
    </FadeIn>
  )
}

/**
 * @param {{ children: import('react').ReactNode, columns?: 3 | 4, className?: string }} props
 */
export function SummaryStatGrid({ children, columns = 3, className }) {
  const scrollRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const childCount = Children.count(children)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 1) {
      setAtStart(true)
      setAtEnd(true)
      return
    }
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft >= maxScroll - 2)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return undefined

    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateScrollState)
      : null
    ro?.observe(el)
    window.addEventListener('resize', updateScrollState)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro?.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState, childCount])

  return (
    <div
      className={cn(
        'acsis-summary-stats-wrap',
        atStart && 'is-at-start',
        atEnd && 'is-at-end',
        className,
      )}
    >
      <div className="acsis-summary-stats-fade acsis-summary-stats-fade--start" aria-hidden="true" />
      <div className="acsis-summary-stats-fade acsis-summary-stats-fade--end" aria-hidden="true" />

      <div
        ref={scrollRef}
        className={cn('acsis-summary-stats', columns === 4 && 'acsis-summary-stats--4')}
        role="region"
        aria-label="Summary statistics"
      >
        {children}
      </div>
    </div>
  )
}
