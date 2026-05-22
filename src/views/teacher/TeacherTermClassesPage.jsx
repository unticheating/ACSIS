import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
    <div className="acsis-mc-view acsis-mc-view--full acsis-view">
      <p className="acsis-mc-loading">Opening section…</p>
    </div>
  )
}
