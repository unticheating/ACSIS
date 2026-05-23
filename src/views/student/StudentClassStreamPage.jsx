import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MoreVertical, UserMinus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import { formatCourseDisplayLabels, formatTermPeriod } from '@/lib/sectionLabel.js'
import { isExamEnterableByStudent, labelForStudentExam } from '@/lib/examFlowUi.js'
import { joinStudentExam } from '@/lib/studentExamApi.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import '../../pages/teacher-ui/my_classes.css'
import '../../pages/student-ui/enrolled_classes.css'

export default function StudentClassStreamPage() {
  const { classId } = useParams()
  const navigate = useNavigate()

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [joinExamId, setJoinExamId] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/student/classes/${classId}/exams`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to fetch class.')
        }
        const data = await res.json()
        setCls(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch class.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [classId])

  const examsSorted = useMemo(() => {
    const list = [...(cls?.exams || [])]
    list.sort((a, b) => Number(b.id) - Number(a.id))
    return list
  }, [cls])

  async function submitExamCode(e) {
    e.preventDefault()
    if (!joinExamId) return
    setJoinError(null)
    setJoining(true)
    try {
      await joinStudentExam(classId, joinExamId, joinCode)
      navigate(
        `/student/exam/session?classId=${encodeURIComponent(classId)}&examId=${encodeURIComponent(joinExamId)}`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not join exam.'
      setJoinError(msg)
      acsisToastError(msg)
    } finally {
      setJoining(false)
    }
  }

  async function unenrollFromClass() {
    const { primary } = formatCourseDisplayLabels(cls || {})
    if (
      !window.confirm(
        `Leave “${primary}”? You will need a new class code from your instructor to re-enroll.`,
      )
    ) {
      return
    }
    try {
      const res = await apiFetch(`/api/student/classes/${encodeURIComponent(classId)}/enroll`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to leave class.')
      }
      navigate('/student/my-classes')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to leave class.')
    }
  }

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view">
        <Link to="/student/my-classes" className="acsis-stream-back">
          ← Enrolled classes
        </Link>
        <div className="acsis-mc-loading">Loading class…</div>
      </div>
    )
  }

  if (error === 'NOT_ENROLLED') {
    return (
      <div className="acsis-mc-view acsis-view">
        <Link to="/student/my-classes" className="acsis-stream-back">
          ← Enrolled classes
        </Link>
        <div className="acsis-mc-empty">
          <h2 className="acsis-mc-empty__title">Not enrolled in this class</h2>
          <p className="acsis-mc-empty__text">
            Go back to Enrolled classes and enter the class access code your instructor gave you.
          </p>
          <Link to="/student/my-classes" className="acsis-mc-create-btn">
            Enrolled classes
          </Link>
        </div>
      </div>
    )
  }

  if (error || !cls) {
    const message =
      error === 'Class not found.'
        ? 'This class was not found.'
        : error || 'This class could not be loaded.'
    return (
      <div className="acsis-mc-view acsis-view">
        <Link to="/student/my-classes" className="acsis-stream-back">
          ← Enrolled classes
        </Link>
        <p className="acsis-mc-sub">{message}</p>
      </div>
    )
  }

  const { primary, secondary } = formatCourseDisplayLabels(cls)
  const period = formatTermPeriod(cls)

  return (
    <div className="acsis-mc-view acsis-view">
      <Link to="/student/my-classes" className="acsis-stream-back">
        ← Enrolled classes
      </Link>

      <FadeIn as="section" delay={0.05} className="acsis-course-banner cyber-banner" aria-label="Course details">
        <div className="acsis-course-banner__menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="acsis-class-card__menu-btn" aria-label="Class options">
                <MoreVertical size={18} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuActionItem icon={UserMinus} variant="destructive" onSelect={unenrollFromClass}>
                Unenroll from class
              </DropdownMenuActionItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="acsis-course-banner__bottom-row">
          <div className="acsis-course-banner__copy">
            <h1 className="acsis-course-banner__code">{primary}</h1>
            {secondary ? <p className="acsis-course-banner__name">{secondary}</p> : null}
            {period ? <p className="acsis-course-banner__period">{period}</p> : null}
          </div>
        </div>
      </FadeIn>

      {examsSorted.length === 0 ? (
        <div className="acsis-mc-empty">
          <h2 className="acsis-mc-empty__title">No exams yet</h2>
          <p className="acsis-mc-empty__text">Your instructor has not posted any exams in this class.</p>
        </div>
      ) : (
        <div className="acsis-mc-stream">
          <ul className="acsis-stream-list">
            {examsSorted.map((exam, index) => (
              <FadeIn as="li" delay={0.1 + (index * 0.05)} key={exam.id} className="acsis-stream-item acsis-card-surface">
                <div className="acsis-stream-item__accent" aria-hidden />
                <div className="acsis-stream-item__main">
                  <div className="acsis-stream-item__link" style={{ cursor: 'default' }}>
                    <h3 className="acsis-stream-item__title">{exam.title || 'Untitled exam'}</h3>
                    {exam.description && (
                      <p className="acsis-stream-item__desc">{exam.description}</p>
                    )}
                    <p className="acsis-stream-item__meta">
                      {Number(exam.questionCount || 0)} questions · {Number(exam.duration || 0)} min
                      {exam.requiresPassword ? ` · Password required to enter` : ''}
                    </p>
                  </div>
                  <div className="acsis-stream-item__right">
                    <span
                      className={`acsis-pill ${
                        exam.sessionStatus === 'submitted'
                          ? 'acsis-pill--draft'
                          : isExamEnterableByStudent(exam.status, exam.sessionStatus)
                            ? 'acsis-pill--live'
                            : 'acsis-pill--draft'
                      }`}
                    >
                      {labelForStudentExam(exam)}
                    </span>
                    {isExamEnterableByStudent(exam.status, exam.sessionStatus) ? (
                      <button
                        type="button"
                        className="acsis-mc-create-btn"
                        style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                        onClick={() => {
                          setJoinExamId(exam.id)
                          setJoinCode('')
                          setJoinError(null)
                        }}
                      >
                        Enter exam code
                      </button>
                    ) : null}
                  </div>
                </div>
              </FadeIn>
            ))}
          </ul>
        </div>
      )}

      {joinExamId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-exam-title"
        >
          <form
            onSubmit={submitExamCode}
            className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg border border-border"
          >
            <h2 id="join-exam-title" className="text-lg font-semibold text-foreground">
              Enter exam code
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your instructor will give you a short code after publishing the exam.
            </p>
            <input
              type="text"
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest uppercase text-foreground"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoFocus
              maxLength={12}
            />
            {joinError ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {joinError}
              </p>
            ) : null}
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                onClick={() => setJoinExamId(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {joining ? 'Checking…' : 'Join lobby'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
