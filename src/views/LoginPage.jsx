import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '@/context/SessionContext.jsx'
import { AUTH_ERROR_MESSAGES, loginWithPassword, startGoogleSignIn } from '@/lib/authApi.js'
import '../styles/acsis-immersive.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { refreshAuth, authUser, authLoading, isAuthenticated, activeAccount } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [banner, setBanner] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const errorCode = searchParams.get('error')
    if (errorCode) {
      setBanner(AUTH_ERROR_MESSAGES[errorCode] || 'Sign-in could not be completed.')
      searchParams.delete('error')
      searchParams.delete('auth')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated && activeAccount.entryPath && location.pathname === '/') {
      navigate(activeAccount.entryPath, { replace: true })
    }
  }, [authLoading, isAuthenticated, activeAccount.entryPath, navigate])

  useEffect(() => {
    if (searchParams.get('auth') === 'success') {
      refreshAuth().catch(() => {})
    }
  }, [refreshAuth, searchParams])

  function onGoogle() {
    startGoogleSignIn()
  }

  async function onAdminLogin(e) {
    e.preventDefault()
    setBanner(null)
    setSubmitting(true)
    try {
      await loginWithPassword(email, password)
      const user = await refreshAuth()
      if (user?.entryPath) {
        navigate(user.entryPath, { replace: true })
      } else {
        setBanner('Login succeeded but no portal was assigned. Contact your administrator.')
      }
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="acsis-immersive">
      <header className="acsis-immersive__institution">
        <div className="acsis-immersive__logo-mark" aria-hidden>
          PLP
        </div>
        <span>Pamantasan ng Lungsod ng Pasig</span>
      </header>

      <main className="acsis-immersive__main">
        <div className="acsis-immersive__panel">
          <h1 className="acsis-immersive__title acsis-immersive__title--brand">ACSIS</h1>
          <p className="acsis-immersive__subtitle">Anti-Cheating Student Integrity System</p>

          <div className="acsis-immersive__auth-stack">
            {banner ? (
              <p className="acsis-immersive__error" role="alert">
                {banner}
              </p>
            ) : null}
            {authUser && !authUser.portal ? (
              <p className="acsis-immersive__error" role="alert">
                {AUTH_ERROR_MESSAGES.no_membership}
              </p>
            ) : null}

            <p className="acsis-immersive__hint">Sign in with your @plpasig.edu.ph Google account</p>
            <button type="button" className="acsis-immersive__btn-google" onClick={onGoogle}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.86 11.86 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
              Sign in with Google
            </button>

            <div className="acsis-immersive__or">OR</div>

            <p className="acsis-immersive__alt-signin">Login with your ACSIS registered account</p>

            <form onSubmit={onAdminLogin} className="acsis-immersive__credential-form">
              <div className="acsis-immersive__field">
                <label htmlFor="acsis-admin-email">Email</label>
                <input
                  id="acsis-admin-email"
                  className="acsis-immersive__input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@plpasig.edu.ph"
                  required
                />
              </div>
              <div className="acsis-immersive__field">
                <label htmlFor="acsis-admin-password">Password</label>
                <input
                  id="acsis-admin-password"
                  className="acsis-immersive__input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                className="acsis-immersive__btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Signing in…' : 'Log in'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
