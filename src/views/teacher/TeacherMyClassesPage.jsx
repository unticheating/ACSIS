import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimatedHoverIcon from '@/components/icons/AnimatedHoverIcon.jsx'
import { UserPlusIcon } from '@/components/icons/hoverIcons.js'
import { apiFetch } from '@/lib/apiFetch.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import '../../pages/teacher-ui/my_classes.css'

/** @param {{ className?: string, onClick: () => void }} props */
function CreateClassButton({ className = 'acsis-mc-create-btn', onClick }) {
  const iconRef = useRef(null)

  function playAnimation() {
    iconRef.current?.startAnimation?.()
  }

  function stopAnimation() {
    iconRef.current?.stopAnimation?.()
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onMouseEnter={playAnimation}
      onMouseLeave={stopAnimation}
      onFocus={playAnimation}
      onBlur={stopAnimation}
      aria-label="Create class"
    >
      <AnimatedHoverIcon
        ref={iconRef}
        icon={UserPlusIcon}
        size={22}
        strokeWidth={2}
        className="acsis-mc-create-btn__icon"
      />
      <span className="acsis-mc-create-btn__label">Create class</span>
    </button>
  )
}

/** @param {{ c: { id: string, name: string, exams?: unknown[], accessCode?: string, academicYear: string, semester: string } }} props */
function ClassCard({ c }) {
  const navigate = useNavigate()
  const examCount = (c.exams || []).length

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
      </div>
      <p className="acsis-class-card__meta">
        {examCount} {examCount === 1 ? 'exam' : 'exams'}
        <span className="acsis-class-card__code-line">
          Student class code:{' '}
          <strong className="acsis-class-card__code-value">{c.accessCode || '—'}</strong>
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
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createAy, setCreateAy] = useState('2025-2026')
  const [createSem, setCreateSem] = useState('1st')
  const [creating, setCreating] = useState(false)

  const fetchClasses = useCallback(async () => {
    try {
      const res = await apiFetch('/api/teacher/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  async function handleCreateClass(e) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return

    setCreating(true)
    try {
      const res = await apiFetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          academicYear: createAy.trim(),
          semester: createSem.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data.error || 'Failed to create class.')
        return
      }
      setCreateOpen(false)
      setCreateName('')
      setCreateAy('2025-2026')
      setCreateSem('1st')
      await fetchClasses()
    } catch {
      window.alert('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="acsis-mc-view acsis-view">
      <div className="acsis-mc-head">
        <div className="acsis-mc-head__intro">
          <h1 className="acsis-mc-title">My Classes</h1>
          <p className="acsis-mc-sub">Open a class to view and manage its exams.</p>
        </div>
        <div className="acsis-mc-head__actions">
          <CreateClassButton onClick={() => setCreateOpen(true)} />
        </div>
      </div>

      <div className="acsis-mc-tabs" role="tablist" aria-label="View">
        <button type="button" className="acsis-mc-tab acsis-mc-tab--active">
          All
        </button>
      </div>

      {loading ? (
        <div className="acsis-empty-panel">
          <p>Loading your classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="acsis-empty-panel">
          <h2>No classes yet</h2>
          <p>Create a class to get started. Students join with the class code you receive.</p>
          <CreateClassButton
            className="acsis-mc-create-btn acsis-mc-create-btn--empty"
            onClick={() => setCreateOpen(true)}
          />
        </div>
      ) : (
        <div className="acsis-mc-grid">
          {classes.map((c) => (
            <ClassCard key={c.id} c={c} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateClass}>
            <DialogHeader>
              <DialogTitle>Create class</DialogTitle>
              <DialogDescription>
                Add a new class for your students. A unique join code is generated automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="class-name">Class name</Label>
                <Input
                  id="class-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Information Assurance and Security"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="class-ay">Academic year</Label>
                  <Input
                    id="class-ay"
                    value={createAy}
                    onChange={(e) => setCreateAy(e.target.value)}
                    placeholder="2025-2026"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="class-sem">Semester</Label>
                  <Input
                    id="class-sem"
                    value={createSem}
                    onChange={(e) => setCreateSem(e.target.value)}
                    placeholder="1st"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                className="acsis-btn-ghost"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="acsis-link-create" disabled={creating} style={{ border: 'none', cursor: creating ? 'wait' : 'pointer' }}>
                {creating ? 'Creating…' : 'Create class'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
