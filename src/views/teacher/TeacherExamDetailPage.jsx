import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTeacherShellBreadcrumbTrail } from '@/context/TeacherShellBreadcrumbContext.jsx'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { fetchTeacherExamResults } from '@/lib/teacherExamResultsApi.js'
import { releaseExamScores } from '@/lib/teacherExamGradingApi.js'
import ExamAnswerReviewModal from '@/components/teacher/ExamAnswerReviewModal.jsx'
import ReleaseScoresDialog from '@/components/teacher/ReleaseScoresDialog.jsx'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  PG_EXAM_STATUS,
  normalizeExamStatus,
} from '@/lib/examFlowUi.js'
import { formatCourseBreadcrumbLabel, formatSectionTitle, formatTermPeriod } from '@/lib/sectionLabel.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { copyToClipboard } from '@/lib/copyToClipboard.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import '../../pages/teacher-ui/my_classes.css'

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
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewInitialSessionId, setReviewInitialSessionId] = useState(null)
  const [releasing, setReleasing] = useState(false)
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const { confirm, ConfirmDialog } = useAcsisConfirm()

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
  const closed = normalizeExamStatus(exam.status) === PG_EXAM_STATUS.CLOSED
  const hasSubmissions = (results?.sessions || []).some((s) => s.status === 'submitted')

  const subjectLabel = (clsMeta?.courseCode || clsMeta?.name || '').trim() || null
  const sectionLabel = clsMeta ? formatSectionTitle(clsMeta) : ''
  const classGroupParts = [
    sectionLabel && sectionLabel !== 'Section' ? sectionLabel : null,
    clsMeta ? formatTermPeriod(clsMeta) : null,
  ].filter(Boolean)
  const classGroupLabel =
    classGroupParts.length > 0 ? classGroupParts.join(' · ') : (clsMeta?.name || '').trim() || null

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
        acsisToastSuccess(`Exam published. Share this code with students: ${data.code}`)
      } else {
        acsisToastSuccess('Exam published.')
      }
      setRefreshTick(t => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function endExam() {
    const ok = await confirm({
      title: 'End this exam?',
      description: 'Students will no longer be able to enter or submit.',
      confirmLabel: 'End exam',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/close`, {
        method: 'PUT',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to end exam.')
      }
      if (data.topStudent) {
        acsisToastSuccess(
          `Exam ended. Top 1: ${data.topStudent.studentName} (${data.topStudent.percentage}%).`,
        )
      } else {
        acsisToastSuccess('Exam ended. Ranks computed.')
      }
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function handleReleaseScores({ sendEmail, includeAnswerKey }) {
    setReleasing(true)
    try {
      const data = await releaseExamScores(classId, examId, { sendEmail, includeAnswerKey })
      const topMsg = data.topStudent ? ` Top 1: ${data.topStudent.studentName}.` : ''
      acsisToastSuccess(`Scores released. Emails sent: ${data.emailsSent ?? 0}.${topMsg}`)
      setReleaseDialogOpen(false)
      const refreshed = await fetchTeacherExamResults(classId, examId)
      setResults(refreshed)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to release scores.')
    } finally {
      setReleasing(false)
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
      acsisToastSuccess('Exam is now live.')
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete “${exam.title || 'this exam'}”?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete exam',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete exam.')
      }
      acsisToastSuccess('Exam deleted.')
      navigate(streamHref)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  const qs = new URLSearchParams({ classId })
  const createHref = `/teacher/create-exam?${qs.toString()}`

  const classHint = clsMeta
    ? [clsMeta.name || clsMeta.courseCode, formatTermPeriod(clsMeta)].filter(Boolean).join(' · ')
    : undefined

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

        <FadeIn delay={0.05}>
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
              <dd>{subjectLabel || '—'}</dd>
            </div>
            <div>
              <dt>Class group</dt>
              <dd>{classGroupLabel || '—'}</dd>
            </div>
          </dl>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="acsis-exam-detail__actions">
          <button
            type="button"
            className="acsis-btn-primary"
            onClick={() => void copyToClipboard(exam.code, { successMessage: 'Exam code copied.' })}
          >
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
            <button type="button" className="acsis-btn-ghost" onClick={() => void endExam()}>
              End exam (close for students)
            </button>
          ) : null}
          {(closed || hasSubmissions) && !draft ? (
            <button
              type="button"
              className="acsis-btn-primary"
              disabled={releasing}
              onClick={() => setReleaseDialogOpen(true)}
            >
              {releasing ? 'Releasing…' : 'Release scores to students'}
            </button>
          ) : null}
          <Link to={createHref} className="acsis-btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
            New exam in this class
          </Link>
          <button
            type="button"
            className="acsis-btn-ghost"
            style={{ color: '#b91c1c', borderColor: '#fecaca' }}
            onClick={() => void remove()}
          >
            Delete exam
          </button>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <p className="acsis-mc-sub" style={{ marginTop: 22, fontSize: '0.8125rem', lineHeight: 1.5 }}>
            When this exam is on-going, students join with the code above. Submissions below update automatically.
          </p>
        </FadeIn>

        <FadeIn
          as="section"
          delay={0.2}
          className="acsis-exam-detail__submissions"
          style={{ marginTop: 28, borderTop: '1px solid var(--border-default, #e5e7eb)', paddingTop: 20 }}
        >
          <h2 className="acsis-exam-detail__section-title">Student submissions</h2>
          {results?.topStudent ? (
            <p className="acsis-mc-sub" style={{ marginBottom: 8, color: '#15803d', fontWeight: 600 }}>
              Top 1: {results.topStudent.studentName}
              {results.topStudent.percentage != null ? ` — ${results.topStudent.percentage}%` : ''}
            </p>
          ) : null}
          {results?.stats ? (
            <p className="acsis-mc-sub" style={{ marginBottom: 12 }}>
              {results.stats.submitted} submitted · {results.stats.joined} joined · {results.stats.enrolled} enrolled
              {closed ? ' · Exam closed — release scores when ready' : ''}
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
                    <th style={{ padding: '8px 6px' }}>Review</th>
                    <th style={{ padding: '8px 6px' }}>Score</th>
                    <th style={{ padding: '8px 6px' }}>Rank</th>
                    <th style={{ padding: '8px 6px' }}>Released</th>
                    <th style={{ padding: '8px 6px' }}>Warnings</th>
                    <th style={{ padding: '8px 6px' }} />
                  </tr>
                </thead>
                <tbody>
                  {(results?.sessions || []).map((s, index) => (
                    <FadeIn as="tr" delay={0.25 + (index * 0.05)} key={s.sessionId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 6px' }}>
                        {s.studentName}
                        {s.schoolId ? (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280' }}>{s.schoolId}</span>
                        ) : null}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{s.status}</td>
                      <td style={{ padding: '8px 6px' }}>
                        {s.status === 'submitted'
                          ? s.reviewComplete
                            ? 'Reviewed'
                            : (s.uncheckedCount ?? 0) > 0
                              ? `Optional (${s.uncheckedCount})`
                              : 'Auto-graded'
                          : '—'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        {s.status === 'submitted' && s.percentage != null
                          ? `${s.percentage}% (${s.rawScore}/${s.totalPoints})`
                          : '—'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{s.rank != null ? `#${s.rank}` : '—'}</td>
                      <td style={{ padding: '8px 6px' }}>
                        {s.status === 'submitted' ? (s.scoreReleased ? 'Yes' : 'Pending') : '—'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{s.warningCount}</td>
                      <td style={{ padding: '8px 6px' }}>
                        {s.status === 'submitted' && s.sessionId ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-blue-700 hover:underline"
                            onClick={() => {
                              setReviewInitialSessionId(s.sessionId)
                              setReviewOpen(true)
                            }}
                          >
                            Review
                          </button>
                        ) : null}
                      </td>
                    </FadeIn>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeIn>
      </div>

      {reviewOpen && results?.sessions ? (
        <ExamAnswerReviewModal
          classId={classId}
          examId={examId}
          examTitle={hit?.title || 'Exam'}
          submittedSessions={results.sessions.filter((s) => s.status === 'submitted')}
          initialSessionId={reviewInitialSessionId}
          onClose={() => {
            setReviewOpen(false)
            setReviewInitialSessionId(null)
          }}
          onUpdated={async () => {
            const data = await fetchTeacherExamResults(classId, examId)
            setResults(data)
          }}
        />
      ) : null}

      <ReleaseScoresDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        releasing={releasing}
        onRelease={(opts) => void handleReleaseScores(opts)}
      />
      {ConfirmDialog}
    </div>
  )
}
