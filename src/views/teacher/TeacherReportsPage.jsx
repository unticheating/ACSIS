import { useEffect, useState, useMemo } from 'react'
import { fetchTeacherExamResults, fetchTeacherReportExams } from '@/lib/teacherExamResultsApi.js'
import '../../pages/teacher-ui/reports.css'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

export default function TeacherReportsPage() {
  const [selectedExamId, setSelectedExamId] = useState('')
  const [activeTab, setActiveTab] = useState('detailed')
  const [allExams, setAllExams] = useState([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [violations, setViolations] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingExams(true)
      try {
        const exams = await fetchTeacherReportExams()
        if (!cancelled) setAllExams(exams)
      } catch (err) {
        if (!cancelled) setAllExams([])
        console.error(err)
      } finally {
        if (!cancelled) setLoadingExams(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const currentExam = useMemo(() => {
    return allExams.find((e) => String(e.id) === String(selectedExamId))
  }, [allExams, selectedExamId])

  useEffect(() => {
    if (!currentExam?.classId || !currentExam?.id) {
      setStats(null)
      setSessions([])
      setViolations([])
      return undefined
    }

    let cancelled = false
    async function loadReport() {
      setLoadingReport(true)
      setReportError(null)
      try {
        const data = await fetchTeacherExamResults(currentExam.classId, currentExam.id)
        if (cancelled) return
        setStats(data.stats || null)
        setSessions(data.sessions || [])
        setViolations(data.violations || [])
      } catch (err) {
        if (!cancelled) {
          setReportError(err instanceof Error ? err.message : 'Failed to load report.')
          setStats(null)
          setSessions([])
          setViolations([])
        }
      } finally {
        if (!cancelled) setLoadingReport(false)
      }
    }

    loadReport()
    const interval = window.setInterval(loadReport, 8000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [currentExam?.classId, currentExam?.id])

  const handleExport = (format) => {
    window.alert(`Preparing ${format} download. The file will be saved shortly.`)
  }

  const handleChangeExam = () => {
    setSelectedExamId('')
    setActiveTab('detailed')
  }

  const submittedSessions = sessions.filter((s) => s.status === 'submitted')
  const avgScore =
    submittedSessions.filter((s) => s.percentage != null).length > 0
      ? Math.round(
          submittedSessions.reduce((sum, s) => sum + Number(s.percentage || 0), 0) /
            submittedSessions.filter((s) => s.percentage != null).length,
        )
      : null

  return (
    <div className="acsis-view reports-page">
      <div className="container" style={{ padding: 0 }}>
        {!currentExam && (
          <div className="panel" style={{ maxWidth: '100%', marginBottom: '24px' }}>
            <div className="report-header" style={{ marginBottom: '20px' }}>
              <h3 className="text-xl font-bold text-foreground m-0 mb-1.5">Performance Report</h3>
              <p className="text-sm text-muted-foreground m-0">
                Select an exam to view scores and violations from the database.
              </p>
            </div>

            <div className="flex flex-col gap-2 max-w-[800px]">
              <label htmlFor="exam-select" className="text-sm font-semibold text-foreground">
                Select Exam
              </label>
              <select
                id="exam-select"
                className="acsis-reports-exam-select flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                disabled={loadingExams}
              >
                <option value="">Choose an exam...</option>
                {allExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title || 'Untitled Exam'} ({exam.className || 'Class'}) — {exam.submittedCount ?? 0}{' '}
                    submitted
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {currentExam && (
          <>
            <div className="panel">
              <div className="exam-title-row">
                <div>
                  <h2>{currentExam.title}</h2>
                  <p>
                    {currentExam.className} · {stats ? `${stats.submitted}/${stats.enrolled} submitted` : 'Loading…'}
                  </p>
                </div>
                <button type="button" className="btn-ghost-text" onClick={handleChangeExam}>
                  Change Exam
                </button>
              </div>

              <div className="tabs-and-actions-row">
                <div className="tabs-group">
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'violations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('violations')}
                  >
                    Violations
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeTab === 'detailed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detailed')}
                  >
                    Detailed
                  </button>
                </div>

                <div className="action-group">
                  <button type="button" className="btn-action btn-blue" onClick={() => handleExport('CSV')}>
                    Download CSV
                  </button>
                  <button type="button" className="btn-action btn-green" onClick={() => handleExport('PDF')}>
                    Print PDF
                  </button>
                </div>
              </div>
            </div>

            {reportError ? (
              <p className="text-sm text-red-600 px-1" role="alert">
                {reportError}
              </p>
            ) : null}
            {loadingReport && !stats ? (
              <p className="text-sm text-gray-500 px-1">Loading report data…</p>
            ) : null}

            {activeTab === 'summary' && (
              <div className="tab-panel active panel">
                <div className="report-header">
                  <h3>Summary Report</h3>
                  <p>{currentExam.title}</p>
                </div>
                {stats ? (
                  <div className="sdc-stats" style={{ maxWidth: 520 }}>
                    <div className="sdc-stat">
                      <div className="stat-val">{stats.enrolled}</div>
                      <div className="stat-lbl">Enrolled</div>
                    </div>
                    <div className="sdc-stat">
                      <div className="stat-val">{stats.joined}</div>
                      <div className="stat-lbl">Joined</div>
                    </div>
                    <div className="sdc-stat">
                      <div className="stat-val text-green">{stats.submitted}</div>
                      <div className="stat-lbl">Submitted</div>
                    </div>
                    <div className="sdc-stat">
                      <div className="stat-val">{avgScore != null ? `${avgScore}%` : '—'}</div>
                      <div className="stat-lbl">Class average</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray">No summary data yet.</p>
                )}
              </div>
            )}

            {activeTab === 'violations' && (
              <div className="tab-panel active panel">
                <div className="report-header">
                  <h3>Violations Report</h3>
                  <p>{currentExam.title}</p>
                </div>

                <div className="violation-alert-box">
                  <div className="alert-title">Total Violations Detected</div>
                  <div className="alert-count">{violations.length}</div>
                  <div className="alert-sub">From proctoring logs for this exam</div>
                </div>

                {violations.length === 0 ? (
                  <p className="text-sm text-gray-500">No violations logged for this exam.</p>
                ) : (
                  <ul className="space-y-2">
                    {violations.map((v) => (
                      <li
                        key={v.id}
                        className="text-sm border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-wrap justify-between gap-2"
                      >
                        <span>
                          <strong>{v.studentName}</strong> ({v.schoolId || '—'}) — {v.eventType}
                          {v.details ? `: ${v.details}` : ''}
                        </span>
                        <span className="text-gray-500">{formatDate(v.occurredAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'detailed' && (
              <div className="tab-panel active panel">
                <div className="report-header">
                  <h3>Detailed Performance Report</h3>
                  <p>{currentExam.title}</p>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No student sessions yet. Students must join and submit the exam.</p>
                ) : (
                  sessions.map((student) => (
                    <div key={student.sessionId} className="student-detail-card">
                      <div className="sdc-header">
                        <div className="sdc-info">
                          <h4>{student.studentName}</h4>
                          <span>{student.schoolId || '—'} · {student.status}</span>
                        </div>
                        <div className="sdc-score">
                          {student.status === 'submitted' && student.percentage != null ? (
                            <>
                              <div className="score-val text-green">{student.percentage}%</div>
                              <div className="score-lbl">
                                {student.rawScore}/{student.totalPoints} pts
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="score-val text-gray">—</div>
                              <div className="score-lbl">Not submitted</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="sdc-stats">
                        <div className="sdc-stat">
                          <div className="stat-val">{student.answerCount}</div>
                          <div className="stat-lbl">Answers saved</div>
                        </div>
                        <div className="sdc-stat">
                          <div className="stat-val text-red">{student.warningCount}</div>
                          <div className="stat-lbl">Warnings</div>
                        </div>
                        <div className="sdc-stat">
                          <div className="stat-val">{formatDate(student.submittedAt)}</div>
                          <div className="stat-lbl">Submitted</div>
                        </div>
                      </div>
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
