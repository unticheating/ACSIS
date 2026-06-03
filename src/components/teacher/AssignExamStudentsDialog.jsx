import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { fetchTeacherExamAssignments, updateTeacherExamAssignments } from '@/lib/teacherExamResultsApi.js'
import { Button } from '@/components/ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'

export default function AssignExamStudentsDialog({ open, onOpenChange, classId, examId }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState([])
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    if (!open || !classId || !examId) return undefined
    let cancelled = false
    async function loadAssignments() {
      setLoading(true)
      try {
        const data = await fetchTeacherExamAssignments(classId, examId)
        if (cancelled) return
        setStudents(Array.isArray(data.students) ? data.students : [])
        setSelectedIds(Array.isArray(data.assignedStudentIds) ? data.assignedStudentIds.map(Number) : [])
      } catch (err) {
        if (!cancelled) {
          acsisToastError(err instanceof Error ? err.message : 'Failed to load assigned students.')
          setStudents([])
          setSelectedIds([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAssignments()
    return () => {
      cancelled = true
    }
  }, [open, classId, examId])

  const assignedCount = useMemo(
    () => students.filter((student) => selectedIds.includes(Number(student.memberId))).length,
    [students, selectedIds],
  )

  function toggleStudent(memberId) {
    const numericId = Number(memberId)
    setSelectedIds((current) =>
      current.includes(numericId) ? current.filter((id) => id !== numericId) : [...current, numericId],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateTeacherExamAssignments(classId, examId, selectedIds)
      acsisToastSuccess(`Assigned ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'}.`)
      onOpenChange(false)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to update exam assignments.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Assign exam to students</DialogTitle>
          <DialogDescription>
            Select the students who can take this exam. Once assignments exist, everyone else is blocked from joining.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading students…
            </div>
          ) : students.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No enrolled students were found for this class.</p>
          ) : (
            students.map((student) => {
              const checked = selectedIds.includes(Number(student.memberId))
              return (
                <label
                  key={student.memberId}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border text-primary"
                    checked={checked}
                    onChange={() => toggleStudent(student.memberId)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">{student.studentName}</span>
                    <span className="text-xs text-muted-foreground">{student.schoolId || 'No school ID'}</span>
                  </span>
                </label>
              )
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="mr-auto text-xs text-muted-foreground">
            {assignedCount} selected student{assignedCount === 1 ? '' : 's'}
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}