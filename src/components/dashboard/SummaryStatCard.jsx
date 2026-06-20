import { Children, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [isMobile, setIsMobile] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
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

    // Determine active card index by which card is most centered
    const cards = Array.from(el.children)
    const center = el.scrollLeft + el.clientWidth / 2
    let closest = 0
    let minDist = Infinity
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(cardCenter - center)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    })
    setActiveIndex(closest)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 767)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
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

  const scrollToCard = useCallback((index) => {
    const el = scrollRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(childCount - 1, index))
    const cards = Array.from(el.children)
    const card = cards[clamped]
    if (!card) return
    // Center the card within the scroll container
    const cardCenter = card.offsetLeft + card.offsetWidth / 2
    const scrollTarget = cardCenter - el.clientWidth / 2
    el.scrollTo({ left: scrollTarget, behavior: 'smooth' })
    setActiveIndex(clamped)
  }, [childCount])

  const goPrev = useCallback(() => scrollToCard(activeIndex - 1), [activeIndex, scrollToCard])
  const goNext = useCallback(() => scrollToCard(activeIndex + 1), [activeIndex, scrollToCard])

  const showPrev = isMobile && !atStart
  const showNext = isMobile && !atEnd

  return (
    <div
      className={cn(
        'acsis-summary-stats-wrap',
        atStart && 'is-at-start',
        atEnd && 'is-at-end',
        className,
      )}
    >
      {/* Fade edge indicators (desktop only via CSS) */}
      <div className="acsis-summary-stats-fade acsis-summary-stats-fade--start" aria-hidden="true" />
      <div className="acsis-summary-stats-fade acsis-summary-stats-fade--end" aria-hidden="true" />

      {/* Left chevron — mobile only, icon-only, full card height */}
      {showPrev && (
        <button
          type="button"
          className="acsis-stat-chevron acsis-stat-chevron--prev"
          onClick={goPrev}
          aria-label="Previous stat"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn('acsis-summary-stats', columns === 4 && 'acsis-summary-stats--4')}
        role="region"
        aria-label="Summary statistics"
      >
        {children}
      </div>

      {/* Right chevron — mobile only, icon-only, full card height */}
      {showNext && (
        <button
          type="button"
          className="acsis-stat-chevron acsis-stat-chevron--next"
          onClick={goNext}
          aria-label="Next stat"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Carousel Dots - Mobile only */}
      {isMobile && childCount > 1 && (
        <div className="acsis-stat-dots">
          {Array.from({ length: childCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={cn("acsis-stat-dot", i === activeIndex && "is-active")}
              aria-label={`Go to stat ${i + 1}`}
              onClick={() => scrollToCard(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
