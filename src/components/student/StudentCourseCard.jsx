import { useNavigate } from 'react-router-dom'
import { formatCourseDisplayLabels, formatTermPeriod } from '@/lib/sectionLabel.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'

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
    <FadeIn as="li" delay={delay} className="h-full min-w-0">
      <Card
        className="relative h-full flex flex-col cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
        onClick={open}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg leading-tight line-clamp-2">{primary}</CardTitle>
          {secondary ? <CardDescription className="line-clamp-1 mt-1.5">{secondary}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          {period ? <p className="text-sm text-muted-foreground">{period}</p> : null}
        </CardContent>
        <CardFooter className="pt-0 border-t border-border mt-auto px-6 py-3 bg-muted/20">
          <div className="flex items-center justify-between w-full gap-2 min-w-0">
            <span className="text-sm text-muted-foreground truncate">
              {examCount} {examCount === 1 ? 'exam' : 'exams'} posted
            </span>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
              View exams
            </span>
          </div>
        </CardFooter>
      </Card>
    </FadeIn>
  )
}
