import { useCallback, useEffect, useState } from 'react'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { cardNeuStyleVars } from '@/lib/cardNeuStyle.js'
import { fetchSuperAdminInstitutions } from '@/lib/superAdminInstitutionsApi.js'
import { useTheme } from '@/context/ThemeContext.jsx'
import '../../pages/admin-ui/style.css'
import '../../styles/super-admin-institutions.css'

function InstitutionCard({ institution, isDark }) {
  const primary = institution.theme?.primaryColor || '#334155'

  return (
    <li>
      <article
        className="super-admin-institution-card acsis-card-surface"
        style={cardNeuStyleVars(primary, isDark)}
      >
        <div className="super-admin-institution-card__accent" aria-hidden />
        <div className="super-admin-institution-card__body">
          <InstitutionLogo
            logo={institution.logo}
            className="super-admin-institution-card__logo"
            width={64}
            height={64}
            alt=""
          />
          <h3 className="super-admin-institution-card__name">{institution.institutionName}</h3>
          {institution.acronym ? (
            <p className="super-admin-institution-card__acronym">{institution.acronym}</p>
          ) : null}
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
          <Badge variant={institution.isActive ? 'default' : 'muted'}>
            {institution.isActive ? 'Active' : 'Inactive'}
          </Badge>
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

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Institutions</span>
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
          <p className="admin-placeholder-lead">No institutions yet.</p>
        ) : null}

        {!loading && institutions.length > 0 ? (
          <ul className="super-admin-institutions-grid" aria-label="Institutions">
            {institutions.map((inst) => (
              <InstitutionCard key={inst.institutionId} institution={inst} isDark={isDark} />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
