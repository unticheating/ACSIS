import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.jsx'
import { useSession } from '@/context/SessionContext.jsx'
import { saveStudentNumber, updateProfileAvatar } from '@/lib/authApi.js'
import { Upload, UserCircle, X } from 'lucide-react'

/** Convert a File to a base64 data URL */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export default function ProfileSettingsDialog({ open, onOpenChange }) {
  const { activeAccount, sessionMode, refreshAuth } = useSession()

  const isStudent = activeAccount?.portal === 'student'
  const isDemo = sessionMode === 'demo'

  const [studentNum, setStudentNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Preview state: object URL for display, base64 dataUrl for upload
  const [previewUrl, setPreviewUrl] = useState(null)
  const [pendingDataUrl, setPendingDataUrl] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setStudentNum(activeAccount?.studentNumber || '')
      setPreviewUrl(null)
      setPendingDataUrl(null)
      setError('')
    }
    // Revoke the old preview URL when dialog closes to free memory
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [open, activeAccount?.studentNumber])

  const handleStudentNumChange = (e) => {
    let val = e.target.value.replace(/[^0-9-]/g, '')
    if (val.length === 2 && !val.includes('-')) val += '-'
    else if (val.length === 3 && val[2] !== '-') val = val.slice(0, 2) + '-' + val.slice(2)
    if (val.length > 8) val = val.slice(0, 8)
    setStudentNum(val)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Size check: 3 MB
    if (file.size > 3 * 1024 * 1024) {
      setError('Image too large. Please choose an image under 3 MB.')
      return
    }

    setError('')
    // Object URL for preview (fast)
    setPreviewUrl(URL.createObjectURL(file))

    try {
      const dataUrl = await fileToDataUrl(file)
      setPendingDataUrl(dataUrl)
    } catch {
      setError('Could not read the selected image.')
      setPreviewUrl(null)
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const clearPending = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPendingDataUrl(null)
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const tasks = []

      // Avatar upload (real auth mode only — demo just shows preview)
      if (pendingDataUrl && !isDemo) {
        tasks.push(updateProfileAvatar(pendingDataUrl))
      }

      // Student number save
      if (isStudent && !isDemo && studentNum !== (activeAccount?.studentNumber || '')) {
        tasks.push(saveStudentNumber(studentNum))
      }

      if (tasks.length > 0) await Promise.all(tasks)

      // Refresh session so sidebar avatar and session data update
      if (!isDemo && tasks.length > 0) await refreshAuth()

      onOpenChange(false)
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!activeAccount) return null

  // The avatar shown in the circle: pending preview > current account avatar > letter
  const displayAvatar = previewUrl || activeAccount.avatarUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[420px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile picture{isStudent ? ' and student number' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Avatar section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24">
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={activeAccount.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary text-3xl font-semibold text-primary-foreground">
                    {activeAccount.avatarLetter || <UserCircle size={48} />}
                  </div>
                )}
              </div>
              {/* Clear pending button */}
              {pendingDataUrl && (
                <button
                  type="button"
                  onClick={clearPending}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow hover:bg-destructive/80"
                  title="Remove new photo"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
              <Upload size={15} />
              {pendingDataUrl ? 'Change again' : 'Upload photo'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <p className="text-[0.75rem] text-muted-foreground text-center">
              JPG, PNG or GIF · Max 3 MB
            </p>
          </div>

          {/* Name (read-only) */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              value={activeAccount.displayName}
              disabled
            />
            <p className="text-[0.75rem] text-muted-foreground">
              Your name is managed by your institution.
            </p>
          </div>

          {/* Student number (students only) */}
          {isStudent && (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Student Number</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={studentNum}
                onChange={handleStudentNumChange}
                placeholder="xx-xxxxx"
                maxLength={8}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
