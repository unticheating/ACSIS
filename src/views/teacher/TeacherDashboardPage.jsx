import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, FileText, Users } from 'lucide-react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { CLASSES_CHANGED_EVENT, CLASSES_STORAGE_KEY, getAllExamsWithClassMeta } from '../../lib/classesExams.js'

export default function TeacherDashboardPage() {
  const [exams, setExams] = useState(() => getAllExamsWithClassMeta())

  const refresh = useCallback(() => {
    setExams(getAllExamsWithClassMeta())
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CLASSES_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(CLASSES_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CLASSES_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  const total = exams.length
  const active = exams.filter((e) => (e.status || '').toLowerCase() === 'active').length
  const totalStudents = 1

  return (
    <div className="acsis-view">
      <SummaryStatGrid>
        <SummaryStatCard
          label="My Classes"
          value={total}
          tone="success"
          icon={<FileText width={28} height={28} strokeWidth={1.5} aria-hidden />}
        />
        <SummaryStatCard
          label="Active Exams"
          value={active}
          tone="success"
          icon={<ClipboardList width={28} height={28} strokeWidth={1.5} aria-hidden />}
        />
        <SummaryStatCard
          label="Total Students"
          value={totalStudents}
          tone="success"
          icon={<Users width={28} height={28} strokeWidth={1.5} aria-hidden />}
        />
      </SummaryStatGrid>
    </div>
  )
}
