import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CLASSES_CHANGED_EVENT,
  CLASSES_STORAGE_KEY,
  ensureClassAccessCodes,
  ensureClassesMigrated,
  getClassById,
} from '@/lib/classesExams.js'
import { isEnrolled, STUDENT_ENROLLMENTS_EVENT } from '@/lib/studentEnrollments.js'
import '../../pages/student-ui/enrolled_classes.css'

function isActive(status) {
  return (status || '').toLowerCase() === 'active'
}

export default function StudentClassStreamPage() {
  const { classId } = useParams()
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    ensureClassesMigrated()
    ensureClassAccessCodes()
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CLASSES_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(CLASSES_CHANGED_EVENT, refresh)
    window.addEventListener(STUDENT_ENROLLMENTS_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CLASSES_CHANGED_EVENT, refresh)
      window.removeEventListener(STUDENT_ENROLLMENTS_EVENT, refresh)
    }
  }, [refresh])

  const cls = useMemo(() => getClassById(classId), [classId, tick])
  const allowed = cls && isEnrolled(classId)

  const examsSorted = useMemo(() => {
    const list = [...(cls?.exams || [])]
    list.sort((a, b) => Number(b.id) - Number(a.id))
    return list
  }, [cls])

  if (!cls) {
    return (
      <div className="acsis-view">
        <Link to="/student/my-classes" className="stu-stream-back">
          ← Enrolled classes
        </Link>
        <p className="text-sm text-muted-foreground">This class was not found.</p>
      </div>
    )
  }

  if (!allowed) {
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
                        isActive(exam.status) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isActive(exam.status) ? 'Open' : 'Draft'}
                    </span>
                    {isActive(exam.status) ? (
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
