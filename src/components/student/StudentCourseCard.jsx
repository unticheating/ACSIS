import { useNavigate } from 'react-router-dom'
import { formatCourseDisplayLabels, formatTermPeriod } from '@/lib/sectionLabel.js'
import FadeIn from '@/components/ui/fade-in.jsx'

/**
 * @param {{ course: { id: string|number, courseCode?: string, name?: string, academicYear?: string, semester?: string, exams?: object[] }, delay?: number }} props
 */
export default function StudentCourseCard({ course, delay = 0 }) {
  const navigate = useNavigate()
  const { primary, secondary } = formatCourseDisplayLabels(course)
  const period = formatTermPeriod(course)
  const examCount = (course.exams || []).length
  const path = `/student/my-classes/${encodeURIComponent(course.id)}`

  function open() {
    navigate(path)
  }

  return (
    <FadeIn as="li" delay={delay}>
      <article
        className="acsis-course-card acsis-card-surface"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
      >
        <div className="acsis-course-card__accent" aria-hidden />
        <div className="acsis-course-card__body">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{primary}</h3>
          {secondary ? <p className="text-sm text-muted-foreground mt-1.5">{secondary}</p> : null}
          {period ? <p className="text-xs text-muted-foreground/80 mt-1">{period}</p> : null}
        </div>
        <div className="acsis-course-card__footer">
          <span className="acsis-course-card__stat">
            {examCount} {examCount === 1 ? 'exam' : 'exams'} posted
          </span>
          <span className="acsis-course-card__status">View exams</span>
        </div>
      </article>
    </FadeIn>
  )
}
