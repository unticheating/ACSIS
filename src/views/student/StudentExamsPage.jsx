import { useCallback, useEffect, useState } from 'react'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.jsx'
import StudentCourseCard from '@/components/student/StudentCourseCard.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
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
import { Button } from '@/components/ui/button.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import '../../pages/teacher-ui/my_classes.css'
import '../../styles/class-card-patterns.css'
import '../../pages/student-ui/enrolled_classes.css'

const NEEDS_JOIN_CLASS_KEY = 'acsis.needsJoinClass'

export default function StudentExamsPage() {
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState(null)
  const [joining, setJoining] = useState(false)
  const [enrolled, setEnrolled] = useState([])
  const [loading, setLoading] = useState(true)
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
    if (!code) {
      acsisToastError('Enter your class access code.')
      return
    }

    setJoining(true)
    try {
      const res = await apiFetch('/api/student/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code }),
      })
      const data = await res.json()

      if (!res.ok) {
        const msg = data.error || 'Failed to enroll.'
        setJoinMsg({ type: 'err', text: msg })
        acsisToastError(msg)
        return
      }

      const okText = data.already ? `You are already in ${data.className}.` : `Added to ${data.className}.`
      setJoinMsg({ type: 'ok', text: okText })
      acsisToastSuccess(okText)
      setJoinCode('')
      sessionStorage.removeItem(NEEDS_JOIN_CLASS_KEY)
      setNeedsJoinClass(false)

      if (isManualOpen) {
        setTimeout(() => {
          setIsManualOpen(false)
          setJoinMsg(null)
        }, 1500)
      }

      await fetchClasses()
    } catch {
      const msg = 'Network error. Try again.'
      setJoinMsg({ type: 'err', text: msg })
      acsisToastError(msg)
    } finally {
      setJoining(false)
    }
  }

  async function handleDragEnd(result) {
    if (!result.destination) return

    const items = Array.from(enrolled)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setEnrolled(items)

    try {
      const classIds = items.map((c) => c.id)
      await apiFetch('/api/student/classes/sort', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classIds })
      })
    } catch (err) {
      console.error('Failed to save sort order:', err)
      acsisToastError('Failed to save class order.')
    }
  }

  const headerMeta = loading
    ? undefined
    : `${enrolled.length} ${enrolled.length === 1 ? 'class' : 'classes'}`

  return (
    <div className={`acsis-mc-view acsis-view stu-my-classes${showJoinModal ? ' stu-my-classes--first-visit' : ''}`}>
      <div className="stu-my-classes__content" aria-hidden={showJoinModal || isManualOpen}>
        <TeacherPageHeader
          title="Enrolled classes"
          meta={headerMeta}
          actions={
            <button type="button" className="acsis-mc-create-btn" onClick={() => setIsManualOpen(true)}>
              Enroll in a class
            </button>
          }
        />

        <div className="acsis-mc-content">
          {loading ? (
            <div className="acsis-mc-loading">Loading enrolled classes…</div>
          ) : enrolled.length === 0 ? (
            <div className="acsis-mc-empty">
              <h2 className="acsis-mc-empty__title">No classes yet</h2>
              <p className="acsis-mc-empty__text">
                Enter the class code from your instructor to join and see exams here.
              </p>
              <button type="button" className="acsis-mc-create-btn" onClick={() => setIsManualOpen(true)}>
                Enroll in a class
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="enrolled-classes" direction="horizontal">
                {(provided) => (
                  <ul
                    className="acsis-mc-course-grid acsis-mc-course-grid--top"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {enrolled.map((c, index) => (
                      <Draggable key={c.id} draggableId={String(c.id)} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <StudentCourseCard 
                            course={c} 
                            delay={index * 0.05} 
                            provided={dragProvided}
                            isDragging={dragSnapshot.isDragging}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

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
          onInteractOutside={(e) => {
            if (showJoinModal) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (showJoinModal) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">Join a class</DialogTitle>
            <DialogDescription>
              Enter the class code from your instructor. It is linked to the class they created under your school.
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
              {!showJoinModal ? (
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
              ) : null}
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
