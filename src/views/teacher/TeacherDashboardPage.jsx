import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, FileText, Users } from 'lucide-react'
import { CLASSES_CHANGED_EVENT, CLASSES_STORAGE_KEY, getAllExamsWithClassMeta } from '../../lib/classesExams.js'
import '../../pages/teacher-ui/teacher_dashboard.css'

function StatCard({ label, value, children }) {
  return (
    <div className="stat-card">
      <div className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
      </div>
      <div className="stat-card-icon">{children}</div>
    </div>
  )
}

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
    <div className="acsis-view td-dashboard">
      <div className="stats-grid">
        <StatCard label="My Classes" value={total}>
          <FileText width={28} height={28} strokeWidth={1.5} aria-hidden />
        </StatCard>
        <StatCard label="Active Exams" value={active}>
          <ClipboardList width={28} height={28} strokeWidth={1.5} aria-hidden />
        </StatCard>
        <StatCard label="Total Students" value={totalStudents}>
          <Users width={28} height={28} strokeWidth={1.5} aria-hidden />
        </StatCard>
      </div>
    </div>
  )
}
