import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import {
  createSuperAdminInstitution,
  fetchSuperAdminThemes,
} from '@/lib/superAdminInstitutionsApi.js'

const LOGO_MAX_BYTES = 500 * 1024

const emptyForm = {
  institutionName: '',
  acronym: '',
  logo: null,
  themeId: '',
  maxWarnings: '3',
  createAdmin: false,
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
  adminSchoolId: '',
}

/**
 * @param {File} file
 */
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * @param {{
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   onCreated: (institution: object) => void
 * }} props
 */
export default function AddInstitutionDialog({ open, onOpenChange, onCreated }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [themes, setThemes] = useState([])
  const [themesLoading, setThemesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setForm(emptyForm)
    setFieldErrors({})
    setThemesLoading(true)
    fetchSuperAdminThemes()
      .then((rows) => {
        setThemes(rows)
        if (rows[0]?.themeId) {
          setForm((prev) => ({ ...prev, themeId: String(rows[0].themeId) }))
        }
      })
      .catch((err) => {
        acsisToastError(err instanceof Error ? err.message : 'Could not load themes.')
        setThemes([])
      })
      .finally(() => setThemesLoading(false))
  }, [open])

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const onLogoPick = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      acsisToastError('Please choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      acsisToastError('Image must be 500 KB or smaller.')
      return
    }
    try {
      const dataUrl = await readImageFile(file)
      setField('logo', dataUrl)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Could not load image.')
    }
  }, [setField])

  function validate() {
    const errors = {}
    const name = form.institutionName.trim()
    const acronym = form.acronym.trim().toUpperCase()

    if (name.length < 2) {
      errors.institutionName = 'Institution name is required (at least 2 characters).'
    }
    if (!acronym) {
      errors.acronym = 'Acronym is required.'
    } else if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(acronym)) {
      errors.acronym = 'Use 1–20 letters, numbers, or hyphens only.'
    }
    const themeId = Number(form.themeId)
    if (!Number.isInteger(themeId) || themeId < 1) {
      errors.themeId = 'Please select a color theme.'
    }
    const warnings = Number(form.maxWarnings)
    if (!Number.isInteger(warnings) || warnings < 1 || warnings > 20) {
      errors.maxWarnings = 'Max warnings must be a whole number from 1 to 20.'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const first = Object.values(errors)[0]
      acsisToastError(first)
      return null
    }

    return {
      institutionName: name,
      acronym,
      logo: form.logo || null,
      themeId,
      maxWarnings: warnings,
      admin: form.createAdmin
        ? {
            firstName: form.adminFirstName.trim(),
            lastName: form.adminLastName.trim(),
            email: form.adminEmail.trim().toLowerCase(),
            password: form.adminPassword,
            schoolId: form.adminSchoolId.trim() || undefined,
          }
        : undefined,
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    const payload = validate()
    if (!payload) return

    setSubmitting(true)
    try {
      const institution = await createSuperAdminInstitution(payload)
      acsisToastSuccess(
        payload.admin
          ? `${institution.institutionName} added with initial admin.`
          : `${institution.institutionName} has been added.`,
      )
      onCreated(institution)
      onOpenChange(false)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to create institution.')
    } finally {
      setSubmitting(false)
    }
  }

  const acronymPreview = form.acronym.trim().toUpperCase() || 'PLP'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog-content super-admin-add-institution-dialog" aria-describedby={undefined}>
        <form onSubmit={onSubmit}>
          <div className="admin-dialog-header">
            <DialogTitle className="admin-dialog-title">Add institution</DialogTitle>
            <DialogDescription className="admin-dialog-desc">
              Provision a new school on the platform. Members will see its name, logo, and theme in the app.
            </DialogDescription>
          </div>

          <div className="admin-dialog-body super-admin-add-institution-dialog__body">
            <div className="admin-settings-logo-row">
              <div className="admin-settings-logo-preview">
                <InstitutionLogo logo={form.logo} width={56} height={56} alt="" />
              </div>
              <div className="admin-settings-logo-actions">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="admin-settings-logo-input"
                  onChange={onLogoPick}
                />
                <button
                  type="button"
                  className="admin-settings-logo-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={submitting}
                >
                  <ImagePlus size={16} strokeWidth={2} aria-hidden />
                  Upload logo
                </button>
                {form.logo ? (
                  <button
                    type="button"
                    className="admin-settings-logo-btn admin-settings-logo-btn--muted"
                    onClick={() => setField('logo', null)}
                    disabled={submitting}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden />
                    Remove
                  </button>
                ) : null}
                <p className="admin-settings-logo-hint">
                  Optional. PNG, JPEG, or WebP · max 500 KB. Leave empty to use the default ACSIS logo.
                </p>
              </div>
            </div>

            <div className="super-admin-add-institution-dialog__divider" aria-hidden />

            <section className="super-admin-add-institution-dialog__section" aria-labelledby="add-inst-details">
              <h3 id="add-inst-details" className="super-admin-add-institution-dialog__section-title">
                Institution details
              </h3>
              <div className="super-admin-add-institution-dialog__row">
                <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--grow">
                  <span className="super-admin-add-institution-dialog__label">
                    Institution name <span className="super-admin-add-institution-dialog__req">*</span>
                  </span>
                  <input
                    type="text"
                    className="super-admin-add-institution-dialog__input"
                    value={form.institutionName}
                    onChange={(e) => setField('institutionName', e.target.value)}
                    maxLength={100}
                    placeholder="Pamantasan ng Lungsod ng Pasig"
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.institutionName)}
                  />
                  {fieldErrors.institutionName ? (
                    <span className="super-admin-add-institution-dialog__error" role="alert">
                      {fieldErrors.institutionName}
                    </span>
                  ) : null}
                </label>

                <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--acronym">
                  <span className="super-admin-add-institution-dialog__label">
                    Acronym <span className="super-admin-add-institution-dialog__req">*</span>
                  </span>
                  <input
                    type="text"
                    className="super-admin-add-institution-dialog__input"
                    value={form.acronym}
                    onChange={(e) => setField('acronym', e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="PLP"
                    autoCapitalize="characters"
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.acronym)}
                  />
                  <span className="super-admin-add-institution-dialog__hint">
                    Shown as “{acronymPreview} ACSIS”
                  </span>
                  {fieldErrors.acronym ? (
                    <span className="super-admin-add-institution-dialog__error" role="alert">
                      {fieldErrors.acronym}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--full">
                <span className="super-admin-add-institution-dialog__label">Max warnings (per exam)</span>
                <input
                  type="number"
                  className="super-admin-add-institution-dialog__input"
                  min={1}
                  max={20}
                  value={form.maxWarnings}
                  onChange={(e) => setField('maxWarnings', e.target.value)}
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.maxWarnings)}
                />
                <span className="super-admin-add-institution-dialog__hint">Default is 3 for new institutions</span>
                {fieldErrors.maxWarnings ? (
                  <span className="super-admin-add-institution-dialog__error" role="alert">
                    {fieldErrors.maxWarnings}
                  </span>
                ) : null}
              </label>
            </section>

            <div className="super-admin-add-institution-dialog__divider" aria-hidden />

            <section className="super-admin-add-institution-dialog__section" aria-labelledby="add-inst-theme">
              <h3 id="add-inst-theme" className="super-admin-add-institution-dialog__section-title">
                Color theme <span className="super-admin-add-institution-dialog__req">*</span>
              </h3>
              {themesLoading ? (
                <p className="super-admin-add-institution-dialog__hint">Loading themes…</p>
              ) : (
                <div
                  className="super-admin-add-institution-dialog__theme-grid"
                  role="listbox"
                  aria-label="Institution color theme"
                >
                  {themes.map((p) => {
                    const active = String(p.themeId) === form.themeId
                    return (
                      <button
                        key={p.themeId}
                        type="button"
                        role="option"
                        aria-selected={active}
                        disabled={submitting}
                        className={`super-admin-add-institution-dialog__theme${active ? ' is-active' : ''}`}
                        style={
                          active
                            ? {
                                '--theme-active-color': p.primaryColor,
                              }
                            : undefined
                        }
                        onClick={() => setField('themeId', String(p.themeId))}
                      >
                        <span className="super-admin-add-institution-dialog__theme-swatches" aria-hidden>
                          <span
                            className="super-admin-add-institution-dialog__theme-chip"
                            style={{ background: p.primaryColor }}
                          />
                          <span
                            className="super-admin-add-institution-dialog__theme-chip super-admin-add-institution-dialog__theme-chip--secondary"
                            style={{ background: p.secondaryColor }}
                          />
                        </span>
                        <span className="super-admin-add-institution-dialog__theme-name">{p.themeName}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {fieldErrors.themeId ? (
                <span className="super-admin-add-institution-dialog__error" role="alert">
                  {fieldErrors.themeId}
                </span>
              ) : null}
            </section>

            <div className="super-admin-add-institution-dialog__divider" aria-hidden />

            <section className="super-admin-add-institution-dialog__section">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.createAdmin}
                  onChange={(e) => setField('createAdmin', e.target.checked)}
                  disabled={submitting}
                />
                Create initial institution admin
              </label>
              {form.createAdmin ? (
                <div className="mt-3 grid gap-3">
                  <div className="super-admin-add-institution-dialog__row">
                    <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--grow">
                      <span className="super-admin-add-institution-dialog__label">First name</span>
                      <input
                        type="text"
                        className="super-admin-add-institution-dialog__input"
                        value={form.adminFirstName}
                        onChange={(e) => setField('adminFirstName', e.target.value)}
                        disabled={submitting}
                      />
                    </label>
                    <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--grow">
                      <span className="super-admin-add-institution-dialog__label">Last name</span>
                      <input
                        type="text"
                        className="super-admin-add-institution-dialog__input"
                        value={form.adminLastName}
                        onChange={(e) => setField('adminLastName', e.target.value)}
                        disabled={submitting}
                      />
                    </label>
                  </div>
                  <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--full">
                    <span className="super-admin-add-institution-dialog__label">Admin email</span>
                    <input
                      type="email"
                      className="super-admin-add-institution-dialog__input"
                      value={form.adminEmail}
                      onChange={(e) => setField('adminEmail', e.target.value)}
                      disabled={submitting}
                    />
                  </label>
                  <label className="super-admin-add-institution-dialog__field super-admin-add-institution-dialog__field--full">
                    <span className="super-admin-add-institution-dialog__label">Temporary password</span>
                    <input
                      type="password"
                      className="super-admin-add-institution-dialog__input"
                      value={form.adminPassword}
                      onChange={(e) => setField('adminPassword', e.target.value)}
                      minLength={8}
                      disabled={submitting}
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </div>

          <div className="admin-dialog-footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting || themesLoading}>
              {submitting ? 'Saving…' : 'Save institution'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
