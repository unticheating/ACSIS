import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
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
import { apiFetch } from '@/lib/apiFetch.js'
import '../../pages/student-ui/enrolled_classes.css'

const NEEDS_JOIN_CLASS_KEY = 'acsis.needsJoinClass'

export default function StudentExamsPage() {
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)
  const [joining, setJoining] = useState(false)
  const [enrolled, setEnrolled] = useState([])
  const [loading, setLoading] = useState(true)

  const [needsJoinClass, setNeedsJoinClass] = useState(
    () => sessionStorage.getItem(NEEDS_JOIN_CLASS_KEY) === '1',
  )
  const showJoinModal = !loading && enrolled.length === 0 && needsJoinClass

  const fetchClasses = useCallback(async () => {
    try {
      const res = await apiFetch('/api/student/classes')
      if (!res.ok) throw new Error('Failed to fetch classes')
      const data = await res.json()
      setEnrolled(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  async function submitJoin(e) {
    e?.preventDefault?.()
    setJoinMsg(null)
    const code = joinCode.trim()
    if (!code) return

    setJoining(true)
    try {
      const res = await apiFetch('/api/student/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code }),
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
      sessionStorage.removeItem(NEEDS_JOIN_CLASS_KEY)
      setNeedsJoinClass(false)
      await fetchClasses()
    } catch {
      setJoinMsg({ type: 'err', text: 'Network error. Try again.' })
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={`acsis-view stu-my-classes${showJoinModal ? ' stu-my-classes--first-visit' : ''}`}>
      <div className="stu-my-classes__content" aria-hidden={showJoinModal}>
        <div className="stu-enroll-hero">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#166534]">Enrolled classes</h1>
            <p className="mt-1 max-w-[75ch] text-sm text-muted-foreground">
              Join with your instructor&apos;s class code (from the teacher&apos;s My Classes page). Open a class to
              see exams newest first — like Classroom.
            </p>
          </div>

          {!showJoinModal ? (
            <div className="stu-enroll-join-box">
              <h2>Join another class</h2>
              <form className="stu-enroll-join-row" onSubmit={submitJoin}>
                <label>
                  Class code
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. AB12CD34"
                    value={joinCode}
                    onChange={(ev) => setJoinCode(ev.target.value.toUpperCase())}
                  />
                </label>
                <Button type="submit" disabled={!joinCode.trim() || joining}>
                  Enroll
                </Button>
              </form>
              {joinMsg ? (
                <p className={`stu-enroll-msg stu-enroll-msg--${joinMsg.type === 'ok' ? 'ok' : 'err'}`}>
                  {joinMsg.text}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="stu-empty">Loading enrolled classes…</div>
        ) : enrolled.length === 0 ? (
          <div className="stu-empty">
            You are not enrolled in any class yet. Enter the class code your instructor shared on this page.
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

      <Dialog open={showJoinModal}>
        <DialogContent
          className="stu-join-dialog"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#166534]">Join a class</DialogTitle>
            <DialogDescription>
              Enter the class code from your instructor. It is linked to the class they created under your school
              (PLP). You must join at least one class to use ACSIS as a student.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stu-class-code">Class code</Label>
              <Input
                id="stu-class-code"
                autoComplete="off"
                placeholder="e.g. AB12CD34"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="uppercase tracking-widest"
                autoFocus
              />
            </div>
            {joinMsg ? (
              <p className={`stu-enroll-msg stu-enroll-msg--${joinMsg.type === 'ok' ? 'ok' : 'err'}`}>
                {joinMsg.text}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={!joinCode.trim() || joining} className="w-full sm:w-auto">
                {joining ? 'Joining…' : 'Join class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
