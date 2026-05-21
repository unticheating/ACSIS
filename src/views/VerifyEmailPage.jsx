import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthImmersiveShell from '@/components/auth/AuthImmersiveShell.jsx'
import { AUTH_ERROR_MESSAGES, loginWithPassword } from '@/lib/authApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import { useSession } from '@/context/SessionContext.jsx'
import '../styles/acsis-immersive.css'

const CODE_LENGTH = 5

function emptyDigits() {
  return Array.from({ length: CODE_LENGTH }, () => '')
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshAuth } = useSession()
  const email = String(location.state?.email || '').trim()
  const password = String(location.state?.password || '')
  const [digits, setDigits] = useState(emptyDigits)
  const [submitting, setSubmitting] = useState(false)
  const inputsRef = useRef([])

  useEffect(() => {
    if (!email || !password) navigate('/', { replace: true })
  }, [email, password, navigate])

  useEffect(() => {
    if (email) inputsRef.current[0]?.focus()
  }, [email])

  function focusIndex(i) {
    inputsRef.current[i]?.focus()
  }

  function setDigitAt(index, value) {
    const ch = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = ch
      return next
    })
    if (ch && index < CODE_LENGTH - 1) focusIndex(index + 1)
  }

  function onDigitChange(index, ev) {
    setDigitAt(index, ev.target.value)
  }

  function onDigitKeyDown(index, ev) {
    if (ev.key === 'Backspace' && !digits[index] && index > 0) {
      ev.preventDefault()
      focusIndex(index - 1)
      setDigits((prev) => {
        const next = [...prev]
        next[index - 1] = ''
        return next
      })
    }
    if (ev.key === 'ArrowLeft' && index > 0) {
      ev.preventDefault()
      focusIndex(index - 1)
    }
    if (ev.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      ev.preventDefault()
      focusIndex(index + 1)
    }
  }

  function onPaste(ev) {
    ev.preventDefault()
    const pasted = ev.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = emptyDigits()
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusIndex(Math.min(pasted.length, CODE_LENGTH - 1))
  }

  async function onSubmit(ev) {
    ev.preventDefault()
    const code = digits.join('')
    if (code.length !== CODE_LENGTH) {
      acsisToastError('Enter the 5-digit code from your email.')
      return
    }

    setSubmitting(true)
    try {
      await loginWithPassword(email, password)
      const user = await refreshAuth()
      if (user?.entryPath) {
        navigate(user.entryPath, { replace: true })
      } else {
        acsisToastError(AUTH_ERROR_MESSAGES.no_membership)
      }
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!email || !password) return null

  return (
    <AuthImmersiveShell>
      <div className="acsis-immersive__auth-stack">
        <p className="acsis-immersive__verify-lead">
          A verification code was sent to your email
          <span className="acsis-immersive__verify-email">{email}</span>
        </p>

        <form onSubmit={onSubmit} className="acsis-immersive__verify-form" noValidate>
          <div
            className="acsis-immersive__code-row"
            role="group"
            aria-label="Verification code"
            onPaste={onPaste}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                className="acsis-immersive__code-box"
                value={d}
                aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                onChange={(ev) => onDigitChange(i, ev)}
                onKeyDown={(ev) => onDigitKeyDown(i, ev)}
                onFocus={(ev) => ev.target.select()}
              />
            ))}
          </div>

          <button type="submit" className="acsis-immersive__btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Submit'}
          </button>
        </form>

        <p className="acsis-immersive__verify-back">
          <Link to="/">Use a different email</Link>
        </p>
      </div>
    </AuthImmersiveShell>
  )
}
