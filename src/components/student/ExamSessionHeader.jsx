import PlpLogo from '@/components/brand/PlpLogo.jsx'
import { cn } from '@/lib/utils'

/**
 * @param {{ title: string, className?: string, titleClassName?: string, children?: import('react').ReactNode }} props
 */
export function ExamSessionHeader({ title, className, titleClassName, children }) {
  return (
    <header className={cn('exam-chrome relative', className)}>
      <div className="exam-logo relative z-10" aria-hidden>
        <PlpLogo className="exam-logo-img" width={28} height={28} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16">
        <h1 className={cn('exam-title-bar truncate', titleClassName)}>{title}</h1>
      </div>
      <div className="relative z-10 ml-auto flex items-center">
        {children}
      </div>
    </header>
  )
}
