import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'

/** Full-viewport login / verify chrome (same shell as landing). */
export default function AuthImmersiveShell({ children, showInstitutionHeader = false }) {
  return (
    <div
      className={
        showInstitutionHeader
          ? 'acsis-immersive'
          : 'acsis-immersive acsis-immersive--no-institution-header'
      }
    >
      {showInstitutionHeader ? (
        <header className="acsis-immersive__institution">
          <div className="acsis-immersive__logo-mark" aria-hidden>
            <InstitutionLogo className="acsis-logo-img" width={28} height={28} alt="" />
          </div>
          <span>ACSIS Platform</span>
        </header>
      ) : null}

      <main className="acsis-immersive__main">
        <div className="acsis-immersive__panel">
          <div className="acsis-immersive__brand">
            <div className="acsis-immersive__brand-row">
              <InstitutionLogo className="acsis-immersive__brand-logo" width={72} height={72} alt="" />
              <h1 className="acsis-immersive__title acsis-immersive__title--brand">ACSIS</h1>
            </div>
            <p className="acsis-immersive__subtitle">Anti-Cheating Student Integrity System</p>
          </div>
          <div className="acsis-immersive__content">{children}</div>
        </div>
      </main>
    </div>
  )
}
