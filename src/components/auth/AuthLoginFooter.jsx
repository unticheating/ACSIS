import { Link } from 'react-router-dom'
import PlpLogo from '@/components/brand/PlpLogo.jsx'

export default function AuthLoginFooter() {
  return (
    <footer className="acsis-immersive__auth-footer">
      <div className="acsis-immersive__auth-footer-brand">
        <PlpLogo className="acsis-immersive__auth-footer-logo" width={16} height={16} alt="" aria-hidden />
        <span>Pamantasan ng Lungsod ng Pasig</span>
      </div>
      <p className="acsis-immersive__auth-footer-meta">
        <Link to="/about">About ACSIS</Link>
      </p>
    </footer>
  )
}
