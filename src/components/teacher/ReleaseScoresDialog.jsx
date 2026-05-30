import { useEffect, useMemo, useState } from 'react'
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
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   students?: Array<{ sessionId: number, studentName: string, scoreReleased?: boolean, status?: string, percentage?: number | null }>
 *   onRelease: (opts: { sendEmail: boolean, includeAnswerKey: boolean, sessionIds: number[] }) => void
 *   releasing?: boolean
 * }} props
 */
export default function ReleaseScoresDialog({
  open,
  onOpenChange,
  students = [],
  onRelease,
  releasing = false,
}) {
  const [sendEmail, setSendEmail] = useState(true)
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  const releasable = useMemo(
    () =>
      students.filter(
        (s) => s.sessionId && (s.status || '').toLowerCase() === 'submitted' && !s.scoreReleased,
      ),
    [students],
  )

  useEffect(() => {
    if (!open) return
    setSendEmail(true)
    setIncludeAnswerKey(false)
    setSelected(new Set(releasable.map((s) => s.sessionId)))
  }, [open, releasable])

  const allSelected = releasable.length > 0 && selected.size === releasable.length

  function toggleAll(checked) {
    if (checked) {
      setSelected(new Set(releasable.map((s) => s.sessionId)))
    } else {
      setSelected(new Set())
    }
  }

  function toggleOne(sessionId, checked) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(sessionId)
      else next.delete(sessionId)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Release scores to students</DialogTitle>
          <DialogDescription>
            Choose who can see their score. Only selected students will be notified (if email is
            enabled).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {releasable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending submissions to release. All submitted students already have released scores.
            </p>
          ) : (
            <div className="rounded-lg border border-border max-h-56 overflow-y-auto">
              <label className="flex items-center gap-2 px-3 py-2 border-b border-border text-sm font-medium cursor-pointer bg-muted/30">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Select all ({releasable.length})
              </label>
              <ul className="divide-y divide-border">
                {releasable.map((s) => (
                  <li key={s.sessionId}>
                    <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/20">
                      <input
                        type="checkbox"
                        checked={selected.has(s.sessionId)}
                        onChange={(e) => toggleOne(s.sessionId, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="flex-1 truncate">{s.studentName || 'Student'}</span>
                      {s.percentage != null ? (
                        <span className="text-xs text-muted-foreground shrink-0">{s.percentage}%</span>
                      ) : null}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => {
                setSendEmail(e.target.checked)
                if (!e.target.checked) setIncludeAnswerKey(false)
              }}
              className="rounded border-gray-300"
            />
            Send score notification emails
          </label>
          <label
            className={`flex items-center gap-2 text-sm cursor-pointer ${sendEmail ? 'text-gray-700' : 'text-gray-400'}`}
          >
            <input
              type="checkbox"
              checked={includeAnswerKey}
              disabled={!sendEmail}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include answer key in emails
          </label>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            className="acsis-btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={releasing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="acsis-mc-create-btn"
            disabled={releasing || releasable.length === 0 || selected.size === 0}
            onClick={() =>
              onRelease({
                sendEmail,
                includeAnswerKey,
                sessionIds: [...selected],
              })
            }
          >
            {releasing
              ? 'Releasing…'
              : selected.size === releasable.length
                ? 'Release all selected'
                : `Release ${selected.size} student${selected.size === 1 ? '' : 's'}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
