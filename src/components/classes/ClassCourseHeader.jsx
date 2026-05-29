import { formatCourseDisplayLabels, formatTermPeriod } from '@/lib/sectionLabel.js'
import { normalizeHeaderPattern } from '@/lib/classCardPatterns.js'
import { headerColorStyle } from '@/lib/classHeaderColor.js'

/**
 * @param {{
 *   course: {
 *     courseCode?: string,
 *     name?: string,
 *     academicYear?: string,
 *     semester?: string,
 *     headerPattern?: string,
 *     headerColor?: string | null,
 *   },
 *   headerPattern?: string,
 *   headerColor?: string | null,
 *   size?: 'banner' | 'card' | 'strip',
 *   menu?: import('react').ReactNode,
 *   extra?: import('react').ReactNode,
 *   footer?: import('react').ReactNode,
 *   className?: string,
 *   as?: 'section' | 'div',
 * }} props
 */
export default function ClassCourseHeader({
  course,
  headerPattern,
  headerColor,
  size = 'banner',
  menu = null,
  extra = null,
  footer = null,
  className = '',
  as: Tag = 'section',
}) {
  const pattern = normalizeHeaderPattern(headerPattern ?? course?.headerPattern)
  const color = headerColor !== undefined ? headerColor : course?.headerColor
  const { primary, secondary } = formatCourseDisplayLabels(course)
  const period = formatTermPeriod(course)
  const TitleTag = size === 'banner' ? 'h1' : 'h3'
  const showName = secondary && secondary !== primary

  if (size === 'strip') {
    return (
      <Tag
        className={`acsis-class-header acsis-class-header--strip ${className}`.trim()}
        data-pattern={pattern}
        style={headerColorStyle(color)}
        aria-hidden
      >
        <div className="acsis-class-header__pattern" data-pattern={pattern} aria-hidden />
        <div className="acsis-class-header__wash" aria-hidden />
        <div className="acsis-class-header__vignette" aria-hidden />
      </Tag>
    )
  }

  return (
    <Tag
      className={`acsis-class-header acsis-class-header--${size} acsis-course-banner ${className}`.trim()}
      data-pattern={pattern}
      style={headerColorStyle(color)}
      aria-label={size === 'banner' ? 'Course details' : undefined}
    >
      <div className="acsis-class-header__pattern" data-pattern={pattern} aria-hidden />
      <div className="acsis-class-header__wash" aria-hidden />
      <div className="acsis-class-header__vignette" aria-hidden />
      {menu ? <div className="acsis-course-banner__menu">{menu}</div> : null}
      <div className="acsis-class-header__bottom-row acsis-course-banner__bottom-row">
        <div className="acsis-class-header__copy">
          <TitleTag className="acsis-class-header__code acsis-course-banner__code">{primary}</TitleTag>
          {showName ? (
            <p className="acsis-class-header__name acsis-course-banner__name">{secondary}</p>
          ) : null}
          {period ? (
            <p className="acsis-class-header__period acsis-course-banner__period">{period}</p>
          ) : null}
        </div>
        {extra}
      </div>
      {footer}
    </Tag>
  )
}
