import { Link } from 'react-router-dom'

export default function AuthLoginFooter() {
  return (
    <footer className="acsis-immersive__auth-footer">
      <div className="acsis-immersive__auth-footer-brand">
        <span>ACSIS © 2026</span>
      </div>
      <p className="acsis-immersive__auth-footer-meta">
        <Link to="/about">About ACSIS</Link>
      </p>
    </footer>
  )
}
