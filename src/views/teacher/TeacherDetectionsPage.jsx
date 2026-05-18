import { useEffect, useState } from 'react'
import { getAllExamsWithClassMeta } from '@/lib/classesExams.js'
import '../../pages/teacher-ui/detections.css'

export default function TeacherDetectionsPage() {
  const [seconds, setSeconds] = useState(0)
  const [activeExam, setActiveExam] = useState(null)
  
  // DEVS: Populate this state array with live data via WebSocket or Polling API
  // Expected object structure: { id, firstName, lastName, schoolId, progress, status }
  const [activeSessions, setActiveSessions] = useState([]) 

  // Fetch the currently active exam on mount
  useEffect(() => {
    const exams = getAllExamsWithClassMeta()
    const currentLiveExam = exams.find(e => (e.status || '').toLowerCase() === 'active')
    setActiveExam(currentLiveExam || null)
  }, [])

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (totalSeconds) => {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const s = String(totalSeconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  if (!activeExam) {
    return (
      <div className="acsis-view">
        <div className="acsis-empty-panel" style={{ marginTop: '40px' }}>
          <h2>No Active Exams</h2>
          <p>Activate an exam from the 'My Exams' or 'My Classes' page to begin live monitoring.</p>
        </div>
      </div>
    )
  }

  // Calculate stats based on live sessions
  const stillAnswering = activeSessions.filter(s => s.status !== 'submitted').length
  const completed = activeSessions.filter(s => s.status === 'submitted').length

  return (
    <div className="acsis-view">
      <div className="container" style={{ padding: 0 }}>
        
        {/* Stats Row */}
        <div className="stats-grid-4">
          <div className="stat-card">
            <span className="stat-title">Still Answering</span>
            <span className="stat-value">{stillAnswering}</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Completed</span>
            <span className="stat-value">{completed}</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Highest Score</span>
            <span className="stat-value text-gray-400 text-lg mt-2">Pending...</span>
            <div className="stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-title">Timer</span>
            <span className="stat-value">{formatTime(seconds)}</span>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="panel">
          <div className="panel-header">
            <svg className="panel-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span className="panel-title">Alerts</span>
          </div>
          <div className="empty-alerts">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>Waiting for violation reports...</p>
          </div>
        </div>

        {/* Live Status Section */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Live Status: {activeExam.title}</span>
          </div>
          
          {activeSessions.length === 0 ? (
            <p className="text-sm text-gray-500 mt-4">Waiting for students to join...</p>
          ) : (
            <div className="live-status-grid">
              {activeSessions.map((student) => {
                const isSubmitted = student.status === 'submitted'
                return (
                  <div key={student.id} className="student-card">
                    <div className="student-card-top">
                      <div>
                        <h4 className="student-name">{student.firstName} {student.lastName}</h4>
                        <p className="student-id">{student.schoolId}</p>
                      </div>
                    </div>
                    <div className="progress-container">
                      <div className="progress-header">
                        <span>Progress</span>
                        <span>{student.progress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${student.progress}%` }}></div>
                      </div>
                    </div>
                    <span className={`status-pill ${isSubmitted ? 'pill-submitted' : 'pill-progress'}`}>
                      {isSubmitted ? 'Submitted' : 'In Progress'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}