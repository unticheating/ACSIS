import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import { RotateCcw, Timer, Clock } from 'lucide-react'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'

export default function RestartExamDialog({ open, onOpenChange, onRestart, defaultStart, defaultDuration = 60 }) {
  const [newStart, setNewStart] = useState(null)
  const [newDuration, setNewDuration] = useState(defaultDuration)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    if (!open) return
    const now = new Date()
    let start = defaultStart ? new Date(defaultStart) : new Date()
    if (Number.isNaN(start.getTime()) || start < now) start = now
    setNewStart(start)
    setNewDuration(defaultDuration || 60)
  }, [open, defaultStart, defaultDuration])

  async function handleConfirm(e) {
    e.preventDefault()
    setRestarting(true)
    try {
      await onRestart({
        newScheduledStart: newStart,
        newDuration: newDuration,
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
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock size={14} className="text-muted-foreground" />
              Lobby opens at
            </Label>
            <DateTimePicker
              value={newStart}
              onChange={setNewStart}
              placeholder="When students can join"
              disablePortal={true}
              disablePast
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Timer size={14} className="text-muted-foreground" />
              Exam duration
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="1"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="pr-14"
                placeholder="e.g. 60"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-sm font-medium">
                mins
              </span>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              disabled={restarting}
              onClick={handleConfirm}
            >
              <RotateCcw size={16} strokeWidth={2.5} aria-hidden />
              {restarting ? 'Restarting…' : 'Restart exam'}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
