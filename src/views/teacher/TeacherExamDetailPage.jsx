import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTeacherShellBreadcrumbTrail } from '@/context/TeacherShellBreadcrumbContext.jsx'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { fetchTeacherExamResults } from '@/lib/teacherExamResultsApi.js'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  PG_EXAM_STATUS,
  normalizeExamStatus,
} from '@/lib/examFlowUi.js'
import { formatCourseBreadcrumbLabel } from '@/lib/sectionLabel.js'
import '../../pages/teacher-ui/my_classes.css'

async function copyExamCode(code) {
  const value = code || ''
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    window.prompt('Copy this exam code:', value)
  }
}

export default function TeacherExamDetailPage() {
  const { classId, examId } = useParams()
  const navigate = useNavigate()
  
  const [hit, setHit] = useState(null)
  const [clsMeta, setClsMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [results, setResults] = useState(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  useEffect(() => {
    async function fetchExam() {
      if (!classId || !examId) return
      setLoading(true)
      try {
        const [examRes, classRes] = await Promise.all([
          apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`),
          apiFetch(`/api/teacher/classes/${classId}/exams`),
        ])
        if (!examRes.ok) {
          throw new Error('Exam not found or you do not have permission.')
        }
        setHit(await examRes.json())
        if (classRes.ok) {
          const classPayload = await classRes.json()
          setClsMeta(classPayload)
        } else {
          setClsMeta(null)
        }
      } catch (err) {
        setError(err.message)
        setClsMeta(null)
      } finally {
        setLoading(false)
      }
    }
    fetchExam()
  }, [classId, examId, refreshTick])

  const breadcrumbTrail = useMemo(() => {
    if (!hit) return null
    const trail = []
    if (clsMeta) {
      trail.push({
        label: formatCourseBreadcrumbLabel(clsMeta),
        to: `/teacher/my-classes/${encodeURIComponent(classId)}`,
      })
    }
    trail.push({ label: hit.title || 'Exam' })
    return trail
  }, [hit, clsMeta, classId])

  useTeacherShellBreadcrumbTrail(breadcrumbTrail)

  useEffect(() => {
    if (!classId || !examId) return undefined
    let cancelled = false
    async function loadResults() {
      setResultsLoading(true)
      try {
        const data = await fetchTeacherExamResults(classId, examId)
        if (!cancelled) setResults(data)
      } catch {
        if (!cancelled) setResults(null)
      } finally {
        if (!cancelled) setResultsLoading(false)
      }
    }
    loadResults()
    const interval = window.setInterval(loadResults, 6000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [classId, examId, refreshTick])

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <div className="acsis-mc-loading">Loading exam details…</div>
      </div>
    )
  }

  if (error || !hit) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <Link to={`/teacher/my-classes/${classId}`} className="acsis-stream-back">
          ← Back to class
        </Link>
        <p className="acsis-mc-sub" style={{ color: '#ef4444' }}>{error || 'This exam is not available.'}</p>
      </div>
    )
  }

  const exam = hit
  const active = isExamOngoing(exam.status)
  const draft = isExamDraft(exam.status)
  // exam.class_name, exam.academic_year, exam.semester should come from the backend if we did a join,
  // but since our getExamDetailsService might only return exam properties, we'll gracefully fallback if they are missing.
  
  const streamHref = `/teacher/my-classes/${encodeURIComponent(classId)}`

  async function publish() {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, {
        method: 'PUT'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish exam.')
      }
      if (data.code) {
        window.alert(`Exam published.\n\nShare this code with students: ${data.code}`)
      }
      setRefreshTick(t => t + 1)
    } catch (err) {
      alert(err.message)
    }
  }

  async function endExam() {
    if (!window.confirm('End this exam? Students will no longer be able to enter or submit.')) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/close`, {
        method: 'PUT',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to end exam.')
      }
      setRefreshTick((t) => t + 1)
    } catch (err) {
      alert(err.message)
    }
  }

  async function startExam() {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/start`, {
        method: 'PUT',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start exam.')
      }
      setRefreshTick((t) => t + 1)
    } catch (err) {
      alert(err.message)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${exam.title || 'this exam'}”? This cannot be undone.`)) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete exam.')
      }
      navigate(streamHref)
    } catch (err) {
      alert(err.message)
    }
  }

  const qs = new URLSearchParams({ classId })
  const createHref = `/teacher/create-exam?${qs.toString()}`

  const classHint =
    exam.class_name && (exam.academic_year || exam.semester)
      ? `${exam.class_name} · ${[exam.academic_year, exam.semester].filter(Boolean).join(' · ')}`
      : exam.class_name || undefined

  const headerMeta = [classHint, labelForPgExamStatus(exam.status)].filter(Boolean).join(' · ')

  return (
    <div className="acsis-mc-view acsis-view acsis-exam-detail">
      <TeacherPageHeader
        title={exam.title || 'Untitled exam'}
        meta={headerMeta || undefined}
        actions={
          <Link to={streamHref} className="acsis-stream-back">
            Back to exams
          </Link>
        }
      />

      <div className="acsis-exam-detail__card">

        <dl className="acsis-exam-detail__meta-grid">
          <div>
            <dt>Exam code</dt>
            <dd className="acsis-exam-detail__code">{exam.code || '—'}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            {/* questions array length or questionCount based on how it's structured in the db */}
            <dd>{exam.questions ? exam.questions.length : (exam.questionCount || 0)}</dd>
          </div>
          <div>
            <dt>Time limit</dt>
            <dd>{Number(exam.duration || 0)} minutes</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>{exam.subject || '—'}</dd>
          </div>
          <div>
            <dt>Class group</dt>
            <dd>
              {exam.yearLevel || '—'} · {exam.section || '—'}
            </dd>
          </div>
        </dl>

        <div className="acsis-exam-detail__actions">
          <button type="button" className="acsis-btn-primary" onClick={() => copyExamCode(exam.code)}>
            Copy exam code
          </button>
          {draft ? (
            <button type="button" className="acsis-btn-primary" onClick={publish}>
              Publish exam (share code)
            </button>
          ) : null}
          {normalizeExamStatus(exam.status) === PG_EXAM_STATUS.WAITING ? (
            <button type="button" className="acsis-btn-primary" onClick={startExam}>
              Start exam (go live)
            </button>
          ) : null}
          {active ? (
            <button type="button" className="acsis-btn-ghost" onClick={endExam}>
              End exam (close for students)
            </button>
          ) : null}
          <Link to={createHref} className="acsis-btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
            New exam in this class
          </Link>
          <button type="button" className="acsis-btn-ghost" style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={remove}>
            Delete exam
          </button>
        </div>

        <p className="acsis-mc-sub" style={{ marginTop: 22, fontSize: '0.8125rem', lineHeight: 1.5 }}>
          When this exam is on-going, students join with the code above. Submissions below update automatically.
        </p>

        <section
          className="acsis-exam-detail__submissions"
          style={{ marginTop: 28, borderTop: '1px solid var(--border-default, #e5e7eb)', paddingTop: 20 }}
        >
          <h2 className="acsis-exam-detail__section-title">Student submissions</h2>
          {results?.stats ? (
            <p className="acsis-mc-sub" style={{ marginBottom: 12 }}>
              {results.stats.submitted} submitted · {results.stats.joined} joined · {results.stats.enrolled} enrolled
            </p>
          ) : null}
          {resultsLoading && !results ? (
            <p className="acsis-mc-sub">Loading submissions…</p>
          ) : null}
          {!resultsLoading && (!results?.sessions || results.sessions.length === 0) ? (
            <p className="acsis-mc-sub">No students have joined or submitted yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '8px 6px' }}>Student</th>
                    <th style={{ padding: '8px 6px' }}>Status</th>
                    <th style={{ padding: '8px 6px' }}>Score</th>
                    <th style={{ padding: '8px 6px' }}>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {(results?.sessions || []).map((s) => (
                    <tr key={s.sessionId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 6px' }}>
                        {s.studentName}
                        {s.schoolId ? (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>{s.schoolId}</span>
                        ) : null}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{s.status}</td>
                      <td style={{ padding: '8px 6px' }}>
                        {s.status === 'submitted' && s.percentage != null
                          ? `${s.percentage}% (${s.rawScore}/${s.totalPoints})`
                          : '—'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{s.warningCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
