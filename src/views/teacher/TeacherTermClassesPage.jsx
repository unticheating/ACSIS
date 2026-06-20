import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageSpinner from '@/components/ui/page-spinner.jsx'

/** Legacy section URL — fold into My Classes accordion instead of an extra page. */
export default function TeacherTermClassesPage() {
  const { sectionId, termId } = useParams()
  const resolvedTermId = sectionId || termId
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/teacher/my-classes', {
      replace: true,
      state: { expandSectionId: resolvedTermId },
    })
  }, [navigate, resolvedTermId])

  return (
    <div className="acsis-mc-view acsis-view">
      <PageSpinner label="Opening section…" />
    </div>
  )
}
