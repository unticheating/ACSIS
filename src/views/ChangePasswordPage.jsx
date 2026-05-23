import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthImmersiveShell from '@/components/auth/AuthImmersiveShell.jsx'
import { Button } from '@/components/ui/button.jsx'
import { useSession } from '@/context/SessionContext.jsx'
import { changePassword } from '@/lib/authApi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import '../styles/acsis-immersive.css'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { authLoading, authUser, refreshAuth } = useSession()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (authLoading) return null
  if (!authUser) return <Navigate to="/" replace />
  if (!authUser.mustChangePassword) {
    return <Navigate to={authUser.entryPath || '/'} replace />
  }

  async function onSubmit(ev) {
    ev.preventDefault()
    if (newPassword.length < 8) {
      acsisToastError('Choose a password with at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      acsisToastError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const data = await changePassword(newPassword, confirmPassword)
      await refreshAuth()
      acsisToastSuccess('Your password was updated.')
      navigate(data.user?.entryPath || authUser.entryPath || '/', { replace: true })
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Could not update your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="acsis-immersive__auth-stack">
        <p className="acsis-immersive__verify-lead">
          Temporary password detected.
          <span className="acsis-immersive__verify-email">Set a new password to continue.</span>
        </p>

        <form onSubmit={onSubmit} className="acsis-immersive__credential-form" noValidate>
          <div className="acsis-immersive__field">
            <label htmlFor="acsis-new-password">New password</label>
            <div className="acsis-immersive__password-field">
              <input
                id="acsis-new-password"
                className="acsis-immersive__input"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
              <button
                type="button"
                className="acsis-immersive__password-toggle"
                onClick={() => setShowNewPassword((current) => !current)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                aria-pressed={showNewPassword}
              >
                {showNewPassword ? (
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

          <div className="acsis-immersive__field">
            <label htmlFor="acsis-confirm-password">Confirm new password</label>
            <div className="acsis-immersive__password-field">
              <input
                id="acsis-confirm-password"
                className="acsis-immersive__input"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                className="acsis-immersive__password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
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

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </div>
    </AuthImmersiveShell>
  )
}