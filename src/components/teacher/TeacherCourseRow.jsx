import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

/**
 * @param {{ course: { id: string|number, courseCode?: string, name?: string } }} props
 */
export default function TeacherCourseRow({ course }) {
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
    <li className="acsis-course-row">
      <button type="button" className="acsis-course-row__btn" onClick={open}>
        <span className="acsis-course-row__text">
          <span className="acsis-course-row__code">{primary}</span>
          {secondary ? <span className="acsis-course-row__name">{secondary}</span> : null}
        </span>
        <span className="acsis-course-row__hint">Exams</span>
        <ChevronRight className="acsis-course-row__chev" size={18} strokeWidth={2} aria-hidden />
      </button>
    </li>
  )
}
