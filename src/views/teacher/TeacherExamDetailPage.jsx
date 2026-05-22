import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '@/lib/apiFetch.js'
import { isExamDraft, isExamOngoing, labelForPgExamStatus } from '@/lib/examFlowUi.js'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    async function fetchExam() {
      if (!classId || !examId) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`)
        if (!res.ok) {
          throw new Error('Exam not found or you do not have permission.')
        }
        const data = await res.json()
        // data will have { id, class_group_id, title, status, ... }
        setHit(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchExam()
  }, [classId, examId, refreshTick])

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <p className="acsis-mc-sub">Loading exam details...</p>
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
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to publish exam.')
      }
      setRefreshTick(t => t + 1)
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

  return (
    <div className="acsis-mc-view acsis-view acsis-exam-detail">
      <Link to={streamHref} className="acsis-stream-back">
        ← Back to class stream
      </Link>

      <div className="acsis-exam-detail__card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className={`acsis-pill ${active ? 'acsis-pill--live' : 'acsis-pill--draft'}`}>
            {labelForPgExamStatus(exam.status)}
          </span>
        </div>
        <h1>{exam.title || 'Untitled exam'}</h1>
        
        {exam.class_name && (
          <p className="acsis-mc-sub" style={{ marginBottom: 0 }}>
            In {exam.class_name} · {exam.academic_year} · {exam.semester}
          </p>
        )}

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
              Publish exam
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
          When this exam is on-going, students join with the code above. Use Detections and Reports in the sidebar to
          follow sessions and results.
        </p>
      </div>
    </div>
  )
}
