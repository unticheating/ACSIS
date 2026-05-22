import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '@/lib/apiFetch.js'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  PG_EXAM_STATUS,
  normalizeExamStatus,
} from '@/lib/examFlowUi.js'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'

import '../../pages/teacher-ui/my_classes.css'

async function copyExamCode(code) {
  const value = code || ''
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    window.prompt('Copy this exam code:', value)
  }
}

export default function TeacherClassExamsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('all')

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/teacher/classes/${classId}/exams`)
        if (!res.ok) {
          throw new Error('Failed to fetch class.')
        }
        const data = await res.json()
        setCls(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [classId, tick])

  const exams = cls?.exams || []
  const filtered = useMemo(() => {
    if (filter === 'ongoing') return exams.filter((e) => isExamOngoing(e.status))
    if (filter === 'drafts') return exams.filter((e) => isExamDraft(e.status))
    if (filter === 'completed') return exams.filter((e) => (e.status || '').toLowerCase() === PG_EXAM_STATUS.CLOSED)
    return exams
  }, [exams, filter])

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view">
        <p className="acsis-mc-sub">Loading...</p>
      </div>
    )
  }

  if (error || !cls) {
    return (
      <div className="acsis-mc-view acsis-view">
        <p className="acsis-mc-sub">This class could not be found.</p>
        <Link to="/teacher/my-classes" className="acsis-stream-back">
          ← Back to My Classes
        </Link>
      </div>
    )
  }

  const createHref = `/teacher/create-exam?classId=${encodeURIComponent(cls.id)}`

  async function publish(classId, examId) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, { method: 'PUT' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish')
      }
      if (data.code) {
        window.alert(`Exam published.\n\nShare this code with students: ${data.code}`)
      }
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function startExam(classId, examId) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/start`, { method: 'PUT' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start exam')
      }
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  async function removeExam(classId, examId, title) {
    if (!window.confirm(`Delete “${title || 'this exam'}”? This cannot be undone.`)) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="acsis-mc-view acsis-view">
      <Link to="/teacher/my-classes" className="acsis-stream-back">
        ← My Classes
      </Link>

      <div className="acsis-stream-banner">
        <h1>{cls.name}</h1>
        <p>
          {cls.academicYear} · {cls.semester}
        </p>
      </div>

      <div className="acsis-mc-head acsis-mc-head--compact">
        <div className="acsis-mc-head__intro">
          <h2 className="acsis-mc-title acsis-mc-title--section">Exams</h2>
        </div>
        <div className="acsis-mc-head__actions">
          <Link to={createHref} className="acsis-link-create">
            Create exam
          </Link>
        </div>
      </div>

      <div className="acsis-mc-tabs" role="tablist" aria-label="Filter exams">
        {[
          { id: 'all', label: 'All' },
          { id: 'ongoing', label: 'On-going' },
          { id: 'drafts', label: 'Drafts' },
          { id: 'completed', label: 'Completed' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={filter === t.id}
            className={`acsis-mc-tab${filter === t.id ? ' acsis-mc-tab--active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="acsis-empty-panel">
          <h2>{filter === 'all' ? 'No exams in this class yet' : 'No exams in this view'}</h2>
          <p>Create an exam to see it listed here, Classroom-style.</p>
          <Link to={createHref} className="acsis-link-create">
            Create exam
          </Link>
        </div>
      ) : (
        <>
          <p className="acsis-stream-section-title">Posted</p>
          <div className="acsis-stream-list">
            {filtered.map((exam) => {
              const active = isExamOngoing(exam.status)
              const draft = isExamDraft(exam.status)
              const detailPath = `/teacher/my-classes/${encodeURIComponent(cls.id)}/exams/${encodeURIComponent(exam.id)}`
              return (
                <div key={exam.id} className="acsis-stream-item">
                  <div className="acsis-stream-item__accent" aria-hidden />
                  <div className="acsis-stream-item__main">
                    <button
                      type="button"
                      className="acsis-stream-item__link"
                      onClick={() => navigate(detailPath)}
                    >
                      <h3 className="acsis-stream-item__title">{exam.title || 'Untitled exam'}</h3>
                      <p className="acsis-stream-item__meta">
                        {Number(exam.questionCount || 0)} questions · {Number(exam.duration || 0)} min
                        {exam.code ? ` · Code ${exam.code}` : ''}
                      </p>
                    </button>
                    <div className="acsis-stream-item__right">
                      <span className={`acsis-pill ${active ? 'acsis-pill--live' : 'acsis-pill--draft'}`}>
                        {labelForPgExamStatus(exam.status)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="acsis-class-card__menu-btn acsis-stream-item__menu"
                            aria-label="Exam options"
                          >
                            <MoreVertical size={18} strokeWidth={2.25} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[11rem]">
                          {draft ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                publish(cls.id, exam.id)
                              }}
                            >
                              Publish exam (share code)
                            </DropdownMenuItem>
                          ) : null}
                          {normalizeExamStatus(exam.status) === PG_EXAM_STATUS.WAITING ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                startExam(cls.id, exam.id)
                              }}
                            >
                              Start exam (go live)
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onSelect={() => {
                              copyExamCode(exam.code)
                            }}
                          >
                            Copy exam code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => removeExam(cls.id, exam.id, exam.title)}
                          >
                            Delete exam
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
