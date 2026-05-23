import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { initialJoinClassByCode, joinClassByCode, saveStudentNumber } from '@/lib/authApi.js'
import './PostOnboardingModal.css'

const STEP_STUDENT_NUMBER = 'student_number'
const STEP_JOIN_CLASS = 'join_class'
const STEP_DONE = 'done'

function buildSteps(flags) {
  const steps = []
  if (flags.needsInitialJoin) {
    steps.push(STEP_JOIN_CLASS)
    return steps
  }
  if (flags.needsStudentNumber) steps.push(STEP_STUDENT_NUMBER)
  if (flags.needsJoinClass) steps.push(STEP_JOIN_CLASS)
  return steps
}

export default function PostOnboardingModal({ authUser, onComplete }) {
  const steps = buildSteps({
    needsInitialJoin: Boolean(authUser?.needsInitialJoin),
    needsStudentNumber: Boolean(authUser?.needsStudentNumber),
    needsJoinClass: Boolean(authUser?.needsJoinClass),
  })

  const [stepIndex, setStepIndex] = useState(0)
  const [studentNumber, setStudentNumber] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const currentStep = steps[stepIndex] ?? STEP_DONE
  const totalSteps = steps.length

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [stepIndex])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  if (totalSteps === 0 || currentStep === STEP_DONE) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (currentStep === STEP_STUDENT_NUMBER) {
        const num = studentNumber.trim()
        if (!num) {
          setError('Student number is required.')
          setLoading(false)
          return
        }
        await saveStudentNumber(num)
      }

      if (currentStep === STEP_JOIN_CLASS) {
        const code = joinCode.trim()
        if (!code) {
          setError('Class join code is required.')
          setLoading(false)
          return
        }
        if (authUser?.needsInitialJoin) {
          await initialJoinClassByCode(code)
        } else {
          await joinClassByCode(code)
        }
      }

      const nextIndex = stepIndex + 1
      if (nextIndex >= totalSteps) {
        if (onComplete) await onComplete()
      } else {
        setStepIndex(nextIndex)
        setError('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stepConfig = {
    [STEP_STUDENT_NUMBER]: {
      title: 'Setup your profile',
      description: 'Please provide your student number to continue using the application. This links your account to your school record.',
      label: 'Student Number',
      placeholder: 'e.g. 22-00001',
      value: studentNumber,
      onChange: setStudentNumber,
      inputType: 'text',
      inputId: 'onboarding-student-number',
    },
    [STEP_JOIN_CLASS]: {
      title: 'Join a class',
      description: 'Enter the join code provided by your teacher to get started.',
      label: 'Join Code',
      placeholder: 'Enter join code...',
      value: joinCode,
      onChange: setJoinCode,
      inputType: 'text',
      inputId: 'onboarding-join-code',
    },
  }

  const cfg = stepConfig[currentStep]

  return createPortal(
    <div className="shadcn-dialog-overlay" role="dialog" aria-modal="true">
      <div className="shadcn-dialog-content">
        <div className="shadcn-dialog-header">
          <h2 className="shadcn-dialog-title">{cfg.title}</h2>
          <p className="shadcn-dialog-description">{cfg.description}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="shadcn-dialog-body">
            {totalSteps > 1 && (
              <div className="shadcn-dialog-step-indicator">
                Step {stepIndex + 1} of {totalSteps}
              </div>
            )}
            
            <div className="shadcn-field">
              <label htmlFor={cfg.inputId} className="shadcn-label">
                {cfg.label}
              </label>
              <input
                ref={inputRef}
                id={cfg.inputId}
                type={cfg.inputType}
                className="shadcn-input"
                placeholder={cfg.placeholder}
                value={cfg.value}
                onChange={(e) => {
                  cfg.onChange(e.target.value)
                  setError('')
                }}
                disabled={loading}
              />
              {error && <p className="shadcn-error-msg">{error}</p>}
            </div>
          </div>

          <div className="shadcn-dialog-footer">
            <button
              type="submit"
              className="shadcn-btn shadcn-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="shadcn-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
