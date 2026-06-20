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
import { Copy, ChevronDown, ClipboardList, MoreVertical, Palette, Pencil, Play, Send, Trash2, UserMinus, Users, Search } from 'lucide-react'
import ClassCourseHeader from '@/components/classes/ClassCourseHeader.jsx'
import ClassHeaderAppearancePicker from '@/components/classes/ClassHeaderAppearancePicker.jsx'
import { normalizeHeaderPattern } from '@/lib/classCardPatterns.js'
import { normalizeHeaderColor } from '@/lib/classHeaderColor.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import TeacherCourseFieldsWithSuggest, {
  useTeacherCourseCatalogHint,
} from '@/components/teacher/TeacherCourseFieldsWithSuggest.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
import { coerceDisplayString, coerceRouteParam } from '@/lib/coerceDisplay.js'
import { formatCourseBreadcrumbLabel, formatCourseDisplayLabels } from '@/lib/sectionLabel.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { copyToClipboard } from '@/lib/copyToClipboard.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import '../../pages/teacher-ui/my_classes.css'
import '../../styles/class-card-patterns.css'

const EXAM_FILTER_OPTIONS = [
  { id: 'all', label: 'All exams' },
  { id: 'ongoing', label: 'Ongoing exams' },
  { id: 'drafts', label: 'Draft exams' },
  { id: 'completed', label: 'Completed exams' },
]

export default function TeacherClassExamsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('all')
  const [pageView, setPageView] = useState('exams')

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [enrolled, setEnrolled] = useState([])
  const [enrolledLoading, setEnrolledLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [teacherCoursesCatalog, setTeacherCoursesCatalog] = useState([])

  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [patternDraft, setPatternDraft] = useState('grid')
  const [colorDraft, setColorDraft] = useState(null)
  const [savingAppearance, setSavingAppearance] = useState(false)

  useEffect(() => {
    if (!editOpen) return
    let cancelled = false
    apiFetch('/api/teacher/classes')
      .then((res) => res.json().catch(() => []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setTeacherCoursesCatalog(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [editOpen])

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

  const editCatalogHint = useTeacherCourseCatalogHint(teacherCoursesCatalog, {
    excludeClassId: cls?.id ?? null,
  })

  const enrollmentCount = useMemo(() => {
    const fromApi = Number(cls?.enrollmentCount ?? 0)
    if (pageView === 'students' && !enrolledLoading) {
      return Math.max(fromApi, enrolled.length)
    }
    return fromApi
  }, [cls?.enrollmentCount, pageView, enrolledLoading, enrolled.length])

  const filteredEnrolled = useMemo(() => {
    if (!studentSearch.trim()) return enrolled
    const q = studentSearch.toLowerCase()
    return enrolled.filter(s => 
      (s.studentName || '').toLowerCase().includes(q) || 
      (s.schoolId || '').toLowerCase().includes(q)
    )
  }, [enrolled, studentSearch])

  async function kickStudent(memberId, studentName) {
    const ok = await confirm({
      title: `Remove ${studentName}?`,
      description: 'This student will be removed from the class.',
      confirmLabel: 'Remove student',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${cls.id}/enrollments/${memberId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove student.')
      }
      acsisToastSuccess(`${studentName} removed from class.`)
      refresh()
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view">
        <PageSpinner label="Loading exams…" />
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

  const createHref = `/teacher/create-exam?classId=${coerceRouteParam(cls.id)}`
  const { primary: coursePrimary, secondary: courseSecondary } = formatCourseDisplayLabels(cls)

  async function publish(classId, examId) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, { method: 'PUT' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish')
      }
      if (data.code) {
        acsisToastSuccess(`Exam published. Share this code with students: ${data.code}`)
      } else {
        acsisToastSuccess('Exam published.')
      }
      refresh()
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function startExam(classId, examId) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/start`, { method: 'PUT' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start exam')
      }
      acsisToastSuccess('Exam is now live.')
      refresh()
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function removeExam(classId, examId, title) {
    const ok = await confirm({
      title: `Delete “${title || 'this exam'}”?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete exam',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to delete exam.')
      }
      acsisToastSuccess('Exam deleted.')
      refresh()
    } catch (err) {
      acsisToastError(err.message)
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
      acsisToastError('Enter a subject code or course name.')
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
      setCls((prev) =>
        prev
          ? {
              ...prev,
              ...data,
              exams: prev.exams,
              headerPattern: data.headerPattern ?? prev.headerPattern,
              headerColor:
                Object.hasOwn(data, 'headerColor') ? data.headerColor : prev.headerColor,
            }
          : prev,
      )
      setEditOpen(false)
      acsisToastSuccess('Course updated.')
      refresh()
    } catch (err) {
      acsisToastError(err.message)
    } finally {
      setSavingCourse(false)
    }
  }

  function openAppearanceDialog() {
    setPatternDraft(normalizeHeaderPattern(cls?.headerPattern))
    setColorDraft(normalizeHeaderColor(cls?.headerColor))
    setAppearanceOpen(true)
  }

  async function saveAppearance() {
    if (!cls?.id) return
    setSavingAppearance(true)
    try {
      const res = await apiFetch(`/api/teacher/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerPattern: patternDraft,
          headerColor: colorDraft,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update background.')
      }
      setCls((prev) =>
        prev
          ? {
              ...prev,
              headerPattern: patternDraft,
              headerColor: colorDraft,
            }
          : prev,
      )
      acsisToastSuccess('Class appearance updated.')
      setAppearanceOpen(false)
      refresh()
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to update background.')
    } finally {
      setSavingAppearance(false)
    }
  }

  async function deleteCourse() {
    const ok = await confirm({
      title: `Delete “${coursePrimary}”?`,
      description: 'Students will lose access. This cannot be undone.',
      confirmLabel: 'Delete course',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${cls.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete course.')
      }
      acsisToastSuccess('Course deleted.')
      navigate('/teacher/my-classes')
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  return (
    <div className="acsis-mc-view acsis-view">
      <ClassCourseHeader
        course={cls}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="acsis-class-card__menu-btn" aria-label="Course options">
                <MoreVertical size={18} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuActionItem icon={Palette} onSelect={openAppearanceDialog}>
                Change background
              </DropdownMenuActionItem>
              <DropdownMenuActionItem icon={Pencil} onSelect={openEditCourse}>
                Edit course
              </DropdownMenuActionItem>
              {cls.accessCode ? (
                <DropdownMenuActionItem icon={Copy} onSelect={() => void copyToClipboard(cls.accessCode, { successMessage: 'Class code copied.' })}>
                  Copy class code
                </DropdownMenuActionItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuActionItem icon={Trash2} variant="destructive" onSelect={deleteCourse}>
                Delete course
              </DropdownMenuActionItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        extra={
          cls.accessCode ? (
            <div className="acsis-course-banner__code-block acsis-course-banner__code-block--desktop-only">
              <span className="acsis-course-banner__code-label">Class code</span>
              <button
                type="button"
                className="acsis-course-banner__code-btn"
                onClick={() => void copyToClipboard(cls.accessCode, { successMessage: 'Access code copied.' })}
                title="Copy class code for students to enroll"
              >
                <code>{cls.accessCode}</code>
                <Copy size={16} strokeWidth={2} aria-hidden />
                <span className="acsis-sr-only">Copy class code</span>
              </button>
            </div>
          ) : null
        }
      />

      <div className="acsis-class-toolbar">
        <div className="acsis-class-toolbar__filters">
          {pageView === 'exams' ? (
            <label className="acsis-class-toolbar__field acsis-class-toolbar__field--select">
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
              <ChevronDown size={14} strokeWidth={2.5} className="acsis-class-toolbar__select-chevron" aria-hidden />
            </label>
          ) : null}

          <button
            type="button"
            className={`acsis-class-toolbar__students-btn${pageView === 'students' ? ' acsis-class-toolbar__students-btn--on' : ''}`}
            onClick={() => setPageView((v) => (v === 'students' ? 'exams' : 'students'))}
            aria-pressed={pageView === 'students'}
          >
            <Users size={15} strokeWidth={2} aria-hidden />
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
          !cls.isArchived && (
            <Link to={createHref} className="acsis-mc-create-btn acsis-class-toolbar__create">
              Create exam
            </Link>
          )
        ) : (
          <div className="relative ml-auto w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="text"
              placeholder="Search students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="flex h-9 w-full sm:w-[200px] rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Search enrolled students"
            />
          </div>
        )}
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
          ) : filteredEnrolled.length === 0 ? (
            <div className="acsis-mc-empty">
              <h2 className="acsis-mc-empty__title">No matches found</h2>
              <p className="acsis-mc-empty__text">No students match your search.</p>
            </div>
          ) : (
            <ul className="acsis-enrolled-list">
              {filteredEnrolled.map((s, index) => (
                <FadeIn
                  as="li"
                  key={coerceDisplayString(s.memberId, `enrolled-${index}`)}
                  delay={index * 0.05}
                  className="acsis-enrolled-list__item flex items-center"
                >
                  <div className="flex h-10 w-10 shrink-0 overflow-hidden items-center justify-center rounded-full bg-muted text-muted-foreground font-medium select-none">
                    {s.avatarUrl || s.avatar ? (
                      <img src={s.avatarUrl || s.avatar} alt={s.studentName} className="h-full w-full object-cover" />
                    ) : (
                      s.studentName ? s.studentName[0].toUpperCase() : '?'
                    )}
                  </div>
                  <div className="acsis-enrolled-list__main flex-1 flex flex-col justify-center gap-0.5">
                    <span className="acsis-enrolled-list__name font-medium">{s.studentName}</span>
                    {s.schoolId ? (
                      <span className="acsis-enrolled-list__meta text-muted-foreground text-sm">ID {s.schoolId}</span>
                    ) : null}
                  </div>
                  {s.enrolledAt ? (
                    <time className="acsis-enrolled-list__date" dateTime={s.enrolledAt}>
                      Joined {new Date(s.enrolledAt).toLocaleDateString()}
                    </time>
                  ) : null}
                  <button
                    type="button"
                    className="ml-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Remove from class"
                    onClick={() => kickStudent(s.memberId, s.studentName)}
                  >
                    <UserMinus size={18} strokeWidth={2} />
                    <span className="sr-only">Remove student</span>
                  </button>
                </FadeIn>
              ))}
            </ul>
          )
        ) : filtered.length === 0 ? (
          <div className="acsis-mc-empty acsis-mc-empty--exams">
            <div className="acsis-mc-empty__icon" aria-hidden>
              <ClipboardList size={40} strokeWidth={1.5} />
            </div>
            <h2 className="acsis-mc-empty__title">
              {filter === 'all' ? 'No exams yet' : 'No exams in this filter'}
            </h2>
            {filter === 'all' && !cls.isArchived ? (
              <>
                <p className="acsis-mc-empty__text">Create your first exam for this course and share it with students.</p>
                <Link to={createHref} className="acsis-mc-create-btn">
                  Create exam
                </Link>
              </>
            ) : filter !== 'all' ? (
              <p className="acsis-mc-empty__text">Try switching the filter to see all exams.</p>
            ) : null}
          </div>
        ) : (
          <div className="acsis-mc-stream">
            <ul className="acsis-stream-list">
              {filtered.map((exam, index) => {
                const active = isExamOngoing(exam.status)
                const draft = isExamDraft(exam.status)
                const detailPath = `/teacher/my-classes/${coerceRouteParam(cls.id)}/exams/${coerceRouteParam(exam.id)}`
                const meta = [
                  `${Number(exam.questionCount || 0)} questions`,
                  `${Number(exam.duration || 0)} min`,
                  exam.code ? `Code ${exam.code}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <FadeIn
                    as="li"
                    key={coerceDisplayString(exam.id, `exam-${index}`)}
                    delay={index * 0.05}
                    className="acsis-stream-item acsis-card-surface"
                  >
                    <div className="acsis-stream-item__accent" aria-hidden />
                    <div className="acsis-stream-item__main">
                      <button
                        type="button"
                        className="acsis-stream-item__link"
                        onClick={() => navigate(detailPath)}
                      >
                        <h3 className="acsis-stream-item__title">{exam.title || 'Untitled exam'}</h3>
                        {exam.description && (
                          <p className="acsis-stream-item__desc">{exam.description}</p>
                        )}
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
                              <DropdownMenuActionItem
                                icon={Send}
                                variant="success"
                                onSelect={() => {
                                  publish(cls.id, exam.id)
                                }}
                              >
                                Publish exam (share code)
                              </DropdownMenuActionItem>
                            ) : null}
                            {normalizeExamStatus(exam.status) === PG_EXAM_STATUS.WAITING ? (
                              <DropdownMenuActionItem
                                icon={Play}
                                variant="success"
                                onSelect={() => {
                                  startExam(cls.id, exam.id)
                                }}
                              >
                                Start exam (go live)
                              </DropdownMenuActionItem>
                            ) : null}
                            <DropdownMenuActionItem
                              icon={Copy}
                              onSelect={() =>
                                void copyToClipboard(exam.code, { successMessage: 'Exam code copied.' })
                              }
                            >
                              Copy exam code
                            </DropdownMenuActionItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuActionItem
                              icon={Trash2}
                              variant="destructive"
                              onSelect={(e) => {
                                e.preventDefault()
                                removeExam(cls.id, exam.id, exam.title)
                              }}
                            >
                              Delete exam
                            </DropdownMenuActionItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </FadeIn>
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
            <DialogDescription>
              Update the subject code and course title shown to students.
              {editOpen ? editCatalogHint : null}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <TeacherCourseFieldsWithSuggest
              idPrefix="edit"
              active={editOpen}
              existingCourses={teacherCoursesCatalog}
              excludeClassId={cls?.id}
              courseCode={editCode}
              courseName={editName}
              onCourseCodeChange={setEditCode}
              onCourseNameChange={setEditName}
            />
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

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Class background</DialogTitle>
            <DialogDescription>
              Pick a background color and pattern. Students see the same look on the class page and enrolled classes list.
            </DialogDescription>
          </DialogHeader>
          <ClassHeaderAppearancePicker
            pattern={patternDraft}
            onPatternChange={setPatternDraft}
            color={colorDraft}
            onColorChange={setColorDraft}
            disabled={savingAppearance}
          />
          <DialogFooter>
            <button
              type="button"
              className="acsis-btn-ghost"
              onClick={() => setAppearanceOpen(false)}
              disabled={savingAppearance}
            >
              Cancel
            </button>
            <button
              type="button"
              className="acsis-mc-create-btn"
              onClick={saveAppearance}
              disabled={savingAppearance}
            >
              {savingAppearance ? 'Saving…' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  )
}
