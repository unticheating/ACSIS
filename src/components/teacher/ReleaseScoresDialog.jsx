import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
export default function ReleaseScoresDialog({ open, onOpenChange, onRelease, releasing = false }) {
  const [sendEmail, setSendEmail] = useState(true)
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false)

  useEffect(() => {
    if (open) {
      setSendEmail(true)
      setIncludeAnswerKey(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Release scores to students</DialogTitle>
          <DialogDescription>
            Students will see their scores in the exam session. You can optionally notify them by email.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
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
            disabled={releasing}
            onClick={() => onRelease({ sendEmail, includeAnswerKey })}
          >
            {releasing ? 'Releasing…' : 'Release scores'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
