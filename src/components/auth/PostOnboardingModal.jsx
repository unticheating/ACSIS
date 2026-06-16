import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2 } from 'lucide-react'
import InstitutionLogo from '@/components/brand/InstitutionLogo.jsx'
import {
  fetchOnboardingInstitutions,
  initialJoinClassByCode,
  joinClassByCode,
  requestInstructorAccess,
  saveStudentNumber,
} from '@/lib/authApi.js'
import { formatSchoolIdInput, validateSchoolIdClient } from '@/lib/userFormConstants.js'
import './PostOnboardingModal.css'

const STEP_STUDENT_NUMBER = 'student_number'
const STEP_JOIN_CLASS = 'join_class'
const STEP_INSTRUCTOR = 'instructor'
const STEP_DONE = 'done'

function buildSteps(flags) {
  const steps = []
  if (flags.needsOnboardingChoice) {
    steps.push(STEP_JOIN_CLASS)
    return steps
  }
  if (flags.needsStudentNumber) steps.push(STEP_STUDENT_NUMBER)
  if (flags.needsJoinClass) steps.push(STEP_JOIN_CLASS)
  return steps
}

export default function PostOnboardingModal({ authUser, onComplete }) {
  const steps = buildSteps({
    needsOnboardingChoice: Boolean(authUser?.needsOnboardingChoice),
    needsStudentNumber: Boolean(authUser?.needsStudentNumber),
    needsJoinClass: Boolean(authUser?.needsJoinClass),
  })

  const [stepIndex, setStepIndex] = useState(0)
  const [view, setView] = useState('student')
  const [studentNumber, setStudentNumber] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [institutions, setInstitutions] = useState([])
  const [institutionsLoading, setInstitutionsLoading] = useState(false)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const currentStep = steps[stepIndex] ?? STEP_DONE
  const totalSteps = steps.length
  const isInstructorView = view === STEP_INSTRUCTOR

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [stepIndex, view])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (!isInstructorView || institutions.length > 0) return
    let cancelled = false
    setInstitutionsLoading(true)
    fetchOnboardingInstitutions()
      .then((data) => {
        if (!cancelled) setInstitutions(data.institutions || [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load institutions.')
        }
      })
      .finally(() => {
        if (!cancelled) setInstitutionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isInstructorView, institutions.length])

  if (totalSteps === 0 || currentStep === STEP_DONE) return null

  async function handleStudentSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (currentStep === STEP_STUDENT_NUMBER) {
        const num = studentNumber.trim()
        const validationError = validateSchoolIdClient(num, true, 'student')
        if (validationError) {
          setError(validationError)
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
        if (authUser?.needsOnboardingChoice) {
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

  async function handleInstructorSubmit(e) {
    e.preventDefault()
    if (!selectedInstitutionId) {
      setError('Please choose your institution.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await requestInstructorAccess(selectedInstitutionId)
      if (onComplete) await onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const studentStepConfig = {
    [STEP_STUDENT_NUMBER]: {
      title: 'Setup your profile',
      description:
        'Please provide your student number to continue using the application. This links your account to your school record.',
      label: 'Student Number',
      placeholder: 'e.g. 22-00001',
      value: studentNumber,
      onChange: (val) => setStudentNumber(formatSchoolIdInput(val)),
      inputId: 'onboarding-student-number',
    },
    [STEP_JOIN_CLASS]: {
      title: 'Join a class',
      description: 'Enter the join code provided by your teacher to get started as a student.',
      label: 'Join Code',
      placeholder: 'Enter join code...',
      value: joinCode,
      onChange: setJoinCode,
      inputId: 'onboarding-join-code',
    },
  }

  const studentCfg = studentStepConfig[currentStep]
  const selectedInstitution = institutions.find((inst) => inst.institutionId === selectedInstitutionId) ?? null

  return createPortal(
    <div className="shadcn-dialog-overlay" role="dialog" aria-modal="true">
      <div className={`shadcn-dialog-content${isInstructorView ? ' shadcn-dialog-content--wide' : ''}`}>
        {isInstructorView ? (
          <>
            <div className="shadcn-dialog-header">
              <h2 className="shadcn-dialog-title">Choose your institution</h2>
              <p className="shadcn-dialog-description">
                Select the school you teach at. An administrator will review and approve your faculty access.
              </p>
            </div>

            <form onSubmit={handleInstructorSubmit} noValidate>
              <div className="shadcn-dialog-body">
                {institutionsLoading ? (
                  <p className="shadcn-dialog-description">Loading institutions…</p>
                ) : institutions.length === 0 ? (
                  <p className="shadcn-error-msg">No institutions are available right now.</p>
                ) : (
                  <>
                    <ul className="onboarding-institution-list" role="listbox" aria-label="Institutions">
                      {institutions.map((inst) => {
                        const selected = selectedInstitutionId === inst.institutionId
                        return (
                          <li key={inst.institutionId}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`onboarding-institution-item${selected ? ' is-selected' : ''}`}
                              onClick={() => {
                                setSelectedInstitutionId(inst.institutionId)
                                setError('')
                              }}
                              disabled={loading}
                            >
                              <span
                                className={`onboarding-institution-item__radio${selected ? ' is-selected' : ''}`}
                                aria-hidden
                              />
                              <InstitutionLogo
                                logo={inst.logo}
                                className="onboarding-institution-item__logo"
                                width={48}
                                height={48}
                                alt=""
                              />
                              <span className="onboarding-institution-item__text">
                                <span className="onboarding-institution-item__name">{inst.institutionName}</span>
                                {inst.acronym ? (
                                  <span className="onboarding-institution-item__acronym">{inst.acronym}</span>
                                ) : null}
                              </span>
                              {selected ? (
                                <CheckCircle2
                                  className="onboarding-institution-item__check"
                                  size={22}
                                  strokeWidth={2.25}
                                  aria-hidden
                                />
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    {selectedInstitution ? (
                      <p className="onboarding-institution-selected" role="status">
                        Selected: <strong>{selectedInstitution.institutionName}</strong>
                      </p>
                    ) : (
                      <p className="onboarding-institution-hint">Tap an institution to select it.</p>
                    )}
                  </>
                )}
                {error ? <p className="shadcn-error-msg">{error}</p> : null}
              </div>

              <div className="shadcn-dialog-footer shadcn-dialog-footer--split">
                <button
                  type="button"
                  className="shadcn-btn shadcn-btn-secondary"
                  disabled={loading}
                  onClick={() => {
                    setView('student')
                    setSelectedInstitutionId(null)
                    setError('')
                  }}
                >
                  Back
                </button>
                <button type="submit" className="shadcn-btn shadcn-btn-primary" disabled={loading || !selectedInstitutionId}>
                  {loading ? 'Submitting…' : 'Request faculty access'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="shadcn-dialog-header">
              <h2 className="shadcn-dialog-title">{studentCfg.title}</h2>
              <p className="shadcn-dialog-description">{studentCfg.description}</p>
            </div>

            <form onSubmit={handleStudentSubmit} noValidate>
              <div className="shadcn-dialog-body">
                {totalSteps > 1 && (
                  <div className="shadcn-dialog-step-indicator">
                    Step {stepIndex + 1} of {totalSteps}
                  </div>
                )}

                <div className="shadcn-field">
                  <label htmlFor={studentCfg.inputId} className="shadcn-label">
                    {studentCfg.label}
                  </label>
                  <input
                    ref={inputRef}
                    id={studentCfg.inputId}
                    type="text"
                    className="shadcn-input"
                    placeholder={studentCfg.placeholder}
                    value={studentCfg.value}
                    onChange={(e) => {
                      studentCfg.onChange(e.target.value)
                      setError('')
                    }}
                    disabled={loading}
                  />
                  {error ? <p className="shadcn-error-msg">{error}</p> : null}
                </div>
              </div>

              <div className="shadcn-dialog-footer shadcn-dialog-footer--stacked">
                <button type="submit" className="shadcn-btn shadcn-btn-primary shadcn-btn-full" disabled={loading}>
                  {loading ? 'Saving…' : 'Continue'}
                </button>
                {authUser?.needsOnboardingChoice ? (
                  <button
                    type="button"
                    className="shadcn-btn shadcn-btn-secondary shadcn-btn-full"
                    disabled={loading}
                    onClick={() => {
                      setView(STEP_INSTRUCTOR)
                      setError('')
                    }}
                  >
                    I am an Instructor
                  </button>
                ) : null}
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
