import { useEffect, useState, useMemo } from 'react'
import { getAllExamsWithClassMeta } from '@/lib/classesExams.js'
import '../../pages/teacher-ui/reports.css'

export default function TeacherReportsPage() {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [activeTab, setActiveTab] = useState('detailed')
  const [allExams, setAllExams] = useState([])

  // DEVS: Populate these states based on the selectedExamId
  const [reportDetails, setReportDetails] = useState([]) // Student detailed performance
  const [violations, setViolations] = useState([]) // List of cheating logs

  // Fetch all exams from local storage/backend on mount
  useEffect(() => {
    const exams = getAllExamsWithClassMeta()
    // Optional: Filter to only show 'Completed' or 'Closed' exams
    // const closedExams = exams.filter(e => e.status.toLowerCase() === 'closed')
    setAllExams(exams)
  }, [])

  // DEVS: Trigger data fetch when an exam is selected
  useEffect(() => {
    if (selectedExamId) {
      // fetchReportData(selectedExamId).then(data => setReportDetails(data))
      // fetchViolations(selectedExamId).then(data => setViolations(data))
    }
  }, [selectedExamId])

  const handleExport = (format) => {
    window.alert(`Preparing ${format} download. The file will be saved shortly.`)
    // DEVS: Connect to backend export API here
  }

  const handleChangeExam = () => {
    setSelectedExamId('') 
    setActiveTab('detailed') 
  }

  const currentExam = useMemo(() => {
    return allExams.find(e => String(e.id) === String(selectedExamId))
  }, [allExams, selectedExamId])

  return (
    <div className="acsis-view">
      <div className="container" style={{ padding: 0 }}>
        
        {/* VIEW 1: EXAM SELECTION PANEL */}
        {!currentExam && (
          <div className="panel" style={{ maxWidth: '100%', marginBottom: '24px' }}>
            <div className="report-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
                Performance Report
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                Select an exam to view detailed performance report with scores and violations.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '800px' }}>
              <label htmlFor="exam-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                Select Exam
              </label>
              <select
                id="exam-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="">Choose an exam...</option>
                {allExams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title || 'Untitled Exam'} ({exam.classGroup?.name || 'No Class'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* VIEW 2: DETAILED REPORT PANEL */}
        {currentExam && (
          <>
            {/* Top Context and Controls Card */}
            <div className="panel">
              <div className="exam-title-row">
                <div>
                  <h2>{currentExam.title}</h2>
                  <p>{currentExam.classGroup?.name} • {currentExam.questionCount} questions</p>
                </div>
                <button className="btn-ghost-text" onClick={handleChangeExam}>Change Exam</button>
              </div>
              
              <div className="tabs-and-actions-row">
                <div className="tabs-group">
                  <button 
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('summary')}
                  >
                    Summary
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'violations' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('violations')}
                  >
                    Violations
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'detailed' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('detailed')}
                  >
                    Detailed
                  </button>
                </div>
                
                <div className="action-group">
                  <button className="btn-action btn-blue" onClick={() => handleExport('CSV')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download CSV
                  </button>
                  <button className="btn-action btn-green" onClick={() => handleExport('PDF')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Content Areas */}
            {activeTab === 'summary' && (
              <div className="tab-panel active panel">
                <div className="report-header">
                  <h3>Summary Report</h3>
                  <p>{currentExam.title}</p>
                </div>
                <p className="text-gray">Overview metrics will appear here.</p>
              </div>
            )}

            {activeTab === 'violations' && (
              <div className="tab-panel active panel">
                <div className="report-header">
                  <h3>Violations Report</h3>
                  <p>{currentExam.title}</p>
                </div>
                
                <div className="violation-alert-box">
                  <div className="alert-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Total Violations Detected
                  </div>
                  <div className="alert-count">{violations.length}</div>
                  <div className="alert-sub">Waiting for violation data...</div>
                </div>
              </div>
            )}

            {activeTab === 'detailed' && (
              <div className="tab-panel active panel">
                <div className="report-header">
                  <h3>Detailed Performance Report</h3>
                  <p>{currentExam.title}</p>
                </div>

                {reportDetails.length === 0 ? (
                  <p className="text-sm text-gray-500">No student submissions available for this exam yet.</p>
                ) : (
                  reportDetails.map((student, idx) => (
                    <div key={idx} className="student-detail-card">
                      {/* DEVS: Map real student data here using the layout classes provided in CSS */}
                      <p>Student card placeholder</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}