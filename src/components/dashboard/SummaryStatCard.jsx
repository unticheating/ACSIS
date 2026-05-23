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
  return (
    <div
      className={cn('acsis-summary-stats', columns === 4 && 'acsis-summary-stats--4', className)}
    >
      {children}
    </div>
  )
}
