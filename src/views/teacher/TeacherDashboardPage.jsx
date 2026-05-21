import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, FileText, Users } from 'lucide-react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { apiFetch } from '@/lib/apiFetch.js'

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeExams: 0,
    totalStudents: 0
  })

  useEffect(() => {
    apiFetch('/api/teacher/classes/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data)
        }
      })
      .catch(console.error)
  }, [])

  const { totalClasses, activeExams, totalStudents } = stats

  return (
    <div className="acsis-view">
      <SummaryStatGrid>
        <SummaryStatCard
          label="My Classes"
          value={totalClasses}
          tone="success"
          icon={<FileText width={28} height={28} strokeWidth={1.5} aria-hidden />}
        />
        <SummaryStatCard
          label="Active Exams"
          value={activeExams}
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
