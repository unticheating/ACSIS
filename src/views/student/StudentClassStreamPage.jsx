import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '@/lib/apiFetch.js'
import { isExamEnterableByStudent, labelForStudentExam } from '@/lib/examFlowUi.js'
import { joinStudentExam } from '@/lib/studentExamApi.js'
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
      try {
        const res = await apiFetch(`/api/student/classes/${classId}/exams`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to fetch class.')
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
      setJoinError(err instanceof Error ? err.message : 'Could not join exam.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="acsis-view">
        <Link to="/student/my-classes" className="stu-stream-back">
          ← Enrolled classes
        </Link>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error === 'NOT_ENROLLED') {
    return (
      <div className="acsis-view">
        <Link to="/student/my-classes" className="stu-stream-back">
          ← Enrolled classes
        </Link>
        <div className="stu-gmail-banner" role="status">
          <div className="stu-gmail-banner__icon" aria-hidden>
            !
          </div>
          <div className="stu-gmail-banner__body">
            <strong>Not enrolled in this class</strong>
            <p>
              Go back to Enrolled classes and enter the class access code your instructor gave you. After you enroll,
              this stream will show posted exams.
            </p>
          </div>
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
      <div className="acsis-view">
        <Link to="/student/my-classes" className="stu-stream-back">
          ← Enrolled classes
        </Link>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    )
  }

  return (
    <div className="acsis-view">
      <Link to="/student/my-classes" className="stu-stream-back">
        ← Enrolled classes
      </Link>

      <div className="stu-gmail-banner" role="region" aria-label="Class notice">
        <div className="stu-gmail-banner__icon" aria-hidden>
          i
        </div>
        <div className="stu-gmail-banner__body">
          <strong>{cls.name}</strong>
          <p>
            You are enrolled in this class ({cls.academicYear}, {cls.semester}). Below is the stream of exams, newest
            first. Your instructor controls when each exam moves to lobby and live — watch for announcements in class.
          </p>
        </div>
      </div>

      {examsSorted.length === 0 ? (
        <div className="stu-empty">No exams posted in this class yet.</div>
      ) : (
        <>
          <p className="stu-stream-title">Stream</p>
          <div className="stu-stream-list">
            {examsSorted.map((exam) => (
              <div key={exam.id} className="stu-stream-item">
                <div className="stu-stream-item__accent" aria-hidden />
                <div className="stu-stream-item__main">
                  <div>
                    <h3 className="stu-stream-item__title">{exam.title || 'Untitled exam'}</h3>
                    <p className="stu-stream-item__meta">
                      {Number(exam.questionCount || 0)} questions · {Number(exam.duration || 0)} min
                      {exam.code ? ` · Code ${exam.code}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={`stu-pill ${
                        exam.sessionStatus === 'submitted'
                          ? 'stu-pill--done'
                          : isExamEnterableByStudent(exam.status, exam.sessionStatus)
                            ? 'stu-pill--live'
                            : 'stu-pill--muted'
                      }`}
                    >
                      {labelForStudentExam(exam)}
                    </span>
                    {isExamEnterableByStudent(exam.status, exam.sessionStatus) ? (
                      <button
                        type="button"
                        className="stu-stream-enter"
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
              </div>
            ))}
          </div>
        </>
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
