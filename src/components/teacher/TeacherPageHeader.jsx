import { cn } from '@/lib/utils.js'
import { type } from '@/lib/typography.js'

/**
 * @param {{ title: string, meta?: string, actions?: import('react').ReactNode, footer?: import('react').ReactNode }} props
 */
export default function TeacherPageHeader({ title, meta, actions, footer }) {
  return (
    <header className="acsis-mc-page-header">
      <div className="acsis-mc-page-header__row">
        <div className="acsis-mc-page-header__intro">
          <h1 className={cn(type.pageTitle, 'mb-1.5')}>{title}</h1>
          {meta ? <p className={type.pageMeta}>{meta}</p> : null}
        </div>
        {actions ? <div className="acsis-mc-page-header__actions">{actions}</div> : null}
      </div>
      {footer ? <div className="acsis-mc-page-header__footer">{footer}</div> : null}
    </header>
  )
}
