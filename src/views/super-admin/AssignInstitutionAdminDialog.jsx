import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import {
  createInstitutionAdmin,
  fetchInstitutionAdmins,
} from '@/lib/superAdminAnalyticsApi.js'

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  schoolId: '',
}

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   institution: { institutionId: number, institutionName: string, acronym?: string } | null
 * }} props
 */
export default function AssignInstitutionAdminDialog({ open, onOpenChange, institution }) {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)

  const loadAdmins = useCallback(async () => {
    if (!institution?.institutionId) return
    setLoadingAdmins(true)
    try {
      const rows = await fetchInstitutionAdmins(institution.institutionId)
      setAdmins(rows)
    } catch (err) {
      setAdmins([])
      acsisToastError(err instanceof Error ? err.message : 'Could not load admins.')
    } finally {
      setLoadingAdmins(false)
    }
  }, [institution?.institutionId])

  useEffect(() => {
    if (!open) return
    setForm(emptyForm)
    loadAdmins()
  }, [open, loadAdmins])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!institution?.institutionId) return
    setSubmitting(true)
    try {
      await createInstitutionAdmin(institution.institutionId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        schoolId: form.schoolId.trim() || undefined,
      })
      acsisToastSuccess(`Admin added for ${institution.acronym || institution.institutionName}.`)
      setForm(emptyForm)
      await loadAdmins()
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to create admin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog-content sm:max-w-md" aria-describedby={undefined}>
        <form onSubmit={onSubmit}>
          <div className="admin-dialog-header">
            <DialogTitle className="admin-dialog-title">Assign institution admin</DialogTitle>
            <DialogDescription className="admin-dialog-desc">
              {institution
                ? `Create an admin account for ${institution.institutionName}. They manage /admin for this school.`
                : 'Select an institution.'}
            </DialogDescription>
          </div>

          <div className="admin-dialog-body space-y-3">
            {loadingAdmins ? (
              <p className="text-sm text-muted-foreground">Loading current admins…</p>
            ) : admins.length > 0 ? (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium mb-2">Current admins ({admins.length})</p>
                <ul className="space-y-1 text-muted-foreground">
                  {admins.map((a) => (
                    <li key={a.uid}>
                      {a.name} · {a.email}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No admins yet for this institution.</p>
            )}

            <label className="block space-y-1">
              <span className="text-sm font-medium">First name</span>
              <input
                type="text"
                className="super-admin-add-institution-dialog__input w-full"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Last name</span>
              <input
                type="text"
                className="super-admin-add-institution-dialog__input w-full"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                className="super-admin-add-institution-dialog__input w-full"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                disabled={submitting}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Employee ID (optional)</span>
              <input
                type="text"
                className="super-admin-add-institution-dialog__input w-full"
                value={form.schoolId}
                onChange={(e) => setField('schoolId', e.target.value)}
                placeholder="24-00123"
                disabled={submitting}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Temporary password</span>
              <input
                type="password"
                className="super-admin-add-institution-dialog__input w-full"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                required
                minLength={8}
                disabled={submitting}
              />
            </label>
          </div>

          <div className="admin-dialog-footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Close
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving…' : 'Create admin'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
