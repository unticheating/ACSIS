import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTeacherShellBreadcrumbTrail } from '@/context/TeacherShellBreadcrumbContext.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  PG_EXAM_STATUS,
  normalizeExamStatus,
} from '@/lib/examFlowUi.js'
import { Copy, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
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
import { formatCourseBreadcrumbLabel } from '@/lib/sectionLabel.js'
import '../../pages/teacher-ui/my_classes.css'

const EXAM_FILTER_OPTIONS = [
  { id: 'all', label: 'All exams' },
  { id: 'ongoing', label: 'Ongoing exams' },
  { id: 'drafts', label: 'Draft exams' },
  { id: 'completed', label: 'Completed exams' },
]

async function copyText(value) {
  const text = value || ''
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    window.prompt('Copy:', text)
  }
}

async function copyExamCode(code) {
  await copyText(code)
}

export default function TeacherClassExamsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('all')
  const [pageView, setPageView] = useState('exams')

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [enrolled, setEnrolled] = useState([])
  const [enrolledLoading, setEnrolledLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/teacher/classes/${classId}/exams`)
        if (!res.ok) throw new Error('Failed to fetch class.')
        setCls(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [classId, tick])

  useEffect(() => {
    if (pageView !== 'students' || !classId) return
    let cancelled = false
    async function loadEnrolled() {
      setEnrolledLoading(true)
      try {
        const res = await apiFetch(`/api/teacher/classes/${classId}/enrollments`)
        const data = await res.json().catch(() => [])
        if (!cancelled && res.ok) {
          setEnrolled(Array.isArray(data) ? data : [])
        }
      } catch {
        if (!cancelled) setEnrolled([])
      } finally {
        if (!cancelled) setEnrolledLoading(false)
      }
    }
    loadEnrolled()
    return () => {
      cancelled = true
    }
  }, [classId, pageView, tick])

  const exams = cls?.exams || []
  const filtered = useMemo(() => {
    if (filter === 'ongoing') return exams.filter((e) => isExamOngoing(e.status))
    if (filter === 'drafts') return exams.filter((e) => isExamDraft(e.status))
    if (filter === 'completed') return exams.filter((e) => (e.status || '').toLowerCase() === PG_EXAM_STATUS.CLOSED)
    return exams
  }, [exams, filter])

  const breadcrumbTrail = useMemo(() => {
    if (!cls) return null
    return [{ label: formatCourseBreadcrumbLabel(cls) }]
  }, [cls])

  useTeacherShellBreadcrumbTrail(breadcrumbTrail)

  const enrollmentCount = Number(cls?.enrollmentCount ?? 0)

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view">
        <div className="acsis-mc-loading">Loading exams…</div>
      </div>
    )
  }

  if (error || !cls) {
    return (
      <div className="acsis-mc-view acsis-view">
        <p className="acsis-mc-sub">This class could not be found.</p>
        <Link to="/teacher/my-classes" className="acsis-stream-back">
          Back to My Classes
        </Link>
      </div>
    )
  }

  const createHref = `/teacher/create-exam?classId=${encodeURIComponent(cls.id)}`
  const courseCode = (cls.courseCode || '').trim()
  const courseName = (cls.name || '').trim()
  const coursePrimary = courseCode || courseName || 'Course'
  const courseSecondary = courseCode && courseName && courseName !== courseCode ? courseName : null

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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to delete exam.')
      }
      refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  function openEditCourse() {
    setEditCode(cls.courseCode || '')
    setEditName(cls.name || '')
    setEditOpen(true)
  }

  async function saveCourse() {
    const code = editCode.trim()
    const name = editName.trim()
    if (!code && !name) {
      window.alert('Enter a subject code or course name.')
      return
    }
    setSavingCourse(true)
    try {
      const res = await apiFetch(`/api/teacher/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode: code, name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update course.')
      }
      setEditOpen(false)
      refresh()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setSavingCourse(false)
    }
  }

  async function deleteCourse() {
    if (!window.confirm(`Delete “${coursePrimary}”? Students will lose access. This cannot be undone.`)) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${cls.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete course.')
      }
      navigate('/teacher/my-classes')
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <div className="acsis-mc-view acsis-view">
      <section className="acsis-course-banner" aria-label="Course details">
        <div className="acsis-course-banner__menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="acsis-class-card__menu-btn" aria-label="Course options">
                <MoreVertical size={18} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuItem onSelect={openEditCourse}>Edit course</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={deleteCourse}
              >
                Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="acsis-course-banner__copy">
          <h1 className="acsis-course-banner__code">{coursePrimary}</h1>
          {courseSecondary ? <p className="acsis-course-banner__name">{courseSecondary}</p> : null}
        </div>

        {cls.accessCode ? (
          <div className="acsis-course-banner__code-block">
            <span className="acsis-course-banner__code-label">Class code</span>
            <button
              type="button"
              className="acsis-course-banner__code-btn"
              onClick={() => copyText(cls.accessCode)}
              title="Copy class code for students to enroll"
            >
              <code>{cls.accessCode}</code>
              <Copy size={16} strokeWidth={2} aria-hidden />
              <span className="acsis-sr-only">Copy class code</span>
            </button>
          </div>
        ) : null}
      </section>

      <div className="acsis-class-toolbar">
        <div className="acsis-class-toolbar__filters">
          {pageView === 'exams' ? (
            <label className="acsis-class-toolbar__field">
              <span className="acsis-sr-only">Filter exams</span>
              <select
                className="acsis-class-toolbar__select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter exams"
              >
                {EXAM_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            className={`acsis-class-toolbar__students-btn${pageView === 'students' ? ' acsis-class-toolbar__students-btn--on' : ''}`}
            onClick={() => setPageView((v) => (v === 'students' ? 'exams' : 'students'))}
            aria-pressed={pageView === 'students'}
          >
            Enrolled students ({enrollmentCount})
          </button>

          {pageView === 'students' ? (
            <button
              type="button"
              className="acsis-class-toolbar__back-exams"
              onClick={() => setPageView('exams')}
            >
              Back to exams
            </button>
          ) : null}
        </div>

        {pageView === 'exams' ? (
          <Link to={createHref} className="acsis-mc-create-btn acsis-class-toolbar__create">
            Create exam
          </Link>
        ) : null}
      </div>

      <div className="acsis-mc-content">
        {pageView === 'students' ? (
          enrolledLoading ? (
            <p className="acsis-mc-sub">Loading enrolled students…</p>
          ) : enrolled.length === 0 ? (
            <div className="acsis-mc-empty">
              <h2 className="acsis-mc-empty__title">No students enrolled yet</h2>
              <p className="acsis-mc-empty__text">
                Share the class code{cls.accessCode ? ` (${cls.accessCode})` : ''} so students can join from
                Enrolled classes.
              </p>
            </div>
          ) : (
            <ul className="acsis-enrolled-list">
              {enrolled.map((s) => (
                <li key={s.memberId} className="acsis-enrolled-list__item">
                  <div className="acsis-enrolled-list__main">
                    <span className="acsis-enrolled-list__name">{s.studentName}</span>
                    {s.schoolId ? (
                      <span className="acsis-enrolled-list__meta">ID {s.schoolId}</span>
                    ) : null}
                  </div>
                  {s.enrolledAt ? (
                    <time className="acsis-enrolled-list__date" dateTime={s.enrolledAt}>
                      Joined {new Date(s.enrolledAt).toLocaleDateString()}
                    </time>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : filtered.length === 0 ? (
          <div className="acsis-mc-empty">
            <h2 className="acsis-mc-empty__title">
              {filter === 'all' ? 'No exams yet' : 'No exams in this filter'}
            </h2>
            <p className="acsis-mc-empty__text">Create an exam for this course.</p>
            <Link to={createHref} className="acsis-mc-create-btn">
              Create exam
            </Link>
          </div>
        ) : (
          <div className="acsis-mc-stream">
            <ul className="acsis-stream-list">
              {filtered.map((exam) => {
                const active = isExamOngoing(exam.status)
                const draft = isExamDraft(exam.status)
                const detailPath = `/teacher/my-classes/${encodeURIComponent(cls.id)}/exams/${encodeURIComponent(exam.id)}`
                const meta = [
                  `${Number(exam.questionCount || 0)} questions`,
                  `${Number(exam.duration || 0)} min`,
                  exam.code ? `Code ${exam.code}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <li key={exam.id} className="acsis-stream-item">
                    <div className="acsis-stream-item__accent" aria-hidden />
                    <div className="acsis-stream-item__main">
                      <button
                        type="button"
                        className="acsis-stream-item__link"
                        onClick={() => navigate(detailPath)}
                      >
                        <h3 className="acsis-stream-item__title">{exam.title || 'Untitled exam'}</h3>
                        <p className="acsis-stream-item__meta">{meta}</p>
                      </button>
                      <div className="acsis-stream-item__right">
                        <span className={`acsis-pill ${active ? 'acsis-pill--live' : 'acsis-pill--draft'}`}>
                          {labelForPgExamStatus(exam.status)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="acsis-class-card__menu-btn"
                              aria-label="Exam options"
                            >
                              <MoreVertical size={18} strokeWidth={2} />
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
                            <DropdownMenuItem onSelect={() => copyExamCode(exam.code)}>
                              Copy exam code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => {
                                e.preventDefault()
                                removeExam(cls.id, exam.id, exam.title)
                              }}
                            >
                              Delete exam
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
            <DialogDescription>Update the subject code and course title shown to students.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-course-code">Subject code</Label>
              <Input
                id="edit-course-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-course-name">Course name</Label>
              <Input id="edit-course-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="acsis-btn-ghost"
              onClick={() => setEditOpen(false)}
              disabled={savingCourse}
            >
              Cancel
            </button>
            <button type="button" className="acsis-mc-create-btn" onClick={saveCourse} disabled={savingCourse}>
              {savingCourse ? 'Saving…' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
