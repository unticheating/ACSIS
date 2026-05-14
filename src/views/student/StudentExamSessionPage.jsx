import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getExamInClass } from '@/lib/classesExams.js'
import { useSession } from '@/context/SessionContext.jsx'
import '../../pages/student-ui/exam_session.react.css'

const LOBBY_MS = 4000
const COUNTDOWN_SEC = 3
const DETECTION_RETURN_SEC = 5
const OVERLAY_FADE_MS = 340
const TAB_LEAVE_DEBOUNCE_MS = 450
const POST_DETECTION_COOLDOWN_MS = 1400

const MC_OPTIONS = [
  { value: 'a', label: 'IDS' },
  { value: 'b', label: 'IPS' },
  { value: 'c', label: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  { value: 'd', label: 'Firewall' },
]

const DEFAULT_CODE = `def is_strong_password(p):
    # your code here
    pass`

function isExamScene(name) {
  return name === 'mc' || name === 'id' || name === 'code' || name === 'tf'
}

function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function Chrome({ title, secondsLeft }) {
  return (
    <header className="exam-chrome">
      <div className="exam-logo" aria-hidden>
        PLP
      </div>
      <div className="exam-title-bar">{title}</div>
      <div className="exam-timer">{formatClock(secondsLeft)}</div>
    </header>
  )
}

export default function StudentExamSessionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const examId = searchParams.get('examId') || ''
  const { activeAccount } = useSession()

  const hit = useMemo(() => {
    if (!classId || !examId) return null
    return getExamInClass(classId, examId)
  }, [classId, examId])

  const examTitle = hit?.exam?.title || 'Examination'
  const durationMin = Number(hit?.exam?.duration || 35)
  const instructorWait = useMemo(() => {
    if (activeAccount?.id === 'faculty') return activeAccount.displayName
    return 'your instructor'
  }, [activeAccount])

  const [scene, setScene] = useState('lobby')
  const sceneRef = useRef(scene)
  useEffect(() => {
    sceneRef.current = scene
  }, [scene])

  const [countdownNum, setCountdownNum] = useState(COUNTDOWN_SEC)
  const [secondsLeft, setSecondsLeft] = useState(durationMin * 60)
  const [mcSel, setMcSel] = useState('a')
  const [idAnswer, setIdAnswer] = useState('')
  const [codeAnswer, setCodeAnswer] = useState(DEFAULT_CODE)
  const [tfSel, setTfSel] = useState('true')

  const [detectionOpen, setDetectionOpen] = useState(false)
  const [detectionReturn, setDetectionReturn] = useState(DETECTION_RETURN_SEC)
  const detectionRunningRef = useRef(false)
  const postCooldownUntilRef = useRef(0)
  const visibilityTimerRef = useRef(null)
  const returnSceneRef = useRef('mc')

  useEffect(() => {
    setSecondsLeft(durationMin * 60)
  }, [durationMin])

  useEffect(() => {
    if (!isExamScene(scene)) return undefined
    const id = window.setInterval(() => {
      setSecondsLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [scene])

  const showDetectionThenResume = useCallback(
    (returnTo, opts = {}) => {
      if (detectionRunningRef.current) return
      if (!opts.skipCooldown && Date.now() < postCooldownUntilRef.current) return

      detectionRunningRef.current = true
      returnSceneRef.current = returnTo
      setDetectionReturn(DETECTION_RETURN_SEC)
      setDetectionOpen(true)

      let left = DETECTION_RETURN_SEC
      const tick = () => {
        setDetectionReturn(left)
        if (left <= 0) {
          setDetectionOpen(false)
          window.setTimeout(() => {
            setScene(returnSceneRef.current)
            detectionRunningRef.current = false
            postCooldownUntilRef.current = Date.now() + POST_DETECTION_COOLDOWN_MS
          }, OVERLAY_FADE_MS)
          return
        }
        left -= 1
        window.setTimeout(tick, 1000)
      }
      tick()
    },
    [],
  )

  const scheduleTabLeave = useCallback(() => {
    if (visibilityTimerRef.current) {
      window.clearTimeout(visibilityTimerRef.current)
      visibilityTimerRef.current = null
    }
    if (!document.hidden) return
    if (!isExamScene(sceneRef.current) || detectionRunningRef.current) return

    visibilityTimerRef.current = window.setTimeout(() => {
      visibilityTimerRef.current = null
      if (!document.hidden || !isExamScene(sceneRef.current) || detectionRunningRef.current) return
      showDetectionThenResume(sceneRef.current)
    }, TAB_LEAVE_DEBOUNCE_MS)
  }, [showDetectionThenResume])

  const cancelTabLeave = useCallback(() => {
    if (visibilityTimerRef.current) {
      window.clearTimeout(visibilityTimerRef.current)
      visibilityTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    function onVis() {
      if (document.hidden) scheduleTabLeave()
      else cancelTabLeave()
    }
    function onKey(ev) {
      if (detectionRunningRef.current) return
      if (!isExamScene(sceneRef.current)) return
      if (ev.code !== 'F8') return
      ev.preventDefault()
      showDetectionThenResume(sceneRef.current, { skipCooldown: true })
    }
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('keydown', onKey)
      cancelTabLeave()
    }
  }, [cancelTabLeave, scheduleTabLeave, showDetectionThenResume])

  useEffect(() => {
    if (scene !== 'lobby') return undefined
    const t = window.setTimeout(() => {
      setScene('countdown')
      setCountdownNum(COUNTDOWN_SEC)
    }, LOBBY_MS)
    return () => window.clearTimeout(t)
  }, [scene])

  useEffect(() => {
    if (scene !== 'countdown') return undefined
    setCountdownNum(COUNTDOWN_SEC)
    let n = COUNTDOWN_SEC
    const step = () => {
      setCountdownNum(n)
      if (n <= 1) {
        window.setTimeout(() => setScene('mc'), 1000)
        return
      }
      n -= 1
      window.setTimeout(step, 1000)
    }
    const id = window.setTimeout(step, 0)
    return () => window.clearTimeout(id)
  }, [scene])

  if (!classId || !examId || !hit) {
    return (
      <div className="acsis-student-exam">
        <div className="lobby-main" style={{ minHeight: '60vh' }}>
          <p className="lobby-copy" style={{ marginBottom: 24 }}>
            Open an exam from a class you are enrolled in, or check the class code and exam link.
          </p>
          <Link to="/student/my-classes" className="exam-session-exit" style={{ color: '#86efac' }}>
            ← Enrolled classes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="acsis-student-exam">
      <section className={`scene${scene === 'lobby' ? ' is-active' : ''}`} aria-label="Exam lobby">
        <Chrome title={examTitle} secondsLeft={secondsLeft} />
        <main className="lobby-main">
          <h1 className="lobby-warning-title">WARNING:</h1>
          <div className="lobby-copy">
            <p>This examination system monitors your activity to ensure academic fairness.</p>
            <p>
              Actions like <strong>tab switching</strong>, <strong>leaving the exam page</strong>,{' '}
              <strong>screenshots</strong>, or <strong>right-clicking</strong> are detected. Avoid pressing Windows Key.
            </p>
            <p>
              You are allowed up to <strong>3 strikes</strong> only. If this limit is exceeded, your exam will be
              automatically submitted.
            </p>
            <p>Please remain on this page and complete the exam honestly.</p>
          </div>
        </main>
        <footer className="lobby-footer">
          <div className="lobby-spinner" aria-hidden />
          <p className="lobby-waiting">Waiting for {instructorWait} to start the exam…</p>
        </footer>
        <div className="exam-session-exit">
          <Link to={`/student/my-classes/${classId}`}>← Back to class</Link>
        </div>
      </section>

      <section className={`scene${scene === 'countdown' ? ' is-active' : ''}`} aria-label="Starting soon">
        <Chrome title={examTitle} secondsLeft={secondsLeft} />
        <main className="countdown-main">
          <p className="countdown-label">Starting in</p>
          <p className="countdown-number">{countdownNum}</p>
        </main>
      </section>

      <section className={`scene${scene === 'mc' ? ' is-active' : ''}`} aria-label="Multiple choice question">
        <Chrome title={examTitle} secondsLeft={secondsLeft} />
        <div className="exam-stage">
          <p className="exam-type-label">Multiple choice</p>
          <p className="exam-type-hint">Read carefully and choose the best answer for the question.</p>
          <div className="question-box">
            A tool that monitors network or system activities for suspicious behavior or attacks and alerts administrators.
          </div>
          <div className="options-list">
            {MC_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`option-row${mcSel === o.value ? ' is-selected' : ''}`}
                onClick={() => setMcSel(o.value)}
              >
                <span className="option-radio" aria-hidden />
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
        <footer className="exam-footer-bar">
          <span className="exam-section-label">Section 1 of 2</span>
          <div className="exam-footer-right">
            <button type="button" className="btn-next" onClick={() => setScene('id')}>
              Next <span aria-hidden>→</span>
            </button>
            <div className="progress-row">
              <span className="progress-label">Progress</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '18%' }} />
              </div>
            </div>
          </div>
        </footer>
      </section>

      <section className={`scene${scene === 'id' ? ' is-active' : ''}`} aria-label="Identification question">
        <Chrome title={examTitle} secondsLeft={secondsLeft} />
        <div className="exam-stage">
          <p className="exam-type-label">Identification</p>
          <p className="exam-type-hint">Type the correct answer for each question.</p>
          <div className="question-box">
            A tool that monitors network or system activities for suspicious behavior or attacks and alerts administrators.
          </div>
          <label className="visually-hidden" htmlFor="id-answer">
            Your answer
          </label>
          <input
            id="id-answer"
            className="id-input"
            value={idAnswer}
            onChange={(e) => setIdAnswer(e.target.value)}
            placeholder="Type your answer.."
            autoComplete="off"
          />
        </div>
        <footer className="exam-footer-bar">
          <span className="exam-section-label">Section 1 of 2</span>
          <div className="exam-footer-right">
            <button type="button" className="btn-next" onClick={() => setScene('code')}>
              Next <span aria-hidden>→</span>
            </button>
            <div className="progress-row">
              <span className="progress-label">Progress</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '32%' }} />
              </div>
            </div>
          </div>
        </footer>
      </section>

      <section className={`scene${scene === 'code' ? ' is-active' : ''}`} aria-label="Coding question">
        <Chrome title={examTitle} secondsLeft={secondsLeft} />
        <div className="exam-stage">
          <p className="exam-type-label">Manual coding</p>
          <p className="exam-type-hint">Write your solution in the editor. Syntax is not auto-checked in this preview.</p>
          <div className="question-box">
            Implement <strong>is_strong_password(p)</strong>: return <code>True</code> if string <code>p</code> is at least
            12 characters and contains at least one uppercase letter, one lowercase letter, and one digit; otherwise return{' '}
            <code>False</code>. Use only the starter code below.
          </div>
          <label className="visually-hidden" htmlFor="code-answer">
            Your code
          </label>
          <div className="code-editor-wrap">
            <textarea
              id="code-answer"
              className="code-editor"
              rows={14}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              value={codeAnswer}
              onChange={(e) => setCodeAnswer(e.target.value)}
            />
          </div>
        </div>
        <footer className="exam-footer-bar">
          <span className="exam-section-label">Section 1 of 2</span>
          <div className="exam-footer-right">
            <button type="button" className="btn-next" onClick={() => setScene('tf')}>
              Next <span aria-hidden>→</span>
            </button>
            <div className="progress-row">
              <span className="progress-label">Progress</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '55%' }} />
              </div>
            </div>
          </div>
        </footer>
      </section>

      <section className={`scene${scene === 'tf' ? ' is-active' : ''}`} aria-label="True or false question">
        <Chrome title={examTitle} secondsLeft={secondsLeft} />
        <div className="exam-stage">
          <p className="exam-type-label">True or false</p>
          <p className="exam-type-hint">Select whether the statement is true or false.</p>
          <div className="question-box">
            An intrusion detection system (IDS) only blocks malicious traffic and never logs events for review.
          </div>
          <div className="options-list tf-grid">
            {['true', 'false'].map((v) => (
              <button
                key={v}
                type="button"
                className={`option-row${tfSel === v ? ' is-selected' : ''}`}
                onClick={() => setTfSel(v)}
              >
                <span className="option-radio" aria-hidden />
                <span>{v === 'true' ? 'True' : 'False'}</span>
              </button>
            ))}
          </div>
        </div>
        <footer className="exam-footer-bar">
          <span className="exam-section-label">Section 1 of 2</span>
          <div className="exam-footer-right">
            <button
              type="button"
              className="btn-next"
              onClick={() =>
                navigate(`/student/exam/result?classId=${encodeURIComponent(classId)}&examId=${encodeURIComponent(examId)}`)
              }
            >
              Finish <span aria-hidden>→</span>
            </button>
            <div className="progress-row">
              <span className="progress-label">Progress</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '82%' }} />
              </div>
            </div>
          </div>
        </footer>
      </section>

      <div
        className={`detection-overlay${detectionOpen ? ' is-active' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="detection-title"
        aria-describedby="detection-desc"
      >
        <h2 id="detection-title" className="detection-title">
          Suspicious Activity Detected!
        </h2>
        <p id="detection-desc" className="detection-sub">
          This is a warning.
        </p>
        <p className="detection-strikes">1 strike</p>
        <p className="detection-countdown">Returning to exam in {detectionReturn}</p>
      </div>
    </div>
  )
}
