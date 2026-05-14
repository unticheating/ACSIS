import { useCallback, useEffect, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import {
  CLASSES_CHANGED_EVENT,
  CLASSES_STORAGE_KEY,
  ensureClassAccessCodes,
  ensureClassesMigrated,
  getClasses,
} from '@/lib/classesExams.js'
import {
  enrollByAccessCode,
  getEnrolledClassIds,
  STUDENT_ENROLLMENTS_EVENT,
} from '@/lib/studentEnrollments.js'
import '../../pages/student-ui/enrolled_classes.css'

export default function StudentExamsPage() {
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)
  const [, rerender] = useReducer((x) => x + 1, 0)
  const refresh = useCallback(() => rerender(), [])

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

  const enrolledIds = getEnrolledClassIds()
  const all = getClasses()
  const enrolled = all.filter((c) => enrolledIds.includes(String(c.id)))

  function submitJoin(e) {
    e.preventDefault()
    setJoinMsg(null)
    const res = enrollByAccessCode(joinCode)
    if (!res.ok) {
      setJoinMsg({ type: 'err', text: res.error })
      return
    }
    setJoinMsg({
      type: 'ok',
      text: res.already ? `You are already in ${res.className}.` : `Added to ${res.className}.`,
    })
    setJoinCode('')
  }

  return (
    <div className="acsis-view">
      <div className="stu-enroll-hero">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#166534]">Enrolled classes</h1>
          <p className="mt-1 max-w-[75ch] text-sm text-muted-foreground">
            Join with your instructor&apos;s class access code. Open a class to see exams newest first — like Classroom.
          </p>
        </div>

        <div className="stu-enroll-join-box">
          <h2>Join a class</h2>
          <form className="stu-enroll-join-row" onSubmit={submitJoin}>
            <label>
              Class access code
              <input
                type="text"
                autoComplete="off"
                placeholder="e.g. PLP-DEFAULT"
                value={joinCode}
                onChange={(ev) => setJoinCode(ev.target.value.toUpperCase())}
              />
            </label>
            <Button type="submit">Enroll</Button>
          </form>
          {joinMsg ? (
            <p className={`stu-enroll-msg stu-enroll-msg--${joinMsg.type === 'ok' ? 'ok' : 'err'}`}>{joinMsg.text}</p>
          ) : null}
        </div>
      </div>

      {enrolled.length === 0 ? (
        <div className="stu-empty">
          You are not enrolled in any class yet. Enter the access code your instructor shared (often on the course
          syllabus), then open the class card below once it appears.
        </div>
      ) : (
        <div className="stu-class-grid">
          {enrolled.map((c) => (
            <Link key={c.id} to={`/student/my-classes/${encodeURIComponent(c.id)}`} className="stu-class-card">
              <h3>{c.name}</h3>
              <p>
                {c.academicYear} · {c.semester} · {(c.exams || []).length} exam
                {(c.exams || []).length === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
