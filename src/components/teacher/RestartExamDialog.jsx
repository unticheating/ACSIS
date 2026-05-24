import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'

export default function RestartExamDialog({ open, onOpenChange, onRestart, defaultEnd }) {
  const [newEnd, setNewEnd] = useState(defaultEnd ? new Date(defaultEnd) : null)
  const [restarting, setRestarting] = useState(false)

  async function handleConfirm(e) {
    e.preventDefault()
    setRestarting(true)
    try {
      await onRestart({ newScheduledEnd: newEnd })
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
            Reopening this exam allows students to enter it again.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">
              New Exam Deadline (Optional)
            </label>
            <DateTimePicker
              value={newEnd}
              onChange={setNewEnd}
              placeholder="No fixed deadline"
              disablePortal={true}
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
