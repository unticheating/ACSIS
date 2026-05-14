import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CLASSES_CHANGED_EVENT,
  CLASSES_STORAGE_KEY,
  deleteExamFromClass,
  ensureClassesMigrated,
  getExamInClass,
  updateExamInClass,
} from '@/lib/classesExams.js'
import '../../pages/teacher-ui/my_classes.css'

async function copyExamCode(code) {
  const value = code || ''
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    window.prompt('Copy this exam code:', value)
  }
}

function isExamActive(status) {
  return (status || '').toLowerCase() === 'active'
}

export default function TeacherExamDetailPage() {
  const { classId, examId } = useParams()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === CLASSES_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(CLASSES_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CLASSES_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  ensureClassesMigrated()
  const hit = useMemo(() => getExamInClass(classId, examId), [classId, examId, tick])

  if (!hit) {
    return (
      <div className="acsis-mc-view acsis-exam-detail">
        <Link to="/teacher/my-classes" className="acsis-stream-back">
          ← My Classes
        </Link>
        <p className="acsis-mc-sub">This exam is not available.</p>
      </div>
    )
  }

  const { classGroup, exam } = hit
  const active = isExamActive(exam.status)
  const streamHref = `/teacher/my-classes/${encodeURIComponent(classGroup.id)}`

  function publish() {
    updateExamInClass(classGroup.id, exam.id, { status: 'Active' })
    refresh()
  }

  function remove() {
    if (!window.confirm(`Delete “${exam.title || 'this exam'}”? This cannot be undone.`)) return
    deleteExamFromClass(classGroup.id, exam.id)
    navigate(streamHref)
  }

  const qs = new URLSearchParams({ classId: String(classGroup.id) })
  const createHref = `/teacher/create-exam?${qs.toString()}`

  return (
    <div className="acsis-mc-view acsis-exam-detail">
      <Link to={streamHref} className="acsis-stream-back">
        ← {classGroup.name}
      </Link>

      <div className="acsis-exam-detail__card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className={`acsis-pill ${active ? 'acsis-pill--live' : 'acsis-pill--draft'}`}>
            {active ? 'On-going' : 'Draft'}
          </span>
        </div>
        <h1>{exam.title || 'Untitled exam'}</h1>
        <p className="acsis-mc-sub" style={{ marginBottom: 0 }}>
          In {classGroup.name} · {classGroup.academicYear} · {classGroup.semester}
        </p>

        <dl className="acsis-exam-detail__meta-grid">
          <div>
            <dt>Exam code</dt>
            <dd className="acsis-exam-detail__code">{exam.code || '—'}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>{Number(exam.questionCount || 0)}</dd>
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
          {!active ? (
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
