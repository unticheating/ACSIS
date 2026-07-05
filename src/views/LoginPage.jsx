import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AuthImmersiveShell from '@/components/auth/AuthImmersiveShell.jsx'
import PlpLogo from '@/components/brand/PlpLogo.jsx'
import { useSession } from '@/context/SessionContext.jsx'
import {
  AUTH_ERROR_MESSAGES,
  isAuthAwaitingSetup,
  startGoogleSignIn,
  loginWithPassword,
  requestPasswordReset,
  startEmailVerification,
} from '@/lib/authApi.js'
import {
  clearAuthRedirectPendingError,
  GOOGLE_DOMAIN_BANNER_MESSAGE,
  isAuthRedirectBannerError,
  resolveAuthRedirectErrorCode,
  stripAuthRedirectParams,
} from '@/lib/authRedirectError.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useDocumentTitle } from '@/hooks/useDocumentTitle.js'
import '../styles/acsis-immersive.css'

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { refreshAuth, authUser, authLoading, isAuthenticated, activeAccount } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgotPasswordSubmitting, setForgotPasswordSubmitting] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [googleDomainBanner, setGoogleDomainBanner] = useState(false)
  const noMembershipToastUidRef = useRef(null)

  useLayoutEffect(() => {
    const errorCode = resolveAuthRedirectErrorCode(searchParams)
    if (!isAuthRedirectBannerError(errorCode)) return

    setGoogleDomainBanner(true)
    clearAuthRedirectPendingError()

    if (searchParams.get('error')) {
      setSearchParams(stripAuthRedirectParams(searchParams), { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated && location.pathname === '/') {
      if (authUser?.mustChangePassword) {
        navigate('/change-password', { replace: true })
        return
      }
      if (activeAccount.entryPath) {
        navigate(activeAccount.entryPath, { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, authUser?.mustChangePassword, activeAccount.entryPath, location.pathname, navigate])

  useEffect(() => {
    if (searchParams.get('auth') !== 'success') return
    refreshAuth()
      .then(() => {
        setSearchParams(stripAuthRedirectParams(searchParams), { replace: true })
      })
      .catch(() => {})
  }, [refreshAuth, searchParams, setSearchParams])

  useEffect(() => {
    const verifyEmail = searchParams.get('email')
    if (verifyEmail && location.pathname === '/') {
      navigate(`/verify?email=${encodeURIComponent(verifyEmail)}`, { replace: true })
    }
  }, [searchParams, location.pathname, navigate])

  useEffect(() => {
    if (!authUser || authUser.portal || isAuthAwaitingSetup(authUser)) {
      return
    }
    if (noMembershipToastUidRef.current === authUser.uid) {
      return
    }
    noMembershipToastUidRef.current = authUser.uid
    acsisToastError(AUTH_ERROR_MESSAGES.no_membership)
  }, [authUser])

  function onGoogle() {
    startGoogleSignIn()
  }

  async function onForgotPassword() {
    const trimmed = email.trim()
    if (!trimmed) {
      acsisToastError('Enter your registered email first, then tap Forgot password.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      acsisToastError('Enter a valid email address.')
      return
    }

    setForgotPasswordSubmitting(true)
    try {
      await requestPasswordReset(trimmed)
      acsisToastSuccess('A temporary password was sent to your email.')
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Could not send temporary password.')
    } finally {
      setForgotPasswordSubmitting(false)
    }
  }

  async function onEmailContinue(e) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      acsisToastError('Enter your ACSIS registered email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      acsisToastError('Enter a valid email address.')
      return
    }
    if (!password) {
      acsisToastError('Enter your password.')
      return
    }

    const demoAccounts = [
      'admin@plpasig.edu.ph',
      'teacher@plpasig.edu.ph',
      'student@plpasig.edu.ph'
    ];

    setIsLoggingIn(true)

    if (demoAccounts.includes(trimmed.toLowerCase())) {
      try {
        await loginWithPassword(trimmed, password)
        const user = await refreshAuth()
        if (user?.mustChangePassword) {
          navigate('/change-password', { replace: true })
        } else if (user?.entryPath) {
          navigate(user.entryPath, { replace: true })
        } else {
          acsisToastError(AUTH_ERROR_MESSAGES.no_membership)
        }
      } catch (err) {
        acsisToastError(err instanceof Error ? err.message : 'Sign-in failed.')
      } finally {
        setIsLoggingIn(false)
      }
      return
    }

    try {
      const data = await startEmailVerification(trimmed, password)
      if (data.verificationRequired === false && data.user?.entryPath) {
        const user = await refreshAuth()
        if (user?.mustChangePassword) {
          navigate('/change-password', { replace: true })
          return
        }
        navigate(user?.entryPath || data.user.entryPath, { replace: true })
        return
      }
      navigate(`/verify?email=${encodeURIComponent(trimmed)}`, { replace: true })
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Could not send verification code.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <AuthImmersiveShell showInstitutionHeader={false}>
      <div className="acsis-immersive__auth-stack">
        <div className="acsis-immersive__auth-card">
        {googleDomainBanner ? (
          <div className="acsis-immersive__banner" role="alert">
            <p className="acsis-immersive__banner-title">{GOOGLE_DOMAIN_BANNER_MESSAGE}</p>
          </div>
        ) : null}
        <p className="acsis-immersive__hint acsis-immersive__hint--center">
          Sign in with your school account.
        </p>
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

        <form
          onSubmit={onEmailContinue}
          className="acsis-immersive__credential-form"
          noValidate
        >
          <p className="acsis-immersive__email-intro">
            Login with your ACSIS registered email.
          </p>
          <div className="acsis-immersive__field">
            <label htmlFor="acsis-email">Email</label>
            <input
              id="acsis-email"
              className="acsis-immersive__input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@school.edu.ph"
              aria-required="true"
            />
          </div>
          <div className="acsis-immersive__field">
            <label htmlFor="acsis-password">Password</label>
            <div className="acsis-immersive__password-field">
            <input
              id="acsis-password"
              className="acsis-immersive__input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="Enter your password"
              aria-required="true"
            />
              <button
                type="button"
                className="acsis-immersive__password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 5c5.5 0 9.9 4 11 7-1.1 3-5.5 7-11 7S2.1 15 1 12c1.1-3 5.5-7 11-7zm0 2C7.8 7 4.2 9.8 3.1 12 4.2 14.2 7.8 17 12 17s7.8-2.8 8.9-5C19.8 9.8 16.2 7 12 7zm0 2.25A2.75 2.75 0 1 1 12 14.75 2.75 2.75 0 0 1 12 9.25z"
                    />
                    <path
                      fill="currentColor"
                      d="M4.22 4.22 19.78 19.78l-1.06 1.06L3.16 5.28z"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 5c5.5 0 9.9 4 11 7-1.1 3-5.5 7-11 7S2.1 15 1 12c1.1-3 5.5-7 11-7zm0 2C7.8 7 4.2 9.8 3.1 12 4.2 14.2 7.8 17 12 17s7.8-2.8 8.9-5C19.8 9.8 16.2 7 12 7zm0 1.75A3.25 3.25 0 1 1 12 15.25 3.25 3.25 0 0 1 12 8.75z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="acsis-immersive__link-btn"
            onClick={onForgotPassword}
            disabled={forgotPasswordSubmitting}
          >
            {forgotPasswordSubmitting ? 'Sending temporary password…' : 'Forgot password?'}
          </button>
          <button
            type="submit"
            className="acsis-immersive__btn-primary"
            disabled={isLoggingIn}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoggingIn ? (
              <>
                <div className="acsis-immersive__spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Logging in…
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
        </div>
        <footer className="acsis-immersive__trust-footer">
          <div className="acsis-immersive__trust-footer-brand">
            <PlpLogo className="acsis-logo-img" width={22} height={22} alt="" aria-hidden />
            <span>Pamantasan ng Lungsod ng Pasig</span>
          </div>
          <p className="acsis-immersive__trust-note">
            Official secure login for Pamantasan ng Lungsod ng Pasig faculty and students.
            Google sign-in uses your school Google account on Google&apos;s own sign-in page.
          </p>
        </footer>
      </div>
    </AuthImmersiveShell>
  )
}
