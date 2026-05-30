import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { cardNeuStyleVars } from '@/lib/cardNeuStyle.js'
import { fetchSuperAdminInstitutions } from '@/lib/superAdminInstitutionsApi.js'
import { useTheme } from '@/context/ThemeContext.jsx'
import AddInstitutionDialog from './AddInstitutionDialog.jsx'
import AssignInstitutionAdminDialog from './AssignInstitutionAdminDialog.jsx'
import '../../pages/admin-ui/style.css'
import '../../styles/super-admin-institutions.css'

function InstitutionCard({ institution, isDark, onAssignAdmin }) {
  const primary = institution.theme?.primaryColor || '#334155'

  return (
    <li>
      <article
        className="super-admin-institution-card acsis-card-surface"
        style={cardNeuStyleVars(primary, isDark)}
      >
        <div className="super-admin-institution-card__accent" aria-hidden />
        <div className="super-admin-institution-card__body">
          <div className="super-admin-institution-card__logo-wrap">
            <InstitutionLogo
              logo={institution.logo}
              className="super-admin-institution-card__logo"
              width={64}
              height={64}
              alt=""
            />
          </div>
          <h3 className="super-admin-institution-card__name" title={institution.institutionName}>
            {institution.institutionName}
          </h3>
          <p className="super-admin-institution-card__acronym">
            {institution.acronym || '\u00A0'}
          </p>
        </div>
        <div className="super-admin-institution-card__footer">
          <span className="super-admin-institution-card__theme">
            <span
              className="super-admin-institution-card__swatch"
              style={{ backgroundColor: institution.theme?.primaryColor || '#334155' }}
              aria-hidden
            />
            {institution.theme?.themeName || 'Theme'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => onAssignAdmin(institution)}
            >
              Assign admin
            </button>
            <Badge variant={institution.isActive ? 'default' : 'muted'}>
              {institution.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </article>
    </li>
  )
}

export default function SuperAdminInstitutionsPage() {
  const { theme: colorMode } = useTheme()
  const isDark = colorMode === 'dark'
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [assignInstitution, setAssignInstitution] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await fetchSuperAdminInstitutions()
      setInstitutions(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load institutions.')
      setInstitutions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onInstitutionCreated = useCallback((institution) => {
    setInstitutions((prev) => {
      const next = [...prev, institution]
      next.sort((a, b) => {
        const byName = a.institutionName.localeCompare(b.institutionName)
        if (byName !== 0) return byName
        return a.institutionId - b.institutionId
      })
      return next
    })
  }, [])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Institutions</span>
        </div>
        <div className="content-header__actions">
          <button type="button" className="btn" onClick={() => setAddOpen(true)} disabled={loading}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Institution
          </button>
        </div>
      </div>

      <div className="content-body">
        <p className="admin-placeholder-lead">
          Schools on the platform. Each institution has its own branding theme applied for members.
        </p>

        {loading ? <p className="admin-placeholder-lead">Loading institutions…</p> : null}
        {error ? (
          <p className="admin-placeholder-lead" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && institutions.length === 0 ? (
          <p className="admin-placeholder-lead">No institutions yet. Use Add Institution to provision the first school.</p>
        ) : null}

        {!loading && institutions.length > 0 ? (
          <ul className="super-admin-institutions-grid" aria-label="Institutions">
            {institutions.map((inst) => (
              <InstitutionCard
                key={inst.institutionId}
                institution={inst}
                isDark={isDark}
                onAssignAdmin={setAssignInstitution}
              />
            ))}
          </ul>
        ) : null}
      </div>

      <AddInstitutionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={onInstitutionCreated}
      />

      <AssignInstitutionAdminDialog
        open={Boolean(assignInstitution)}
        onOpenChange={(open) => {
          if (!open) setAssignInstitution(null)
        }}
        institution={assignInstitution}
      />
    </div>
  )
}
