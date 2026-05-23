import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { formatSectionTitle } from '@/lib/sectionLabel.js'
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

/**
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, term: object|null, onCreated?: () => void }} props
 */
export default function TeacherAddCourseDialog({ open, onOpenChange, term, onCreated }) {
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) {
      setCourseCode('')
      setCourseName('')
      setCreating(false)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!term) return
    setCreating(true)
    try {
      const res = await apiFetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: courseCode.trim(),
          name: courseName.trim(),
          academicYear: term.academicYear,
          semester: term.semester,
          termId: term.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        acsisToastError(data.error || 'Failed to create course.')
        return
      }
      acsisToastSuccess('Course added.')
      onOpenChange(false)
      onCreated?.()
    } catch {
      acsisToastError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const sectionLabel = term ? formatSectionTitle(term) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add course</DialogTitle>
            <DialogDescription>
              {term
                ? `Course will belong to ${sectionLabel} (${term.academicYear}, ${term.semester}).`
                : 'Link a course to this section.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dlg-course-code">Subject code</Label>
              <Input
                id="dlg-course-code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="IT 108"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dlg-course-name">Course name</Label>
              <Input
                id="dlg-course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Integrative Programming"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <button type="button" className="acsis-btn-ghost" onClick={() => onOpenChange(false)} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="acsis-mc-create-btn" disabled={creating} style={{ border: 'none' }}>
              {creating ? 'Saving…' : 'Add course'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
