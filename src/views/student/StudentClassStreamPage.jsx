import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '@/lib/apiFetch.js'
import { isExamEnterableByStudent, labelForPgExamStatus } from '@/lib/examFlowUi.js'
import '../../pages/student-ui/enrolled_classes.css'

export default function StudentClassStreamPage() {
  const { classId } = useParams()

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                        isExamEnterableByStudent(exam.status)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {labelForPgExamStatus(exam.status)}
                    </span>
                    {isExamEnterableByStudent(exam.status) ? (
                      <Link
                        to={`/student/exam/session?classId=${encodeURIComponent(classId)}&examId=${encodeURIComponent(
                          exam.id,
                        )}`}
                        className="stu-stream-enter shrink-0 rounded-full bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-700"
                      >
                        Enter session
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
