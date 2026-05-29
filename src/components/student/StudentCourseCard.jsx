import { useNavigate } from 'react-router-dom'
import { formatCourseDisplayLabels } from '@/lib/sectionLabel.js'
import ClassCourseHeader from '@/components/classes/ClassCourseHeader.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'

/**
 * @param {{
 *   course: {
 *     id: string|number,
 *     courseCode?: string,
 *     name?: string,
 *     academicYear?: string,
 *     semester?: string,
 *     instructorName?: string,
 *     headerPattern?: string,
 *     exams?: object[],
 *   },
 *   delay?: number,
 * }} props
 */
export default function StudentCourseCard({ course, delay = 0 }) {
  const navigate = useNavigate()
  const { primary, secondary } = formatCourseDisplayLabels(course)
  const examCount = (course.exams || []).length
  const instructor = (course.instructorName || '').trim() || 'Instructor'
  const path = `/student/my-classes/${encodeURIComponent(course.id)}`
  const showName = secondary && secondary !== primary

  function open() {
    navigate(path)
  }

  return (
    <FadeIn as="li" delay={delay} className="stu-course-card-wrap">
      <article
        className="stu-course-card"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
        aria-label={`${primary}${showName ? `, ${secondary}` : ''}. Instructor: ${instructor}`}
      >
        <ClassCourseHeader course={course} size="card" as="div" />

        <div className="stu-course-card__footer">
          <span className="stu-course-card__instructor-label">Instructor</span>
          <span className="stu-course-card__instructor">{instructor}</span>
          <span className="stu-course-card__meta">
            {examCount} {examCount === 1 ? 'exam' : 'exams'} posted
          </span>
        </div>
      </article>
    </FadeIn>
  )
}
