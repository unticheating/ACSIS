import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'

export default function RestartExamDialog({ open, onOpenChange, onRestart, defaultStart, defaultEnd }) {
  const [newStart, setNewStart] = useState(null)
  const [newEnd, setNewEnd] = useState(null)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    if (!open) return
    const now = new Date()
    let start = defaultStart ? new Date(defaultStart) : new Date()
    if (Number.isNaN(start.getTime()) || start < now) start = now
    let end = defaultEnd ? new Date(defaultEnd) : null
    if (end && (Number.isNaN(end.getTime()) || end < start)) end = null
    setNewStart(start)
    setNewEnd(end)
  }, [open, defaultStart, defaultEnd])

  async function handleConfirm(e) {
    e.preventDefault()
    setRestarting(true)
    try {
      await onRestart({
        newScheduledStart: newStart,
        newScheduledEnd: newEnd,
      })
      onOpenChange(false)
    } finally {
      setRestarting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restart Exam</DialogTitle>
          <DialogDescription>
            This will allow students to re-join using the exam code.
            The exam will be placed back into the lobby until you start it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Lobby opens at</label>
            <DateTimePicker
              value={newStart}
              onChange={setNewStart}
              placeholder="When students can join"
              disablePortal={true}
              disablePast
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Exam deadline (optional)</label>
            <DateTimePicker
              value={newEnd}
              onChange={setNewEnd}
              placeholder="No fixed deadline"
              disablePortal={true}
              disablePast
              minDateTime={newStart}
            />
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <button
              type="button"
              className="acsis-btn-ghost"
              onClick={() => onOpenChange(false)}
              disabled={restarting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="acsis-mc-create-btn"
              disabled={restarting}
              onClick={handleConfirm}
            >
              {restarting ? 'Restarting…' : 'Restart Exam'}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
