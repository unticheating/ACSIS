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
import { apiFetch } from '@/lib/apiFetch.js'

export default function CopyExamDialog({ open, onOpenChange, currentClassId, onCopy, defaultStart, defaultEnd }) {
  const [classes, setClasses] = useState([])
  const [currentClassCode, setCurrentClassCode] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [newStart, setNewStart] = useState(null)
  const [newEnd, setNewEnd] = useState(null)
  const [copying, setCopying] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const now = new Date()
    let start = defaultStart ? new Date(defaultStart) : new Date()
    if (Number.isNaN(start.getTime()) || start < now) start = now
    let end = defaultEnd ? new Date(defaultEnd) : null
    if (end && (Number.isNaN(end.getTime()) || end < start)) end = null
    setNewStart(start)
    setNewEnd(end)
    setSelectedClassId('')
    setError('')
    setCurrentClassCode('')
    
    // Fetch classes
    const fetchClasses = async () => {
      setLoadingClasses(true)
      try {
        const res = await apiFetch('/api/teacher/classes')
        if (res.ok) {
          const data = await res.json()
          const curr = data.find(c => String(c.id) === String(currentClassId))
          const courseCode = curr?.courseCode || ''
          setCurrentClassCode(courseCode)
          
          let filtered = data.filter(c => String(c.id) !== String(currentClassId))
          if (courseCode) {
            filtered = filtered.filter(c => c.courseCode === courseCode)
          }
          setClasses(filtered)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load classes.')
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [open, defaultStart, defaultEnd, currentClassId])

  async function handleConfirm(e) {
    e.preventDefault()
    if (!selectedClassId) {
      setError('Please select a target class.')
      return
    }
    setError('')
    setCopying(true)
    try {
      await onCopy({
        targetClassId: selectedClassId,
        newScheduledStart: newStart,
        newScheduledEnd: newEnd,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err.message || 'Failed to copy exam.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to Another Section</DialogTitle>
          <DialogDescription>
            Creates a draft copy of this exam. You can only copy it to other sections of the same subject {currentClassCode ? `(${currentClassCode})` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {error && <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-800">Target Section</label>
            <select
              className="acsis-input bg-white"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={loadingClasses || classes.length === 0}
            >
              <option value="" disabled>
                {loadingClasses 
                  ? 'Loading sections...' 
                  : classes.length === 0 
                    ? `No other sections found for ${currentClassCode}` 
                    : 'Select a section...'}
              </option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Section {cls.sectionCode || cls.section || 'N/A'} ({cls.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-800">Lobby opens at</label>
              <DateTimePicker
                value={newStart}
                onChange={setNewStart}
                placeholder="When students can join"
                disablePortal={true}
                disablePast
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-800">Deadline (optional)</label>
              <DateTimePicker
                value={newEnd}
                onChange={setNewEnd}
                placeholder="No fixed deadline"
                disablePortal={true}
                disablePast
                minDateTime={newStart}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <button
            type="button"
            className="acsis-btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={copying}
          >
            Cancel
          </button>
          <button
            type="button"
            className="acsis-mc-create-btn"
            disabled={copying || !selectedClassId || classes.length === 0}
            onClick={handleConfirm}
          >
            {copying ? 'Copying…' : 'Copy Exam'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
