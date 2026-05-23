import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import {
  fetchAdminSettings,
  updateInstitutionProfile,
  updateInstitutionTheme,
} from '@/lib/adminSettingsApi.js'
import { useSession } from '@/context/SessionContext.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import '../../pages/admin-ui/style.css'

const LOGO_MAX_BYTES = 500 * 1024

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
 * @param {{ basePath?: string }} props
 */
export default function AdminSettingsPage({ basePath = '/admin' }) {
  const { institution, palettes, setInstitutionTheme, applyInstitution, refreshBranding } =
    useInstitutionTheme()
  const { sessionMode } = useSession()
  const isPlatform = basePath === '/super-admin'
  const fileRef = useRef(null)

  const [loading, setLoading] = useState(!isPlatform)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingId, setSavingId] = useState(null)

  const [institutionName, setInstitutionName] = useState(institution.institutionName)
  const [acronym, setAcronym] = useState(institution.acronym)
  const [maxWarnings, setMaxWarnings] = useState(String(institution.maxWarnings))
  const [logo, setLogo] = useState(institution.logo)
  const [selectedId, setSelectedId] = useState(institution.theme.themeId)

  useEffect(() => {
    setInstitutionName(institution.institutionName)
    setAcronym(institution.acronym)
    setMaxWarnings(String(institution.maxWarnings))
    setLogo(institution.logo)
    setSelectedId(institution.theme.themeId)
  }, [
    institution.institutionName,
    institution.acronym,
    institution.maxWarnings,
    institution.logo,
    institution.theme.themeId,
  ])

  useEffect(() => {
    if (isPlatform) return
    let cancelled = false

    if (sessionMode === 'demo') {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    ;(async () => {
      try {
        const data = await fetchAdminSettings()
        if (cancelled) return
        const inst = data.institution
        if (inst) {
          setInstitutionName(inst.institutionName || '')
          setAcronym(inst.acronym || '')
          setMaxWarnings(String(inst.maxWarnings ?? 3))
          setLogo(inst.logo ?? null)
          if (inst.theme?.themeId) setSelectedId(inst.theme.themeId)
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isPlatform, sessionMode])

  const onLogoPick = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Image must be 500 KB or smaller.')
      return
    }
    try {
      const dataUrl = await readImageFile(file)
      setLogo(dataUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load image.')
    }
  }, [])

  const onSaveProfile = useCallback(async () => {
    const warnings = Number(maxWarnings)
    if (!institutionName.trim()) {
      toast.error('Institution name is required.')
      return
    }
    if (!acronym.trim()) {
      toast.error('Acronym is required.')
      return
    }
    if (!Number.isInteger(warnings) || warnings < 1 || warnings > 20) {
      toast.error('Max warnings must be a whole number from 1 to 20.')
      return
    }

    setSavingProfile(true)
    try {
      const payload = {
        institutionName: institutionName.trim(),
        acronym: acronym.trim().toUpperCase(),
        maxWarnings: warnings,
        logo,
      }

      if (sessionMode === 'demo') {
        applyInstitution(
          {
            institutionName: payload.institutionName,
            acronym: payload.acronym,
            maxWarnings: payload.maxWarnings,
            logo: payload.logo,
          },
          { persistDemo: true },
        )
        toast.success('Institution settings saved (demo).')
      } else {
        const data = await updateInstitutionProfile(payload)
        const inst = data.institution
        if (inst) {
          applyInstitution({
            institutionName: inst.institutionName,
            acronym: inst.acronym,
            maxWarnings: inst.maxWarnings,
            logo: inst.logo ?? null,
          })
          if (inst.theme?.themeId) {
            setSelectedId(inst.theme.themeId)
            await setInstitutionTheme(inst.theme.themeId)
          }
        }
        await refreshBranding()
        toast.success('Institution settings saved.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setSavingProfile(false)
    }
  }, [
    acronym,
    applyInstitution,
    institutionName,
    logo,
    maxWarnings,
    refreshBranding,
    sessionMode,
    setInstitutionTheme,
  ])

  const onSelectPalette = useCallback(
    async (themeId) => {
      if (themeId === selectedId) return
      setSavingId(themeId)
      try {
        if (sessionMode === 'demo') {
          await setInstitutionTheme(themeId, { persistDemo: true })
          setSelectedId(themeId)
          toast.success('Institution colors updated (demo).')
        } else {
          const data = await updateInstitutionTheme(themeId)
          const next = data.institution?.theme
          if (next?.themeId) {
            await setInstitutionTheme(next.themeId)
            setSelectedId(next.themeId)
          }
          toast.success('Institution colors updated.')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save colors.')
      } finally {
        setSavingId(null)
      }
    },
    [selectedId, sessionMode, setInstitutionTheme],
  )

  if (isPlatform) {
    return (
      <div className="acsis-stack">
        <div className="content-header">
          <div className="breadcrumb">
            <span className="brand-plp">PLP</span>
            <span className="brand-acsis"> ACSIS</span>
            <span className="sep">/</span>
            <span className="page-name">System settings</span>
          </div>
        </div>
        <div className="content-body admin-settings-page">
          <p className="admin-placeholder-lead">
            Platform-wide settings are managed separately. Each school administrator configures
            name, logo, colors, and exam policies on their institution settings page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{institution.acronym}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Institution settings</span>
        </div>
      </div>
      <div className="content-body admin-settings-page">
        <FadeIn delay={0.05} className="panel">
          <div className="panel-header">
            <span className="panel-title">Institution profile</span>
          </div>
          <p className="admin-settings-lead">
            Name, logo, and exam defaults for your school. Shown in the sidebar and mobile header for
            all users at your institution.
          </p>

          {loading ? (
            <p className="admin-settings-lead">Loading…</p>
          ) : (
            <>
              <div className="admin-settings-logo-row">
                <div className="admin-settings-logo-preview">
                  <InstitutionLogo logo={logo} width={56} height={56} alt="" />
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
                  >
                    <ImagePlus size={16} strokeWidth={2} aria-hidden />
                    Upload logo
                  </button>
                  {logo ? (
                    <button
                      type="button"
                      className="admin-settings-logo-btn admin-settings-logo-btn--muted"
                      onClick={() => setLogo(null)}
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden />
                      Remove
                    </button>
                  ) : null}
                  <p className="admin-settings-logo-hint">PNG, JPEG, or WebP · max 500 KB</p>
                </div>
              </div>

              <div className="admin-settings-fields">
                <label className="admin-settings-field">
                  <span className="admin-settings-label">Institution name</span>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    maxLength={100}
                    placeholder="Pamantasan ng Lungsod ng Pasig"
                  />
                </label>
                <label className="admin-settings-field">
                  <span className="admin-settings-label">Acronym</span>
                  <input
                    type="text"
                    value={acronym}
                    onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="PLP"
                    autoCapitalize="characters"
                  />
                  <span className="admin-settings-hint">Shown as “{acronym.trim() || 'PLP'} ACSIS” in the app</span>
                </label>
                <label className="admin-settings-field">
                  <span className="admin-settings-label">Max warnings (per exam)</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxWarnings}
                    onChange={(e) => setMaxWarnings(e.target.value)}
                  />
                  <span className="admin-settings-hint">
                    Students are flagged or removed after this many proctoring warnings
                  </span>
                </label>
              </div>

              <div className="admin-settings-form-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={savingProfile}
                  onClick={onSaveProfile}
                >
                  {savingProfile ? 'Saving…' : 'Save institution settings'}
                </button>
              </div>
            </>
          )}
        </FadeIn>

        <FadeIn delay={0.1} className="panel">
          <div className="panel-header">
            <span className="panel-title">Institution colors</span>
          </div>
          <p className="admin-settings-lead">
            Brand palette for the app shell (sidebar, accents, and background tint). Applies immediately
            for everyone at your school.
          </p>
          {loading ? (
            <p className="admin-settings-lead">Loading palettes…</p>
          ) : (
            <div className="admin-settings-palettes" role="listbox" aria-label="Institution color palette">
              {palettes.map((p) => {
                const active = p.themeId === selectedId
                const busy = savingId === p.themeId
                return (
                  <button
                    key={p.themeId}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={busy || savingId !== null}
                    className={`admin-settings-palette${active ? ' is-active' : ''}`}
                    onClick={() => onSelectPalette(p.themeId)}
                  >
                    <span className="admin-settings-palette__swatches" aria-hidden>
                      <span
                        className="admin-settings-palette__chip admin-settings-palette__chip--primary"
                        style={{ background: p.primaryColor }}
                      />
                      <span
                        className="admin-settings-palette__chip admin-settings-palette__chip--secondary"
                        style={{ background: p.secondaryColor }}
                      />
                    </span>
                    <span className="admin-settings-palette__name">{p.themeName}</span>
                    {active ? <span className="admin-settings-palette__badge">Active</span> : null}
                  </button>
                )
              })}
            </div>
          )}
        </FadeIn>

        <p className="admin-settings-back">
          <Link to={basePath}>← Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}
