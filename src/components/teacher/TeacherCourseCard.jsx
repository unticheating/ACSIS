import { useNavigate } from 'react-router-dom'
import FadeIn from '@/components/ui/fade-in.jsx'

/**
 * @param {{ course: { id: string|number, courseCode?: string, name?: string, enrollmentCount?: number }, dimmed?: boolean, delay?: number }} props
 */
export default function TeacherCourseCard({ course, dimmed = false, delay = 0 }) {
  const navigate = useNavigate()
  const code = (course.courseCode || '').trim()
  const name = (course.name || '').trim()
  const primary = code || name || 'Course'
  const secondary = code && name && name !== code ? name : null
  const path = `/teacher/my-classes/${encodeURIComponent(course.id)}`

  function open() {
    navigate(path)
  }

  return (
    <FadeIn as="li" delay={delay}>
      <article
        className={`acsis-course-card acsis-card-surface${dimmed ? ' acsis-course-card--dimmed' : ''}`}
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
          <h3 className="acsis-course-card__code">{primary}</h3>
          {secondary ? <p className="acsis-course-card__name">{secondary}</p> : null}
        </div>
        <div className="acsis-course-card__footer">
          <span className="acsis-course-card__stat">
            {Number(course.enrollmentCount ?? 0)}{' '}
            {Number(course.enrollmentCount ?? 0) === 1 ? 'student' : 'students'}
          </span>
          <span className="acsis-course-card__status">View exams</span>
        </div>
      </article>
    </FadeIn>
  )
}
