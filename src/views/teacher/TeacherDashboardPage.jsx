import { useEffect, useState } from 'react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import AnimatedHoverIcon from '@/components/icons/AnimatedHoverIcon.jsx'
import { BookIcon, ChartBarIcon, UsersIcon } from '@/components/icons/hoverIcons.js'
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
          icon={<AnimatedHoverIcon icon={BookIcon} size={28} strokeWidth={1.5} />}
        />
        <SummaryStatCard
          label="Active Exams"
          value={activeExams}
          tone="success"
          icon={<AnimatedHoverIcon icon={ChartBarIcon} size={28} strokeWidth={1.5} />}
        />
        <SummaryStatCard
          label="Total Students"
          value={totalStudents}
          tone="success"
          icon={<AnimatedHoverIcon icon={UsersIcon} size={28} strokeWidth={1.5} />}
        />
      </SummaryStatGrid>
    </div>
  )
}
