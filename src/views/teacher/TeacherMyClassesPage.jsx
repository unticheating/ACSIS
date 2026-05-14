import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import {
  CLASSES_CHANGED_EVENT,
  CLASSES_STORAGE_KEY,
  ensureClassesMigrated,
  ensureClassAccessCodes,
  getClasses,
} from '@/lib/classesExams.js'
import '../../pages/teacher-ui/my_classes.css'

function ClassCard({ c }) {
  const navigate = useNavigate()
  const examCount = (c.exams || []).length
  const createHref = `/teacher/create-exam?classId=${encodeURIComponent(c.id)}`

  const openClass = useCallback(() => {
    navigate(`/teacher/my-classes/${encodeURIComponent(c.id)}`)
  }, [c.id, navigate])

  return (
    <article
      className="acsis-class-card"
      role="button"
      tabIndex={0}
      onClick={openClass}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openClass()
        }
      }}
    >
      <div className="acsis-class-card__top">
        <h3 className="acsis-class-card__name">{c.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="acsis-class-card__menu-btn"
              aria-label="Class options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={18} strokeWidth={2.25} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuItem asChild>
              <Link to={createHref} onClick={(e) => e.stopPropagation()}>
                Create exam
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="acsis-class-card__meta">
        {examCount} {examCount === 1 ? 'exam' : 'exams'}
        <span style={{ display: 'block', marginTop: 6, fontSize: '0.75rem', color: '#6b7280' }}>
          Student class code:{' '}
          <strong style={{ letterSpacing: '0.05em', color: '#166534' }}>{c.accessCode || '—'}</strong>
        </span>
      </p>
      <div className="acsis-class-card__footer">
        <span>
          {c.academicYear} · {c.semester}
        </span>
        <span className="acsis-class-card__status acsis-class-card__status--open">Open</span>
      </div>
    </article>
  )
}

export default function TeacherMyClassesPage() {
  const [classes, setClasses] = useState(() => {
    ensureClassesMigrated()
    ensureClassAccessCodes()
    return getClasses()
  })

  const refresh = useCallback(() => {
    ensureClassesMigrated()
    ensureClassAccessCodes()
    setClasses(getClasses())
  }, [])

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
  const firstId = classes[0]?.id
  const defaultCreateHref = firstId
    ? `/teacher/create-exam?classId=${encodeURIComponent(firstId)}`
    : '/teacher/create-exam'

  return (
    <div className="acsis-mc-view">
      <div className="acsis-mc-head">
        <div>
          <h1 className="acsis-mc-title">My Classes</h1>
          <p className="acsis-mc-sub">Open a class to view and manage its exams.</p>
        </div>
        <Link to={defaultCreateHref} className="acsis-link-create">
          Create exam
        </Link>
      </div>

      <div className="acsis-mc-tabs" role="tablist" aria-label="View">
        <button type="button" className="acsis-mc-tab acsis-mc-tab--active">
          All
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="acsis-empty-panel">
          <h2>No classes yet</h2>
          <p>Classes are managed from the admin workspace. Once a class exists, it appears here as a card.</p>
          <Link to="/teacher/create-exam" className="acsis-link-create">
            Create exam
          </Link>
        </div>
      ) : (
        <div className="acsis-mc-grid">
          {classes.map((c) => (
            <ClassCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}
