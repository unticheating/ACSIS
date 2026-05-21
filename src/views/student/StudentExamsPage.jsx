import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { useSession } from '@/context/SessionContext.jsx'
import '../../pages/student-ui/enrolled_classes.css'

export default function StudentExamsPage() {
  const { sessionMode, activeAccount } = useSession()
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)
  const [enrolled, setEnrolled] = useState([])
  const [loading, setLoading] = useState(true)

  const getHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' }
    if (sessionMode === 'demo') {
      headers['x-demo-account'] = activeAccount?.id || 'student'
    }
    return headers
  }, [sessionMode, activeAccount])

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/student/classes', { 
        headers: getHeaders(),
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch classes')
      const data = await res.json()
      setEnrolled(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [getHeaders])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  async function submitJoin(e) {
    e.preventDefault()
    setJoinMsg(null)

    try {
      const res = await fetch('/api/student/enroll', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ accessCode: joinCode })
      })
      const data = await res.json()

      if (!res.ok) {
        setJoinMsg({ type: 'err', text: data.error || 'Failed to enroll' })
        return
      }

      setJoinMsg({
        type: 'ok',
        text: data.already ? `You are already in ${data.className}.` : `Added to ${data.className}.`,
      })
      setJoinCode('')
      fetchClasses()
    } catch (err) {
      setJoinMsg({ type: 'err', text: 'Network error. Try again.' })
    }
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
            <Button type="submit" disabled={!joinCode.trim()}>Enroll</Button>
          </form>
          {joinMsg ? (
            <p className={`stu-enroll-msg stu-enroll-msg--${joinMsg.type === 'ok' ? 'ok' : 'err'}`}>{joinMsg.text}</p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="stu-empty">Loading enrolled classes...</div>
      ) : enrolled.length === 0 ? (
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
