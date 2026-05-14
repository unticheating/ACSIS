import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import {
  CLASSES_CHANGED_EVENT,
  CLASSES_STORAGE_KEY,
  deleteExamFromClass,
  ensureClassesMigrated,
  getClassById,
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

export default function TeacherClassExamsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('all')

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
  const cls = useMemo(() => getClassById(classId), [classId, tick])

  const exams = cls?.exams || []
  const filtered = useMemo(() => {
    if (filter === 'ongoing') return exams.filter((e) => isExamActive(e.status))
    if (filter === 'drafts') return exams.filter((e) => !isExamActive(e.status))
    if (filter === 'completed') return exams.filter((e) => (e.status || '').toLowerCase() === 'completed')
    return exams
  }, [exams, filter])

  if (!cls) {
    return (
      <div className="acsis-mc-view">
        <p className="acsis-mc-sub">This class could not be found.</p>
        <Link to="/teacher/my-classes" className="acsis-stream-back">
          ← Back to My Classes
        </Link>
      </div>
    )
  }

  const createHref = `/teacher/create-exam?classId=${encodeURIComponent(cls.id)}`

  function publish(classId, examId) {
    updateExamInClass(classId, examId, { status: 'Active' })
    refresh()
  }

  function removeExam(classId, examId, title) {
    if (!window.confirm(`Delete “${title || 'this exam'}”? This cannot be undone.`)) return
    deleteExamFromClass(classId, examId)
    refresh()
  }

  return (
    <div className="acsis-mc-view">
      <Link to="/teacher/my-classes" className="acsis-stream-back">
        ← My Classes
      </Link>

      <div className="acsis-stream-banner">
        <h1>{cls.name}</h1>
        <p>
          {cls.academicYear} · {cls.semester}
        </p>
      </div>

      <div className="acsis-mc-head" style={{ marginBottom: 12 }}>
        <h2 className="acsis-mc-title" style={{ fontSize: '1.15rem', marginBottom: 0 }}>
          Exams
        </h2>
        <Link to={createHref} className="acsis-link-create">
          Create exam
        </Link>
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
              const active = isExamActive(exam.status)
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
                        {active ? 'On-going' : 'Draft'}
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
                          {!active ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                publish(cls.id, exam.id)
                              }}
                            >
                              Publish exam
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
