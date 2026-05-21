import PlpLogo from '@/components/brand/PlpLogo.jsx'

/** Full-viewport login / verify chrome (same shell as landing). */
export default function AuthImmersiveShell({ children }) {
  return (
    <div className="acsis-immersive">
      <header className="acsis-immersive__institution">
        <div className="acsis-immersive__logo-mark" aria-hidden>
          <PlpLogo className="acsis-logo-img" width={28} height={28} alt="" />
        </div>
        <span>Pamantasan ng Lungsod ng Pasig</span>
      </header>

      <main className="acsis-immersive__main">
        <div className="acsis-immersive__panel">
          <div className="acsis-immersive__brand">
            <h1 className="acsis-immersive__title acsis-immersive__title--brand">ACSIS</h1>
            <p className="acsis-immersive__subtitle">Anti-Cheating Student Integrity System</p>
          </div>
          <div className="acsis-immersive__content">{children}</div>
        </div>
      </main>
    </div>
  )
}
