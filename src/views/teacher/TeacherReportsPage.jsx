import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { ChevronDown, FileSpreadsheet, FileText, ArrowLeft } from 'lucide-react'
import { fetchTeacherExamResults, fetchTeacherReportExams } from '@/lib/teacherExamResultsApi.js'
import { exportExamReport } from '@/lib/teacherExamGradingApi.js'
import { labelForCheatEvent } from '@/lib/examAntiCheat.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
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

function sortSessionsBySurname(sessions) {
  return [...sessions].sort((a, b) => {
    const lastCmp = String(a.lastName || a.studentName || '').localeCompare(
      String(b.lastName || b.studentName || ''),
      undefined,
      { sensitivity: 'base' },
    )
    if (lastCmp !== 0) return lastCmp
    return String(a.firstName || '').localeCompare(String(b.firstName || ''), undefined, {
      sensitivity: 'base',
    })
  })
}

function formatSurnameFirst(student) {
  if (student.lastName && student.firstName) {
    return `${student.lastName}, ${student.firstName}`
  }
  return student.studentName || '—'
}

function studentInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  }
  return (parts[0]?.[0] || '?').toUpperCase()
}

function groupViolationsByStudent(violations, sessions) {
  const sessionById = new Map(
    (sessions || []).filter((s) => s.sessionId != null).map((s) => [s.sessionId, s]),
  )
  const map = new Map()

  for (const violation of violations || []) {
    const key = violation.sessionId ?? `${violation.studentName}-${violation.schoolId}`
    const session = violation.sessionId ? sessionById.get(violation.sessionId) : null
    if (!map.has(key)) {
      map.set(key, {
        key,
        sessionId: violation.sessionId ?? null,
        studentName: violation.studentName || 'Unknown student',
        displayName: session ? formatSurnameFirst(session) : violation.studentName || 'Unknown student',
        schoolId: violation.schoolId || session?.schoolId || '',
        violations: [],
      })
    }
    map.get(key).violations.push(violation)
  }

  const groups = [...map.values()]
  for (const group of groups) {
    group.violations.sort(
      (a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime(),
    )
    group.activeCount = group.violations.filter((v) => !v.dismissedAt).length
  }

  groups.sort((a, b) => {
    if (b.violations.length !== a.violations.length) {
      return b.violations.length - a.violations.length
    }
    return String(a.displayName).localeCompare(String(b.displayName), undefined, {
      sensitivity: 'base',
    })
  })

  return groups
}

function ViolationsReportPanel({ violations, sessions }) {
  const groups = useMemo(
    () => groupViolationsByStudent(violations, sessions),
    [violations, sessions],
  )

  const activeCount = useMemo(
    () => (violations || []).filter((v) => !v.dismissedAt).length,
    [violations],
  )
  const dismissedCount = violations.length - activeCount

  if (violations.length === 0) {
    return <p className="rp-muted">No violations logged for this exam.</p>
  }

  return (
    <>
      <div className="rp-violations-overview">
        <div className="rp-summary-grid rp-violations-overview__grid">
          <div className="rp-summary-stat">
            <div className="rp-summary-stat__val">{violations.length}</div>
            <div className="rp-summary-stat__lbl">Total events</div>
          </div>
          <div className="rp-summary-stat">
            <div className="rp-summary-stat__val">{groups.length}</div>
            <div className="rp-summary-stat__lbl">Students flagged</div>
          </div>
          <div className="rp-summary-stat">
            <div className="rp-summary-stat__val rp-summary-stat__val--red">{activeCount}</div>
            <div className="rp-summary-stat__lbl">Active warnings</div>
          </div>
          {dismissedCount > 0 ? (
            <div className="rp-summary-stat">
              <div className="rp-summary-stat__val rp-muted-val">{dismissedCount}</div>
              <div className="rp-summary-stat__lbl">Dismissed</div>
            </div>
          ) : null}
        </div>
        <p className="rp-violations-overview__note">
          Expand a student to review each logged event and timestamp.
        </p>
      </div>

      <div className="rp-violations-groups">
        {groups.map((group, index) => (
          <FadeIn delay={0.08 + index * 0.04} key={group.key}>
            <details className="rp-violations-student-group">
              <summary className="rp-violations-student-summary">
                <span className="rp-violations-student-summary__lead">
                  <span className="rp-violations-student-avatar" aria-hidden="true">
                    {studentInitials(group.displayName)}
                  </span>
                  <span className="rp-violations-student-summary__identity">
                    <span className="rp-violations-student-summary__name">{group.displayName}</span>
                    <span className="rp-violations-student-summary__meta">
                      {group.schoolId || 'No school ID'}
                    </span>
                  </span>
                </span>
                <span className="rp-violations-student-summary__trail">
                  {group.activeCount > 0 ? (
                    <span className="rp-violations-count-pill rp-violations-count-pill--active">
                      {group.activeCount} active
                    </span>
                  ) : null}
                  <span className="rp-violations-count-pill">
                    {group.violations.length} event{group.violations.length === 1 ? '' : 's'}
                  </span>
                  <ChevronDown className="rp-violations-chevron" aria-hidden="true" />
                </span>
              </summary>

              <ol className="rp-violations-student-events">
                {group.violations.map((violation) => {
                  const dismissed = Boolean(violation.dismissedAt)
                  return (
                    <li
                      key={violation.id}
                      className={`rp-violations-event${dismissed ? ' rp-violations-event--dismissed' : ''}`}
                    >
                      <div className="rp-violations-event__main">
                        <span className="rp-violations-event__type">
                          {labelForCheatEvent(violation.eventType)}
                        </span>
                        {violation.details ? (
                          <span className="rp-violations-event__details">{violation.details}</span>
                        ) : null}
                      </div>
                      <div className="rp-violations-event__aside">
                        {dismissed ? (
                          <span className="rp-violations-event__badge">Dismissed</span>
                        ) : null}
                        <time className="rp-violations-event__time" dateTime={violation.occurredAt || undefined}>
                          {formatDate(violation.occurredAt)}
                        </time>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </details>
          </FadeIn>
        ))}
      </div>
    </>
  )
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

function buildScoreDistributionBuckets(sessions) {
  const scored = sessions.filter(
    (s) => s.status === 'submitted' && s.percentage != null,
  )
  if (scored.length === 0) return null

  let totalScore = scored[0].totalPoints ? Number(scored[0].totalPoints) : 100
  if (totalScore <= 0 || Number.isNaN(totalScore)) totalScore = 100

  let bucketCount = 10
  if (totalScore < 10) bucketCount = totalScore

  const bucketSize = totalScore / bucketCount
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const minRaw = Math.ceil(i * bucketSize)
    const maxRaw = i === bucketCount - 1 ? totalScore : Math.ceil((i + 1) * bucketSize) - 1
    const label = minRaw >= maxRaw ? `${minRaw}` : `${minRaw}-${maxRaw}`
    const passed = maxRaw >= totalScore * (PASS_THRESHOLD / 100)
    return { label, minRaw, maxRaw, passed }
  })

  const counts = buckets.map((b) => {
    const bucketStudents = scored.filter((s) => {
      const r = Number(s.rawScore)
      return r >= b.minRaw && r <= b.maxRaw
    })
    return {
      name: b.label,
      count: bucketStudents.length,
      passed: b.passed,
      students: sortSessionsBySurname(bucketStudents),
    }
  })

  const maxCount = Math.max(...counts.map((c) => c.count), 1)
  return { counts, maxCount }
}

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const count = payload[0].value
    return (
      <div className="rp-barchart-tooltip">
        <p className="rp-barchart-tooltip-label">{`Score: ${label}`}</p>
        <p className="rp-barchart-tooltip-value">
          {`${count} Student${count !== 1 ? 's' : ''}`}
        </p>
        {count > 0 ? (
          <p className="rp-barchart-tooltip-hint">Click bar to view students</p>
        ) : null}
      </div>
    )
  }
  return null
}

function ScoreBarChart({ sessions }) {
  const [selectedBucket, setSelectedBucket] = useState(null)
  const distribution = useMemo(() => buildScoreDistributionBuckets(sessions), [sessions])

  useEffect(() => {
    setSelectedBucket(null)
  }, [sessions])

  if (!distribution) {
    return <p className="rp-muted" style={{ marginTop: 8 }}>No score data to display yet.</p>
  }

  const { counts, maxCount } = distribution
  const selectedIndex =
    selectedBucket != null ? counts.findIndex((c) => c.name === selectedBucket.name) : null

  function handleBarClick(data) {
    setSelectedBucket(data?.payload ?? null)
  }

  return (
    <div className="rp-barchart-wrap" style={{ width: '100%' }}>
      <div className="rp-barchart-legend" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
        <span className="rp-barchart-swatch rp-barchart-swatch--fail" /> Failed (&lt;50%)
        <span className="rp-barchart-swatch rp-barchart-swatch--pass" /> Passed (50%+)
      </div>
      <div className="rp-barchart-canvas" style={{ width: '100%', height: 200 }}>
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
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              cursor="pointer"
              onClick={handleBarClick}
            >
              {counts.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.passed ? '#22c55e' : '#ef4444'}
                  opacity={selectedIndex == null || selectedIndex === index ? 1 : 0.35}
                  stroke={selectedIndex === index ? '#111827' : undefined}
                  strokeWidth={selectedIndex === index ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="rp-barchart-hint">Click a bar to see which students scored in that range.</p>

      <Dialog
        open={selectedBucket != null}
        onOpenChange={(open) => {
          if (!open) setSelectedBucket(null)
        }}
      >
        <DialogContent className="sm:max-w-md rp-barchart-bucket-modal">
          <DialogHeader>
            <DialogTitle>Score {selectedBucket?.name ?? '—'}</DialogTitle>
            <DialogDescription>
              {selectedBucket?.count ?? 0} student{(selectedBucket?.count ?? 0) === 1 ? '' : 's'} in this range
            </DialogDescription>
          </DialogHeader>
          {selectedBucket?.count === 0 ? (
            <p className="rp-muted">No students in this range.</p>
          ) : (
            <ul className="rp-barchart-bucket-list">
              {selectedBucket?.students.map((student) => (
                <li key={student.sessionId} className="rp-barchart-bucket-item">
                  <span className="rp-barchart-bucket-item__name">{formatSurnameFirst(student)}</span>
                  <span className="rp-barchart-bucket-item__meta">
                    {student.schoolId ? `${student.schoolId} · ` : ''}
                    {student.rawScore}/{student.totalPoints} pts ({student.percentage}%)
                    {student.rank != null ? ` · Rank #${student.rank}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReportExportActions({ scopeLabel, exporting, onExportExcel, onExportPdf }) {
  return (
    <div className="report-header__actions">
      <div className="action-group">
        <button
          type="button"
          className="btn-action btn-outline"
          disabled={exporting}
          title={`Export ${scopeLabel} report to Excel`}
          onClick={onExportExcel}
        >
          <FileSpreadsheet aria-hidden="true" />
          Export to Excel
        </button>
        <button
          type="button"
          className="btn-action btn-primary"
          disabled={exporting}
          title={`Export ${scopeLabel} report to PDF`}
          onClick={onExportPdf}
        >
          <FileText aria-hidden="true" />
          Export to PDF
        </button>
      </div>
    </div>
  )
}

export default function TeacherReportsPage() {
  const [searchParams] = useSearchParams()
  const examIdFromUrl = searchParams.get('examId') || ''
  const [selectedExamId, setSelectedExamId] = useState(examIdFromUrl)
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

  useEffect(() => {
    if (!examIdFromUrl) return
    setSelectedExamId(examIdFromUrl)
  }, [examIdFromUrl])

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
    async function loadReport(isBackground = false) {
      if (!isBackground) {
        setLoadingReport(true)
        setReportError(null)
      }
      try {
        const data = await fetchTeacherExamResults(currentExam.classId, currentExam.id)
        if (cancelled) return
        if (isBackground) setReportError(null)
        setStats(data.stats || null)
        setSessions(data.sessions || [])
        setViolations(data.violations || [])
        setTopStudent(data.topStudent || null)
      } catch (err) {
        if (!cancelled) {
          setReportError(err instanceof Error ? err.message : 'Failed to load report.')
          if (!isBackground) {
            setStats(null)
            setSessions([])
            setViolations([])
          }
        }
      } finally {
        if (!cancelled && !isBackground) setLoadingReport(false)
      }
    }

    loadReport(false)
    const interval = window.setInterval(() => loadReport(true), 8000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [currentExam?.classId, currentExam?.id])

  const sessionsByRank = useMemo(() => sortSessionsByRank(sessions), [sessions])
  const sessionsBySurname = useMemo(() => sortSessionsBySurname(sessions), [sessions])

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
  const sectionLabel = sectionParts.join(' / ')

  const exportScopeLabel =
    activeTab === 'violations' ? 'violations' : activeTab === 'summary' ? 'summary' : 'results'

  return (
    <div className="acsis-view reports-page">
      <div className="rp-layout">
        {!currentExam && (
          <>
            <FadeIn delay={0.05} className="rp-page-header">
              <h1 className="rp-page-title">Performance Report</h1>
              <p className="rp-page-sub">
                Select an exam to view scores and proctoring violations.
              </p>
            </FadeIn>

            {loadingExams ? (
              <PageSpinner label="Loading exams…" />
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
          </>
        )}

        {currentExam && (
          <>
            <FadeIn delay={0.06} className="rp-exam-toolbar">
              <div className="rp-exam-toolbar__top">
                <div className="rp-exam-toolbar__intro">
                  <button type="button" className="rp-back-link" onClick={handleChangeExam}>
                    <ArrowLeft aria-hidden="true" />
                    Change exam
                  </button>
                  <h1 className="rp-exam-heading">{currentExam.title}</h1>
                  <p className="rp-exam-subheading">
                    <span>{currentExam.className}</span>
                    {sectionLabel ? (
                      <span className="rp-exam-section-chip">{sectionLabel}</span>
                    ) : null}
                    <span className="rp-exam-subheading__dot" aria-hidden="true">·</span>
                    <span>
                      {stats ? `${stats.submitted}/${stats.enrolled} submitted` : 'Loading…'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rp-exam-toolbar__controls">
                <div className="tabs-group" role="tablist" aria-label="Report views">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'summary'}
                    className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'violations'}
                    className={`tab-btn ${activeTab === 'violations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('violations')}
                  >
                    Violations
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'detailed'}
                    className={`tab-btn ${activeTab === 'detailed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detailed')}
                  >
                    Results
                  </button>
                </div>
              </div>
            </FadeIn>

            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
              <DialogContent className="rp-pdf-dialog">
                <DialogHeader>
                  <DialogTitle>
                    Export {exportScopeLabel} report to {exportFormat === 'excel' ? 'Excel' : 'PDF'}
                  </DialogTitle>
                  <DialogDescription>
                    Downloads the current {exportScopeLabel} view for this exam. Optional logo and department name appear in the report header.
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
                  <button className="btn-action btn-primary" onClick={handleExport} disabled={exporting}>
                    {exporting
                      ? `Generating ${exportScopeLabel} ${exportFormat === 'excel' ? 'Excel' : 'PDF'}…`
                      : 'Download report'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {reportError ? (
              <p className="rp-error rp-status-banner" role="alert">
                {reportError}
              </p>
            ) : null}
            {loadingReport && !stats ? (
              <PageSpinner label="Loading report data…" />
            ) : null}

            <div className="rp-content-area">
            <div className="rp-tab-stack">
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
                <FadeIn delay={0.1} className="tab-panel active rp-surface">
                  <div className="report-header">
                    <div className="report-header__text">
                      <h2 className="rp-section-title">Summary</h2>
                      <p className="rp-section-sub">Participation, scores, and distribution for this exam.</p>
                    </div>
                    <ReportExportActions
                      scopeLabel="summary"
                      exporting={exporting}
                      onExportExcel={() => { setExportFormat('excel'); setExportModalOpen(true); }}
                      onExportPdf={() => { setExportFormat('pdf'); setExportModalOpen(true); }}
                    />
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

                      <p className="rp-summary-group-label" style={{ marginTop: 24 }}>Students (Surname A–Z)</p>
                      {sessionsBySurname.length === 0 ? (
                        <p className="rp-muted">No student sessions yet.</p>
                      ) : (
                        <div className="rp-summary-student-table-wrap">
                          <table className="rp-summary-student-table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>School ID</th>
                                <th>Score</th>
                                <th>Rank</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessionsBySurname.map((student) => (
                                <tr key={student.sessionId}>
                                  <td>{formatSurnameFirst(student)}</td>
                                  <td>{student.schoolId || '—'}</td>
                                  <td>
                                    {student.status === 'submitted' && student.percentage != null
                                      ? `${student.percentage}% (${student.rawScore}/${student.totalPoints})`
                                      : '—'}
                                  </td>
                                  <td>{student.rank != null ? `#${student.rank}` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="rp-muted">No summary data yet.</p>
                  )}
                </FadeIn>
              )
            })()}

            {activeTab === 'violations' && (
              <FadeIn delay={0.1} className="tab-panel active rp-surface">
                <div className="report-header">
                  <div className="report-header__text">
                    <h2 className="rp-section-title">Violations</h2>
                    <p className="rp-section-sub">
                      Proctoring events grouped by student, newest first within each group.
                    </p>
                  </div>
                  <ReportExportActions
                    scopeLabel="violations"
                    exporting={exporting}
                    onExportExcel={() => { setExportFormat('excel'); setExportModalOpen(true); }}
                    onExportPdf={() => { setExportFormat('pdf'); setExportModalOpen(true); }}
                  />
                </div>

                <ViolationsReportPanel violations={violations} sessions={sessions} />
              </FadeIn>
            )}

            {activeTab === 'detailed' && (
              <FadeIn delay={0.1} className="tab-panel active rp-surface">
                <div className="report-header">
                  <div className="report-header__text">
                    <h2 className="rp-section-title">Student results</h2>
                    <p className="rp-section-sub">Ranked by score — #1 appears first.</p>
                  </div>
                  <ReportExportActions
                    scopeLabel="results"
                    exporting={exporting}
                    onExportExcel={() => { setExportFormat('excel'); setExportModalOpen(true); }}
                    onExportPdf={() => { setExportFormat('pdf'); setExportModalOpen(true); }}
                  />
                </div>

                <p className="rp-summary-group-label">Students (By Score Rank)</p>

                {sessionsByRank.length === 0 ? (
                  <p className="rp-muted">No student sessions yet. Students must join and submit the exam.</p>
                ) : (
                  <div className="rp-results-list">
                  {sessionsByRank.map((student, index) => (
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
                  ))}
                  </div>
                )}
              </FadeIn>
            )}
            </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
