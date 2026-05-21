import { Link } from 'react-router-dom'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import '../../pages/admin-ui/style.css'

const demoExams = [
  {
    name: 'INFOSEC QUIZ #1',
    by: 'JUANITO P. ALVAREZ JR.',
    timer: '34:23',
    sub: 'started less than a minute ago',
    done: '0 / 35 Done',
  },
  {
    name: 'INFOSEC QUIZ #2',
    by: 'JUANITO P. ALVAREZ JR.',
    timer: '34:23',
    sub: 'started less than a minute ago',
    done: '0 / 35 Done',
  },
]

const demoDetected = [
  {
    id: 1,
    strikes: 3,
    name: 'RICHELLE DOROTHY BENITEZ',
    exam: 'INFOSEC QUIZ #1',
    sub: 'Flagged Positive by JUANITO ALVAREZ',
  },
  {
    id: 2,
    strikes: 1,
    name: 'REX NAVARRO JR',
    exam: 'INFOSEC QUIZ #1',
    sub: 'Warned',
  },
]

export default function AdminDashboardPage({ basePath = '/admin' }) {
  function ticketViolation(id) {
    if (window.confirm('Issue a ticket violation for this student?')) {
      window.alert(`Ticket issued for student ID: ${id}`)
    }
  }

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Dashboard</span>
        </div>
      </div>

      <div className="content-body">
        <SummaryStatGrid>
          <SummaryStatCard label="On-Going Examinations" value={0} tone="success" />
          <SummaryStatCard label="Total Examinations" value={0} tone="success" />
          <SummaryStatCard label="Detected Students" value={0} tone="danger" />
        </SummaryStatGrid>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">On-Going Examinations</span>
            <Link to={`${basePath}/classes`} className="panel-view-all">
              View All
            </Link>
          </div>
          <div className="exam-list">
            {demoExams.map((exam) => (
              <div key={exam.name} className="exam-item">
                <div className="exam-info">
                  <div className="exam-name">{exam.name}</div>
                  <div className="exam-by">{exam.by}</div>
                </div>
                <div className="exam-timer-wrap">
                  <div className="exam-timer">{exam.timer}</div>
                  <div className="exam-timer-sub">{exam.sub}</div>
                </div>
                <div className="exam-progress">{exam.done}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Detected Students</span>
            <Link to={`${basePath}/violations`} className="panel-view-all">
              View All
            </Link>
          </div>
          <div className="detected-list">
            {demoDetected.map((student) => (
              <div key={student.id} className="detected-item">
                <div className="detected-info">
                  <div className="detected-name">
                    {student.strikes} — {student.name}
                  </div>
                  <div className="detected-sub">
                    {student.exam} · {student.sub}
                  </div>
                </div>
                <button type="button" className="view-info-link" onClick={() => ticketViolation(student.id)}>
                  Issue ticket
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
