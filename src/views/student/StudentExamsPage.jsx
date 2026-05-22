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
  
  // State to track manual activation of the enrollment dialog
  const [isManualOpen, setIsManualOpen] = useState(false)

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
      
      // Auto-close manual dialog after 1.5 seconds so the user can read the success message
      if (isManualOpen) {
        setTimeout(() => {
          setIsManualOpen(false)
          setJoinMsg(null)
        }, 1500)
      }
      
      await fetchClasses()
    } catch {
      setJoinMsg({ type: 'err', text: 'Network error. Try again.' })
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className={`acsis-view stu-my-classes${showJoinModal ? ' stu-my-classes--first-visit' : ''}`}>
      <div className="stu-my-classes__content" aria-hidden={showJoinModal || isManualOpen}>
        
        {/* Header Layout: Title and Description on the left, Enroll button on the far right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Enrolled classes
            </h1>
            <p className="mt-1 max-w-[75ch] text-sm text-muted-foreground">
              Open a class to see exams newest first — like Classroom.
            </p>
          </div>

          <Button
            onClick={() => setIsManualOpen(true)}
            className="font-semibold rounded-xl px-5 py-2.5 shadow-sm transition self-start sm:self-auto shrink-0 hover:-translate-y-px"
          >
            Enroll in a Class
          </Button>
        </div>

        {loading ? (
          <div className="stu-empty mt-8">Loading enrolled classes…</div>
        ) : enrolled.length === 0 ? (
          <div className="stu-empty mt-8">
            You are not enrolled in any class yet. Click the Enroll button to enter a class code.
          </div>
        ) : (
          /* Enhanced Larger Card Layout Grid */
          <div className="stu-class-grid grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {enrolled.map((c) => (
              <Link 
                key={c.id} 
                to={`/student/my-classes/${encodeURIComponent(c.id)}`} 
                className="stu-class-card group block p-6 min-h-[150px] rounded-2xl border border-border transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {c.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Academic Year: {c.academicYear} · {c.semester}
                </p>
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider uppercase text-primary">
                    {(c.exams || []).length} exam{(c.exams || []).length === 1 ? '' : 's'} posted
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition">
                    View Stream →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Unified Dialog Handler */}
      <Dialog 
        open={showJoinModal || isManualOpen} 
        onOpenChange={(open) => {
          if (!open && !showJoinModal) {
            setIsManualOpen(false)
            setJoinMsg(null)
            setJoinCode('')
          }
        }}
      >
        <DialogContent
          className="stu-join-dialog w-[90vw] max-w-md rounded-2xl sm:rounded-2xl"
          onInteractOutside={(e) => { if (showJoinModal) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (showJoinModal) e.preventDefault() }}
        >
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">Join a class</DialogTitle>
            <DialogDescription>
              Enter the class code from your instructor. It is linked to the class they created under your school (PLP).
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
                className="uppercase tracking-widest text-center font-mono text-lg py-5"
                autoFocus
              />
            </div>
            {joinMsg ? (
              <p className={`stu-enroll-msg stu-enroll-msg--${joinMsg.type === 'ok' ? 'ok' : 'err'}`}>
                {joinMsg.text}
              </p>
            ) : null}
            <DialogFooter className="flex gap-2 sm:justify-end">
              {!showJoinModal && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    setIsManualOpen(false)
                    setJoinMsg(null)
                    setJoinCode('')
                  }}
                >
                  Cancel
                </Button>
              )}
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