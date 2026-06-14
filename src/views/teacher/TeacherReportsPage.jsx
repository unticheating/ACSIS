import { useEffect, useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { fetchTeacherExamResults, fetchTeacherReportExams } from '@/lib/teacherExamResultsApi.js'
import { exportExamReport } from '@/lib/teacherExamGradingApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog.jsx'
import '../../pages/teacher-ui/reports.css'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

function sortSessionsByRank(sessions) {
  return [...sessions].sort((a, b) => {
    const ra = a.rank != null ? Number(a.rank) : 9999
    const rb = b.rank != null ? Number(b.rank) : 9999
    if (ra !== rb) return ra - rb
    return String(a.studentName || '').localeCompare(String(b.studentName || ''))
  })
}

function ExamCard({ exam, onClick, index }) {
  const sectionParts = [exam.programCode, exam.sectionCode].filter(Boolean)
  const sectionLabel = sectionParts.join(' / ')

  return (
    <FadeIn delay={0.05 + index * 0.04} className="rp-exam-card" onClick={() => onClick(exam)}>
      {sectionLabel ? (
        <div className="rp-exam-card__section">{sectionLabel}</div>
      ) : null}
      <div className="rp-exam-card__title">{exam.title || 'Untitled Exam'}</div>
      <div className="rp-exam-card__class">{exam.className || 'Class'}</div>
      <div className="rp-exam-card__bottom">
        <span className="rp-exam-card__sub-num">{exam.submittedCount ?? 0}</span>
        <span className="rp-exam-card__sub-lbl"> submitted</span>
      </div>
    </FadeIn>
  )
}

const PASS_THRESHOLD = 50

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rp-barchart-tooltip">
        <p className="rp-barchart-tooltip-label">{`Score: ${label}`}</p>
        <p className="rp-barchart-tooltip-value">
          {`${payload[0].value} Student${payload[0].value !== 1 ? 's' : ''}`}
        </p>
      </div>
    )
  }
  return null
}

function ScoreBarChart({ sessions }) {
  const scored = sessions.filter(
    (s) => s.status === 'submitted' && s.percentage != null,
  )
  if (scored.length === 0) {
    return <p className="rp-muted" style={{ marginTop: 8 }}>No score data to display yet.</p>
  }

  let totalScore = scored.length > 0 && scored[0].totalPoints ? Number(scored[0].totalPoints) : 100
  if (totalScore <= 0 || isNaN(totalScore)) totalScore = 100

  let bucketCount = 10
  if (totalScore < 10) {
    bucketCount = totalScore
  }

  const bucketSize = totalScore / bucketCount

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const minRaw = Math.ceil(i * bucketSize)
    const maxRaw = i === bucketCount - 1 ? totalScore : Math.ceil((i + 1) * bucketSize) - 1
    const label = minRaw >= maxRaw ? `${minRaw}` : `${minRaw}-${maxRaw}`
    const passed = maxRaw >= (totalScore * (PASS_THRESHOLD / 100))
    return { label, minRaw, maxRaw, passed }
  })

  const counts = buckets.map((b) => ({
    name: b.label,
    count: scored.filter((s) => {
      const r = Number(s.rawScore)
      return r >= b.minRaw && r <= b.maxRaw
    }).length,
    passed: b.passed,
  }))

  const maxCount = Math.max(...counts.map((c) => c.count), 1)

  return (
    <div className="rp-barchart-wrap" style={{ width: '100%', height: 260 }}>
      <div className="rp-barchart-legend" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
        <span className="rp-barchart-swatch rp-barchart-swatch--fail" /> Failed (&lt;50%)
        <span className="rp-barchart-swatch rp-barchart-swatch--pass" /> Passed (50%+)
      </div>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={counts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }}
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }}
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
              domain={[0, maxCount <= 5 ? 5 : 'auto']}
            />
            <Tooltip 
              cursor={{ fill: 'currentColor', opacity: 0.05 }}
              content={<CustomChartTooltip />}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {counts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.passed ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
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
  const [topStudent, setTopStudent] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [teacherLogoBase64, setTeacherLogoBase64] = useState(() => localStorage.getItem('acsis_teacher_logo') || '')
  const [departmentName, setDepartmentName] = useState(() => localStorage.getItem('acsis_department_name') || '')

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
        setTopStudent(data.topStudent || null)
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

  const sessionsByRank = useMemo(() => sortSessionsByRank(sessions), [sessions])

  const handleExport = async () => {
    if (!currentExam?.classId || !currentExam?.id) return
    setExporting(true)
    try {
      const reportType =
        activeTab === 'violations' ? 'violations' : activeTab === 'summary' ? 'summary' : 'detailed'
      await exportExamReport(currentExam.classId, currentExam.id, {
        format: exportFormat,
        reportType,
        teacherLogoBase64: teacherLogoBase64 || undefined,
        departmentName: departmentName || undefined
      })
      setExportModalOpen(false)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) {
      setTeacherLogoBase64('')
      localStorage.removeItem('acsis_teacher_logo')
      return
    }
    const reader = new FileReader()
    reader.onload = (evt) => {
      const result = evt.target.result
      setTeacherLogoBase64(result)
      try {
        localStorage.setItem('acsis_teacher_logo', result)
      } catch (err) {
        console.warn('Logo too large for localStorage', err)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDepartmentChange = (e) => {
    const val = e.target.value
    setDepartmentName(val)
    localStorage.setItem('acsis_department_name', val)
  }

  const handleChangeExam = () => {
    setSelectedExamId('')
    setActiveTab('detailed')
  }

  const submittedSessions = sessions.filter((s) => s.status === 'submitted')
  const scoredSessions = submittedSessions.filter((s) => s.percentage != null)
  const avgScore =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((sum, s) => sum + Number(s.percentage || 0), 0) / scoredSessions.length,
        )
      : null

  const sectionParts = currentExam
    ? [currentExam.programCode, currentExam.sectionCode].filter(Boolean)
    : []
  const sectionLabel = sectionParts.join(' — ')

  return (
    <div className="acsis-view reports-page">
      <div className="container" style={{ padding: 0 }}>
        {!currentExam && (
          <FadeIn delay={0.05} className="panel">
            <div className="report-header" style={{ marginBottom: '20px' }}>
              <h3 className="rp-page-title">Performance Report</h3>
              <p className="rp-page-sub">
                Select an exam to view scores and violations from the database.
              </p>
            </div>

            {loadingExams ? (
              <div className="rp-loading">Loading exams…</div>
            ) : allExams.length === 0 ? (
              <div className="rp-empty">No exams found. Create an exam in your classes first.</div>
            ) : (
              <div className="rp-exam-grid">
                {allExams.map((exam, i) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    index={i}
                    onClick={(e) => setSelectedExamId(String(e.id))}
                  />
                ))}
              </div>
            )}
          </FadeIn>
        )}

        {currentExam && (
          <>
            <FadeIn delay={0.1} className="panel">
              <div className="exam-title-row">
                <div>
                  <h2 className="rp-exam-heading">{currentExam.title}</h2>
                  <p className="rp-exam-subheading">
                    {currentExam.className}
                    {sectionLabel ? <span className="rp-exam-section-chip">{sectionLabel}</span> : null}
                    {' '}·{' '}
                    {stats ? `${stats.submitted}/${stats.enrolled} submitted` : 'Loading…'}
                  </p>
                </div>
                <button type="button" className="btn-ghost-text" onClick={handleChangeExam}>
                  ← Change Exam
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
                    Results
                  </button>
                </div>

                <div className="action-group">
                  <button
                    type="button"
                    className="btn-action btn-blue"
                    disabled={exporting}
                    onClick={() => { setExportFormat('excel'); setExportModalOpen(true); }}
                  >
                    Download Excel
                  </button>
                  <button
                    type="button"
                    className="btn-action btn-green"
                    disabled={exporting}
                    onClick={() => { setExportFormat('pdf'); setExportModalOpen(true); }}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </FadeIn>

            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
              <DialogContent className="rp-pdf-dialog">
                <DialogHeader>
                  <DialogTitle>Export {exportFormat === 'excel' ? 'Excel' : 'PDF'} Report</DialogTitle>
                  <DialogDescription>
                    Configure your report header before generating the document.
                  </DialogDescription>
                </DialogHeader>
                <div className="rp-pdf-settings" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="rp-pdf-form-group">
                    <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                      Teacher / Department Logo (Optional)
                    </label>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      onChange={handleLogoUpload}
                      style={{ display: 'block', width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      This logo will appear next to the ACSIS logo on the header.
                    </p>
                    {teacherLogoBase64 && (
                      <>
                        <div style={{ marginTop: '12px', border: '1px dashed var(--border-color)', padding: '10px', borderRadius: '6px', display: 'inline-block' }}>
                          <img src={teacherLogoBase64} alt="Teacher Logo Preview" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ marginTop: '16px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                            Department Name (Optional)
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. College of Computer Studies"
                            value={departmentName}
                            onChange={handleDepartmentChange}
                            style={{ display: 'block', width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                          />
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            This will appear below the Institution name on the right.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <button className="btn-ghost-text" onClick={() => setExportModalOpen(false)}>Cancel</button>
                  <button className="btn-action btn-green" onClick={handleExport} disabled={exporting}>
                    {exporting ? `Generating ${exportFormat === 'excel' ? 'Excel' : 'PDF'}...` : 'Confirm & Download'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {reportError ? (
              <p className="rp-error" role="alert">
                {reportError}
              </p>
            ) : null}
            {loadingReport && !stats ? (
              <p className="rp-loading">Loading report data…</p>
            ) : null}

            {activeTab === 'summary' && (() => {
              const scored = sessions.filter(
                (s) => s.status === 'submitted' && s.percentage != null,
              )
              const highScore = scored.length
                ? Math.max(...scored.map((s) => Number(s.percentage)))
                : null
              const lowScore = scored.length
                ? Math.min(...scored.map((s) => Number(s.percentage)))
                : null
              const passed = scored.filter((s) => Number(s.percentage) >= PASS_THRESHOLD).length
              const failed = scored.filter((s) => Number(s.percentage) < PASS_THRESHOLD).length

              return (
                <FadeIn delay={0.1} className="tab-panel active panel">
                  <div className="report-header">
                    <h3 className="rp-section-title">Summary Report</h3>
                    <p className="rp-section-sub">{currentExam.title}</p>
                  </div>

                  {/* Participation row */}
                  {stats ? (
                    <>
                      <p className="rp-summary-group-label">Participation</p>
                      <div className="rp-summary-grid">
                        <FadeIn delay={0.12} className="rp-summary-stat">
                          <div className="rp-summary-stat__val">{stats.enrolled}</div>
                          <div className="rp-summary-stat__lbl">Enrolled</div>
                        </FadeIn>
                        <FadeIn delay={0.16} className="rp-summary-stat">
                          <div className="rp-summary-stat__val">{stats.joined}</div>
                          <div className="rp-summary-stat__lbl">Joined</div>
                        </FadeIn>
                        <FadeIn delay={0.20} className="rp-summary-stat">
                          <div className="rp-summary-stat__val rp-summary-stat__val--green">{stats.submitted}</div>
                          <div className="rp-summary-stat__lbl">Submitted</div>
                        </FadeIn>
                      </div>

                      <p className="rp-summary-group-label" style={{ marginTop: 20 }}>Scores</p>
                      <div className="rp-summary-grid">
                        <FadeIn delay={0.24} className="rp-summary-stat">
                          <div className="rp-summary-stat__val">
                            {avgScore != null ? `${avgScore}%` : '—'}
                          </div>
                          <div className="rp-summary-stat__lbl">Average</div>
                        </FadeIn>
                        <FadeIn delay={0.28} className="rp-summary-stat">
                          <div className="rp-summary-stat__val rp-summary-stat__val--green">
                            {highScore != null ? `${highScore}%` : '—'}
                          </div>
                          <div className="rp-summary-stat__lbl">Highest</div>
                        </FadeIn>
                        <FadeIn delay={0.32} className="rp-summary-stat">
                          <div className="rp-summary-stat__val rp-summary-stat__val--red">
                            {lowScore != null ? `${lowScore}%` : '—'}
                          </div>
                          <div className="rp-summary-stat__lbl">Lowest</div>
                        </FadeIn>
                        <FadeIn delay={0.36} className="rp-summary-stat">
                          <div className="rp-summary-stat__val rp-summary-stat__val--green">{passed}</div>
                          <div className="rp-summary-stat__lbl">Passed</div>
                        </FadeIn>
                        <FadeIn delay={0.40} className="rp-summary-stat">
                          <div className="rp-summary-stat__val rp-summary-stat__val--red">{failed}</div>
                          <div className="rp-summary-stat__lbl">Failed</div>
                        </FadeIn>
                      </div>

                      {/* Score Distribution Bar Chart */}
                      <p className="rp-summary-group-label" style={{ marginTop: 24 }}>Score Distribution</p>
                      <ScoreBarChart sessions={sessions} />
                    </>
                  ) : (
                    <p className="rp-muted">No summary data yet.</p>
                  )}
                </FadeIn>
              )
            })()}

            {activeTab === 'violations' && (
              <FadeIn delay={0.1} className="tab-panel active panel">
                <div className="report-header">
                  <h3 className="rp-section-title">Violations Report</h3>
                  <p className="rp-section-sub">{currentExam.title}</p>
                </div>

                <div className="violation-alert-box">
                  <div className="alert-title">Total Violations Detected</div>
                  <div className="alert-count">{violations.length}</div>
                  <div className="alert-sub">From proctoring logs for this exam</div>
                </div>

                {violations.length === 0 ? (
                  <p className="rp-muted">No violations logged for this exam.</p>
                ) : (
                  <ul className="rp-violations-list">
                    {violations.map((v, index) => (
                      <FadeIn
                        as="li"
                        delay={0.15 + index * 0.05}
                        key={v.id}
                        className="rp-violation-item"
                      >
                        <span className="rp-violation-item__text">
                          <strong>{v.studentName}</strong> ({v.schoolId || '—'}) — {v.eventType}
                          {v.details ? `: ${v.details}` : ''}
                        </span>
                        <span className="rp-violation-item__time">{formatDate(v.occurredAt)}</span>
                      </FadeIn>
                    ))}
                  </ul>
                )}
              </FadeIn>
            )}

            {activeTab === 'detailed' && (
              <FadeIn delay={0.1} className="tab-panel active panel">
                <div className="report-header">
                  <h3 className="rp-section-title">Student results</h3>
                  <p className="rp-section-sub">Sorted by rank — Rank #1 appears first.</p>
                </div>

                {sessionsByRank.length === 0 ? (
                  <p className="rp-muted">No student sessions yet. Students must join and submit the exam.</p>
                ) : (
                  sessionsByRank.map((student, index) => (
                    <FadeIn delay={0.15 + index * 0.05} key={student.sessionId} className="student-detail-card">
                      <div className="sdc-header">
                        <div className="sdc-info">
                          <h4>
                            {student.rank != null ? (
                              <span className="text-green font-bold mr-2">#{student.rank}</span>
                            ) : null}
                            {student.studentName}
                          </h4>
                          <span>{student.schoolId || '—'} · {student.status}</span>
                        </div>
                        <div className="sdc-score">
                          {student.status === 'submitted' && student.percentage != null ? (
                            <>
                              <div className={`score-val ${Number(student.percentage) < 50 ? 'text-red' : 'text-green'}`}>
                                {student.percentage}%
                              </div>
                              <div className="score-lbl">
                                {student.rawScore}/{student.totalPoints} pts
                              </div>
                            </>
                          ) : student.status === 'submitted' ? (
                            <>
                              <div className="score-val rp-muted-val">—</div>
                              <div className="score-lbl">Grading pending</div>
                            </>
                          ) : (
                            <>
                              <div className="score-val rp-muted-val">—</div>
                              <div className="score-lbl">Not submitted</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="sdc-stats">
                        <div className="sdc-stat">
                          <div className="stat-val">{student.answerCount}</div>
                          <div className="stat-lbl">Questions answered</div>
                        </div>
                        <div className="sdc-stat">
                          <div className="stat-val text-red">{student.warningCount}</div>
                          <div className="stat-lbl">Warnings</div>
                        </div>
                        <div className="sdc-stat">
                          <div className="stat-val rp-date-val">{formatDate(student.submittedAt)}</div>
                          <div className="stat-lbl">Submitted</div>
                        </div>
                      </div>
                    </FadeIn>
                  ))
                )}
              </FadeIn>
            )}
          </>
        )}
      </div>

    </div>
  )
}
