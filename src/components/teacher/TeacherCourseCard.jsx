import { useNavigate } from 'react-router-dom'
import { coerceRouteParam } from '@/lib/coerceDisplay.js'
import { formatCourseDisplayLabels } from '@/lib/sectionLabel.js'
import ClassCourseHeader from '@/components/classes/ClassCourseHeader.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'

/**
 * Compact list-row course card for section dropdowns (My Classes).
 * @param {{
 *   course: {
 *     id: string|number,
 *     courseCode?: string,
 *     name?: string,
 *     enrollmentCount?: number,
 *     headerPattern?: string,
 *     headerColor?: string | null,
 *   },
 *   dimmed?: boolean,
 *   delay?: number,
 * }} props
 */
export default function TeacherCourseCard({ course, dimmed = false, delay = 0 }) {
  const navigate = useNavigate()
  const { primary, secondary } = formatCourseDisplayLabels(course)
  const showName = Boolean(secondary && secondary !== primary)
  const path = `/teacher/my-classes/${coerceRouteParam(course.id)}`
  const count = Number(course.enrollmentCount ?? 0)

  function open() {
    navigate(path)
  }

  return (
    <FadeIn as="li" delay={delay}>
      <article
        className={`acsis-teacher-course-card acsis-teacher-course-card--row${dimmed ? ' acsis-teacher-course-card--dimmed' : ''}`}
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
        aria-label={`${primary}${showName ? `. ${secondary}` : ''}. ${count} ${count === 1 ? 'student' : 'students'}. View exams`}
      >
        <ClassCourseHeader course={course} size="strip" as="div" />
        <div className="acsis-teacher-course-card__main">
          <h3 className="acsis-teacher-course-card__code">{primary}</h3>
          {showName ? <p className="acsis-teacher-course-card__name">{secondary}</p> : null}
        </div>
        <div className="acsis-teacher-course-card__aside">
          <span className="acsis-teacher-course-card__stat">
            {count} {count === 1 ? 'student' : 'students'}
          </span>
          <span className="acsis-teacher-course-card__cta">View exams</span>
        </div>
      </article>
    </FadeIn>
  )
}
