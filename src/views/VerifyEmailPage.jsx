import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthImmersiveShell from '@/components/auth/AuthImmersiveShell.jsx'
import {
  fetchVerificationPending,
  resendVerificationCode,
  verifyEmailCode,
} from '@/lib/authApi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useSession } from '@/context/SessionContext.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Button } from '@/components/ui/button.jsx'
import '../styles/acsis-immersive.css'

const CODE_LENGTH = 6
const NEEDS_JOIN_CLASS_KEY = 'acsis.needsJoinClass'

function emptyDigits() {
  return Array.from({ length: CODE_LENGTH }, () => '')
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshAuth } = useSession()
  const [email, setEmail] = useState(String(searchParams.get('email') || '').trim())
  const [digits, setDigits] = useState(emptyDigits)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [devHint, setDevHint] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [entryPath, setEntryPath] = useState('/student/my-classes')
  const [needsJoinClass, setNeedsJoinClass] = useState(false)
  const inputsRef = useRef([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchVerificationPending()
        if (cancelled) return
        if (!data.pending) {
          navigate('/', { replace: true })
          return
        }
        setEmail(data.email || email)
        if (data.devHint) setDevHint(data.devHint)
      } catch {
        if (!cancelled) navigate('/', { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, email])

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
      acsisToastError(`Enter the ${CODE_LENGTH}-digit code from your email.`)
      return
    }

    setSubmitting(true)
    try {
      const data = await verifyEmailCode(code)
      await refreshAuth()
      setEntryPath(data.user?.mustChangePassword ? '/change-password' : (data.user?.entryPath || '/student/my-classes'))
      setNeedsJoinClass(Boolean(data.needsJoinClass))
      setShowSuccess(true)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onResend() {
    setResending(true)
    try {
      const data = await resendVerificationCode()
      acsisToastSuccess('A new verification code was sent to your email.')
      if (data.devHint) setDevHint(data.devHint)
      setDigits(emptyDigits())
      focusIndex(0)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Could not resend code.')
    } finally {
      setResending(false)
    }
  }

  function onSuccessContinue() {
    if (needsJoinClass) {
      sessionStorage.setItem(NEEDS_JOIN_CLASS_KEY, '1')
    }
    navigate(entryPath, { replace: true })
  }

  if (!email) return null

  return (
    <AuthImmersiveShell showInstitutionHeader={false}>
      <div className="acsis-immersive__auth-stack">
        <p className="acsis-immersive__verify-lead">
          A verification code was sent to your email
          <span className="acsis-immersive__verify-email">{email}</span>
        </p>

        {devHint ? <p className="acsis-immersive__verify-dev-hint">{devHint}</p> : null}

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
            {submitting ? 'Verifying…' : 'Submit'}
          </button>
        </form>

        <p className="acsis-immersive__verify-back">
          <button type="button" className="acsis-immersive__link-btn" onClick={onResend} disabled={resending}>
            {resending ? 'Sending…' : 'Resend code'}
          </button>
          {' · '}
          <Link to="/">Use a different account</Link>
        </p>
      </div>

      <Dialog open={showSuccess} onOpenChange={() => {}}>
        <DialogContent
          className="stu-join-dialog"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#166534]">Sign-in successful</DialogTitle>
            <DialogDescription>
              Your email was verified. You can continue to ACSIS
              {needsJoinClass ? ' and join your first class with your instructor\'s class code.' : '.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={onSuccessContinue} className="w-full sm:w-auto">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthImmersiveShell>
  )
}
