import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Trash2, Info, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
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
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const [institutionName, setInstitutionName] = useState(institution.institutionName)
  const [acronym, setAcronym] = useState(institution.acronym)
  const [maxWarnings, setMaxWarnings] = useState(String(institution.maxWarnings))
  const [emailDomain, setEmailDomain] = useState(institution.emailDomain || '')
  const [logo, setLogo] = useState(institution.logo)
  const [selectedId, setSelectedId] = useState(institution.theme.themeId)

  useEffect(() => {
    setInstitutionName(institution.institutionName)
    setAcronym(institution.acronym)
    setMaxWarnings(String(institution.maxWarnings))
    setEmailDomain(institution.emailDomain || '')
    setLogo(institution.logo)
    setSelectedId(institution.theme.themeId)
  }, [
    institution.institutionName,
    institution.acronym,
    institution.maxWarnings,
    institution.emailDomain,
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
          setEmailDomain(inst.emailDomain || '')
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
      // Automatically save when logo is changed
      onSaveProfile({ logo: dataUrl })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load image.')
    }
  }, []) // Will add onSaveProfile to dependencies below

  const onSaveProfile = useCallback(async (overrides = {}) => {
    const currentName = overrides.institutionName !== undefined ? overrides.institutionName : institutionName
    const currentAcronym = overrides.acronym !== undefined ? overrides.acronym : acronym
    const currentWarningsStr = overrides.maxWarnings !== undefined ? overrides.maxWarnings : maxWarnings
    const currentDomain = overrides.emailDomain !== undefined ? overrides.emailDomain : emailDomain
    const currentLogo = overrides.logo !== undefined ? overrides.logo : logo

    const warnings = Number(currentWarningsStr)
    if (!currentName.trim()) {
      toast.error('Institution name is required.')
      return
    }
    if (!currentAcronym.trim()) {
      toast.error('Acronym is required.')
      return
    }
    if (!Number.isInteger(warnings) || warnings < 1 || warnings > 20) {
      toast.error('Max warnings must be a whole number from 1 to 20.')
      return
    }

    setSavingProfile(true)
    try {
      const domainTrimmed = currentDomain.trim().toLowerCase().replace(/^@+/, '')
      if (domainTrimmed && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domainTrimmed)) {
        toast.error('Enter a valid email domain (example: school.edu.ph), without @.')
        return
      }

      const payload = {
        institutionName: currentName.trim(),
        acronym: currentAcronym.trim().toUpperCase(),
        maxWarnings: warnings,
        emailDomain: domainTrimmed || null,
        logo: currentLogo,
      }

      if (sessionMode === 'demo') {
        applyInstitution(
          {
            institutionName: payload.institutionName,
            acronym: payload.acronym,
            maxWarnings: payload.maxWarnings,
            emailDomain: payload.emailDomain,
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
            emailDomain: inst.emailDomain ?? null,
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
    emailDomain,
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
            <span className="brand-plp">{institution?.acronym || 'PLP'}</span>
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
          <span className="brand-plp">{institution?.acronym || 'PLP'}</span>
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
          <p className="admin-settings-lead" style={{ width: '100%', maxWidth: 'none', margin: '0 0 8px 0' }}>
            Name, logo, and exam defaults for your school. Shown in the sidebar and mobile header for
            all users at your institution.
          </p>

          {loading ? (
            <p className="admin-settings-lead">Loading…</p>
          ) : (
            <>
              <div className="admin-settings-logo-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '32px', marginTop: '16px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div className="admin-settings-logo-preview" style={{ width: '80px', height: '80px', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-surface-muted)' }}>
                    <InstitutionLogo logo={logo} width={64} height={64} alt="" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsLogoModalOpen(true)}
                    style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: 'var(--fg-default)' }}
                    title="Edit logo"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label className="admin-settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2, minWidth: '200px' }}>
                      <span className="admin-settings-label" style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Institution name
                      </span>
                      <div className={`inline-field-wrap${focusedField === 'name' ? ' is-active' : ''}`}>
                        <input
                          type="text"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          onFocus={() => setFocusedField('name')}
                          onKeyDown={(e) => { if (e.key === 'Enter') { onSaveProfile(); e.target.blur() } if (e.key === 'Escape') e.target.blur() }}
                          onBlur={() => setFocusedField(null)}
                          maxLength={100}
                          placeholder="Institution name"
                          className="inline-field-input"
                        />
                        {focusedField === 'name'
                          ? <span className="inline-field-hint">↵ to save &nbsp;·&nbsp; Esc to cancel</span>
                          : <span className="inline-field-hint">Click to edit</span>
                        }
                      </div>
                    </label>
                    <label className="admin-settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '120px' }}>
                      <span className="admin-settings-label" style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Acronym
                        <span 
                          title={`Shown as "${acronym.trim() || 'PLP'} ACSIS" in the app`}
                          onClick={() => toast(`Shown as "${acronym.trim() || 'PLP'} ACSIS" in the app`)}
                          style={{ cursor: 'pointer', display: 'inline-flex' }}
                        >
                          <Info size={13} color="var(--fg-muted)" />
                        </span>
                      </span>
                      <div className={`inline-field-wrap${focusedField === 'acronym' ? ' is-active' : ''}`}>
                        <input
                          type="text"
                          value={acronym}
                          onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                          onFocus={() => setFocusedField('acronym')}
                          onKeyDown={(e) => { if (e.key === 'Enter') { onSaveProfile(); e.target.blur() } if (e.key === 'Escape') e.target.blur() }}
                          onBlur={() => setFocusedField(null)}
                          maxLength={20}
                          placeholder="PLP"
                          autoCapitalize="characters"
                          className="inline-field-input"
                        />
                        {focusedField === 'acronym'
                          ? <span className="inline-field-hint">↵ to save &nbsp;·&nbsp; Esc to cancel</span>
                          : <span className="inline-field-hint">Click to edit</span>
                        }
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="admin-settings-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <label className="admin-settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="admin-settings-label" style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Sign-in email domain
                    <span 
                      title="Used for student sign-in (example: @plpasig.edu.ph). Sign in with Google only works for accounts whose domain is registered in your organization's Google Workspace."
                      onClick={() => toast("Used for student sign-in (example: @plpasig.edu.ph). Sign in with Google only works for accounts whose domain is registered in your organization's Google Workspace.", { duration: 6000 })}
                      style={{ cursor: 'pointer', display: 'inline-flex' }}
                    >
                      <Info size={13} color="var(--fg-muted)" />
                    </span>
                  </span>
                  <div className={`inline-field-wrap${focusedField === 'domain' ? ' is-active' : ''}`}>
                    <input
                      type="text"
                      value={emailDomain}
                      onChange={(e) => setEmailDomain(e.target.value)}
                      onFocus={() => setFocusedField('domain')}
                      onKeyDown={(e) => { if (e.key === 'Enter') { onSaveProfile(); e.target.blur() } if (e.key === 'Escape') e.target.blur() }}
                      onBlur={() => setFocusedField(null)}
                      maxLength={255}
                      placeholder="plpasig.edu.ph"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="inline-field-input"
                    />
                    {focusedField === 'domain'
                      ? <span className="inline-field-hint">↵ to save &nbsp;·&nbsp; Esc to cancel</span>
                      : <span className="inline-field-hint">Click to edit</span>
                    }
                  </div>
                </label>
                <label className="admin-settings-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="admin-settings-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fg-default)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Max warnings (per exam)
                    <span 
                      title="Students are flagged or removed after this many proctoring warnings"
                      onClick={() => toast("Students are flagged or removed after this many proctoring warnings")}
                      style={{ cursor: 'pointer', display: 'inline-flex' }}
                    >
                      <Info size={14} color="var(--fg-muted)" />
                    </span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[maxWarnings]}
                      onValueChange={(vals) => setMaxWarnings(vals[0])}
                      onValueCommit={() => onSaveProfile()}
                      className="flex-1 cursor-pointer"
                    />
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--fg-default)', minWidth: '2ch', textAlign: 'right' }}>
                      {maxWarnings}
                    </span>
                  </div>
                </label>
              </div>
            </>
          )}
        </FadeIn>

        <FadeIn delay={0.1} className="panel">
          <div className="panel-header">
            <span className="panel-title">Institution colors</span>
          </div>
          <p className="admin-settings-lead" style={{ width: '100%', maxWidth: 'none', margin: '0 0 8px 0' }}>
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
      
      <Dialog open={isLogoModalOpen} onOpenChange={setIsLogoModalOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Institution Logo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="w-[120px] h-[120px] rounded-2xl border border-border flex items-center justify-center overflow-hidden bg-muted">
              <InstitutionLogo logo={logo} width={96} height={96} alt="" />
            </div>
            <div className="flex flex-col gap-3 w-full items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  onLogoPick(e)
                  setIsLogoModalOpen(false)
                }}
                className="hidden"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border bg-background cursor-pointer text-sm font-medium text-foreground shadow-sm w-full hover:bg-accent"
              >
                <ImagePlus size={18} strokeWidth={2} />
                Upload new logo
              </button>
              {logo ? (
                <button
                  type="button"
                  onClick={() => {
                    setLogo(null)
                    onSaveProfile({ logo: null })
                    setIsLogoModalOpen(false)
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-destructive cursor-pointer text-sm font-medium w-full hover:bg-destructive/20"
                >
                  <Trash2 size={18} strokeWidth={2} />
                  Remove logo
                </button>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed m-0">
              Supported formats: PNG, JPEG, WebP.<br />Maximum size: 500 KB.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
