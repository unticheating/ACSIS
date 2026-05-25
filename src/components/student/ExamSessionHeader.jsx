import PlpLogo from '@/components/brand/PlpLogo.jsx'
import { cn } from '@/lib/utils'

/**
 * @param {{ title: string, className?: string, titleClassName?: string, children?: import('react').ReactNode }} props
 */
export function ExamSessionHeader({ title, className, titleClassName, children }) {
  return (
    <header className={cn('exam-chrome', className)}>
      <div className="exam-logo" aria-hidden>
        <PlpLogo className="exam-logo-img" width={28} height={28} />
      </div>
      <h1 className={cn('exam-title-bar truncate', titleClassName)}>{title}</h1>
      {children}
    </header>
  )
}
