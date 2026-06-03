import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import '../../pages/admin-ui/style.css'

export default function AdminPlaceholderPage({ title }) {
  const { acronym } = useInstitutionTheme()
  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{title}</span>
        </div>
      </div>
      <div className="content-body">
        <p className="admin-placeholder-lead">
          This admin view is a placeholder in the React SPA. Wire it to your PHP API or database when ready.
        </p>
      </div>
    </div>
  )
}
