import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { formatSectionTitle } from '@/lib/sectionLabel.js'
import TeacherCourseFieldsWithSuggest, {
  useTeacherCourseCatalogHint,
} from '@/components/teacher/TeacherCourseFieldsWithSuggest.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   term: object|null,
 *   onCreated?: () => void,
 *   existingCourses?: Array<{ courseCode?: string, course_code?: string, name?: string }>,
 * }} props
 */
export default function TeacherAddCourseDialog({
  open,
  onOpenChange,
  term,
  onCreated,
  existingCourses = [],
}) {
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

  const catalogHint = useTeacherCourseCatalogHint(existingCourses)

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
              {open ? catalogHint : null}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TeacherCourseFieldsWithSuggest
              idPrefix="dlg"
              active={open}
              existingCourses={existingCourses}
              courseCode={courseCode}
              courseName={courseName}
              onCourseCodeChange={setCourseCode}
              onCourseNameChange={setCourseName}
              autoFocusCode
            />
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
