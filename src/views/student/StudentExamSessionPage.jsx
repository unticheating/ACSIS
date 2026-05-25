import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, LayoutGrid, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { ExamSessionHeader } from '@/components/student/ExamSessionHeader.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { useTheme } from '@/context/ThemeContext.jsx'
import {
  MONACO_EXAM_EDITOR_OPTIONS,
  monacoThemeForApp,
  normalizeCodingLanguage,
} from '@/lib/monacoExamEditor.js'
import {
  fetchStudentExamSession,
  joinStudentExam,
  logExamCheating,
  submitExamAnswers,
} from '@/lib/studentExamApi.js'
import { PG_EXAM_STATUS, normalizeExamStatus } from '@/lib/examFlowUi.js'
import { MAX_EXAM_WARNINGS, labelForCheatEvent } from '@/lib/examAntiCheat.js'
import { computeExamTimeDisplay } from '@/lib/examCountdown.js'
import { acsisToastError } from '@/lib/acsisToast.js'

import { useSession } from '@/context/SessionContext.jsx'
import { useDocumentTitle } from '@/hooks/useDocumentTitle.js'
import '../../pages/student-ui/exam_session.react.css'

const COUNTDOWN_SEC = 3
const DETECTION_RETURN_SEC = 5
const OVERLAY_FADE_MS = 340
const TAB_LEAVE_DEBOUNCE_MS = 450
const POST_DETECTION_COOLDOWN_MS = 1400

function isExamScene(name) {
  return name === 'question'
}

function questionTypeLabel(type) {
  if (type === 'multiple-choice') return 'Multiple choice'
  if (type === 'truefalse') return 'True / false'
  if (type === 'coding') return 'Coding / scripting'
  return 'Identification'
}

function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function StudentExamSessionPage() {
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const examId = searchParams.get('examId') || ''
  const { activeAccount } = useSession()
  const { theme } = useTheme()

  const [hit, setHit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [examPassword, setExamPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [scene, setScene] = useState('lobby')
  const sceneRef = useRef(scene)

  const loadSession = useCallback(async () => {
    if (!classId || !examId) {
      setLoading(false)
      return
    }
    try {
      const data = await fetchStudentExamSession(classId, examId)
      if (!data.joined) {
        setNeedsPassword(true)
        setHit(null)
        setError(null)
        return
      }
      setNeedsPassword(false)
      setWarningCount(Number(data.warningCount || 0))
      if (data.sessionStatus === 'submitted') {
        setHit({ exam: data.exam })
        setSubmitResult(
          data.result
            ? { ...data.result, scoreReleased: true }
            : data.scorePending
              ? { scorePending: true, scoreReleased: false }
              : null,
        )
        setScene('submitted')
        setError(null)
        return
      }
      setHit({ exam: { ...data.exam, questions: data.questions || [] } })
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch exam.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [classId, examId])

  useEffect(() => {
    setLoading(true)
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!hit?.exam || needsPassword) return undefined
    const st = normalizeExamStatus(hit.exam.status)
    if (st !== PG_EXAM_STATUS.WAITING) return undefined

    const interval = window.setInterval(() => {
      loadSession()
    }, 2500)
    return () => window.clearInterval(interval)
  }, [hit?.exam?.status, needsPassword, loadSession])

  async function submitExamPassword(e) {
    e.preventDefault()
    setJoining(true)
    setError(null)
    try {
      await joinStudentExam(classId, examId, examPassword)
      setNeedsPassword(false)
      setLoading(true)
      await loadSession()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Incorrect exam code.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setJoining(false)
      setLoading(false)
    }
  }

  const examTitle = hit?.exam?.title || 'Examination'
  useDocumentTitle(examTitle)
  const instructorWait = useMemo(() => {
    if (activeAccount?.id === 'faculty') return activeAccount.displayName
    return 'your instructor'
  }, [activeAccount])

  const questions = hit?.exam?.questions || []
  const [countdownNum, setCountdownNum] = useState(COUNTDOWN_SEC)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitResult, setSubmitResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [warningCount, setWarningCount] = useState(0)
  const [lastViolationLabel, setLastViolationLabel] = useState('')

  const submitToServer = useCallback(async () => {
    if (!classId || !examId) {
      setScene('submitted')
      return
    }
    const payload = questions.map((q) => ({
      questionId: q.id,
      answerText: answers[q.id] != null ? String(answers[q.id]) : '',
    }))
    setSubmitError(null)
    try {
      const result = await submitExamAnswers(classId, examId, payload)
      setSubmitResult(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit exam.'
      setSubmitError(msg)
      acsisToastError(msg)
      console.error(err)
    }
    setScene('submitted')
  }, [answers, classId, examId, questions])

  useEffect(() => {
    sceneRef.current = scene
  }, [scene])

  const examGuardActive = scene === 'question' || scene === 'countdown'

  useEffect(() => {
    if (!examGuardActive) return undefined
    window.history.pushState({ examGuard: true }, '')
    const onPopState = () => {
      const ok = window.confirm(
        'Leave the exam? Your progress is saved, but you should stay on this page until you submit.',
      )
      if (!ok) {
        window.history.pushState({ examGuard: true }, '')
      }
    }
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [examGuardActive])

  useEffect(() => {
    if (!hit?.exam) return
    const st = normalizeExamStatus(hit.exam.status)
    if (st !== PG_EXAM_STATUS.OPEN) {
      if (scene === 'countdown' || scene === 'question') {
        setScene('lobby')
      }
      return
    }
    if (questions.length > 0 && scene === 'lobby') {
      setScene('countdown')
    }
  }, [hit?.exam?.status, questions.length, scene])

  const [detectionOpen, setDetectionOpen] = useState(false)
  const [detectionReturn, setDetectionReturn] = useState(DETECTION_RETURN_SEC)
  const detectionRunningRef = useRef(false)
  const postCooldownUntilRef = useRef(0)
  const visibilityTimerRef = useRef(null)
  const returnSceneRef = useRef('question')
  const autoSubmittingRef = useRef(false)

  useEffect(() => {
    if (scene !== 'question' || !hit?.exam) return undefined
    const tick = () => {
      const { seconds } = computeExamTimeDisplay({
        status: hit.exam.status,
        scheduledEnd: hit.exam.scheduledEnd,
      })
      const left = seconds ?? 0
      setSecondsLeft(left)
      if (left <= 0 && !autoSubmittingRef.current) {
        autoSubmittingRef.current = true
        submitToServer()
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [scene, hit?.exam, submitToServer])

  const showViolationOverlay = useCallback((returnTo) => {
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
  }, [])

  const recordViolation = useCallback(
    async (eventType, details = null, opts = {}) => {
      if (detectionRunningRef.current) return
      if (!opts.skipCooldown && Date.now() < postCooldownUntilRef.current) return
      if (!isExamScene(sceneRef.current)) return
      if (!classId || !examId) return
      if (!opts.skipCooldown) {
        postCooldownUntilRef.current = Date.now() + 1500
      }

      setLastViolationLabel(labelForCheatEvent(eventType))
      showViolationOverlay(sceneRef.current)

      let count = warningCount
      try {
        const res = await logExamCheating(classId, examId, eventType, details)
        count = Number(res.warningCount ?? count + 1)
        setWarningCount(count)

        if (res.autoSubmitted) {
          setDetectionOpen(false)
          detectionRunningRef.current = false
          setSubmitResult({
            scoreReleased: res.scoreReleased,
            scorePending: res.scorePending,
            rawScore: res.rawScore,
            totalPoints: res.totalPoints,
            percentage: res.percentage,
          })
          setSubmitError(null)
          setScene('submitted')
          return
        }
      } catch (err) {
        console.error('[anti-cheat]', err)
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('not live') || msg.includes('Join the exam')) {
          setLastViolationLabel(msg)
          return
        }
        count = Math.min(MAX_EXAM_WARNINGS, warningCount + 1)
        setWarningCount(count)
        if (count >= MAX_EXAM_WARNINGS) {
          setDetectionOpen(false)
          detectionRunningRef.current = false
          await submitToServer()
          return
        }
      }

      if (count >= MAX_EXAM_WARNINGS) {
        setDetectionOpen(false)
        detectionRunningRef.current = false
        await submitToServer()
      }
    },
    [classId, examId, warningCount, showViolationOverlay, submitToServer],
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
      recordViolation('alt_tab', 'Left exam tab or window')
    }, TAB_LEAVE_DEBOUNCE_MS)
  }, [recordViolation])

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
    function onWindowBlur() {
      if (!isExamScene(sceneRef.current) || detectionRunningRef.current) return
      scheduleTabLeave()
    }
    function onFullscreenChange() {
      if (!isExamScene(sceneRef.current) || detectionRunningRef.current) return
      if (!document.fullscreenElement) {
        recordViolation('window_blur', 'Exited fullscreen')
      }
    }
    function onKey(ev) {
      if (detectionRunningRef.current) return
      if (!isExamScene(sceneRef.current)) return
      if (ev.code === 'F8') {
        ev.preventDefault()
        recordViolation('devtools_open', 'F8 pressed', { skipCooldown: true })
        return
      }
      if (ev.ctrlKey || ev.metaKey) {
        if (ev.key === 'c' || ev.key === 'C') {
          ev.preventDefault()
          recordViolation('copy_attempt', 'Ctrl+C')
        } else if (ev.key === 'v' || ev.key === 'V') {
          ev.preventDefault()
          recordViolation('paste_attempt', 'Ctrl+V')
        } else if (ev.key === 'x' || ev.key === 'X') {
          ev.preventDefault()
          recordViolation('copy_attempt', 'Ctrl+X cut')
        }
      }
    }
    function onCopy(ev) {
      if (!isExamScene(sceneRef.current)) return
      ev.preventDefault()
      recordViolation('copy_attempt', 'Copy')
    }
    function onCut(ev) {
      if (!isExamScene(sceneRef.current)) return
      ev.preventDefault()
      recordViolation('copy_attempt', 'Cut')
    }
    function onPaste(ev) {
      if (!isExamScene(sceneRef.current)) return
      ev.preventDefault()
      recordViolation('paste_attempt', 'Paste')
    }
    window.addEventListener('blur', onWindowBlur)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCut, true)
    document.addEventListener('paste', onPaste, true)
    return () => {
      window.removeEventListener('blur', onWindowBlur)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('cut', onCut, true)
      document.removeEventListener('paste', onPaste, true)
      cancelTabLeave()
    }
  }, [cancelTabLeave, scheduleTabLeave, recordViolation])

  useEffect(() => {
    if (scene !== 'question') return undefined
    const blockContextMenu = (e) => {
      e.preventDefault()
      recordViolation('other', 'Right-click')
    }
    document.addEventListener('contextmenu', blockContextMenu, true)
    return () => document.removeEventListener('contextmenu', blockContextMenu, true)
  }, [scene, recordViolation])

  useEffect(() => {
    if (scene !== 'question') return undefined
    const root = document.documentElement
    if (root.requestFullscreen) {
      root.requestFullscreen().catch(() => {})
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [scene])

  useEffect(() => {
    if (scene !== 'countdown') return undefined
    if (normalizeExamStatus(hit?.exam?.status) !== PG_EXAM_STATUS.OPEN) {
      setScene('lobby')
      return undefined
    }
    setCountdownNum(COUNTDOWN_SEC)
    let n = COUNTDOWN_SEC
    const step = () => {
      setCountdownNum(n)
      if (n <= 1) {
        window.setTimeout(() => setScene('question'), 1000)
        return
      }
      n -= 1
      window.setTimeout(step, 1000)
    }
    const id = window.setTimeout(step, 0)
    return () => window.clearTimeout(id)
  }, [scene])

  if (loading) {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center">
        <p className="text-sm font-medium text-white/70 animate-pulse">Loading exam details…</p>
      </div>
    )
  }

  if (needsPassword && classId && examId) {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-white/15 bg-black/40 text-card-foreground shadow-lg backdrop-blur-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-lg font-semibold tracking-tight text-white">
              Enter exam code
            </CardTitle>
            <CardDescription className="text-white/70">
              Type the code your instructor shared after publishing the exam. After you join once, use
              Continue exam from your class — the code step will not appear again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitExamPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-code" className="text-sm font-medium text-white/90">
                  Exam code
                </Label>
                <Input
                  id="exam-code"
                  type="text"
                  className="text-center font-mono text-base tracking-widest uppercase bg-black/40 border-emerald-600/50 text-white"
                  placeholder="Exam code"
                  value={examPassword}
                  onChange={(e) => setExamPassword(e.target.value.toUpperCase())}
                  autoFocus
                  maxLength={12}
                />
              </div>
              {error ? (
                <p className="text-sm font-medium text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={joining || !examPassword.trim()} className="w-full">
                {joining ? 'Joining…' : 'Join exam lobby'}
              </Button>
              <Link
                to={`/student/my-classes/${classId}`}
                className="exam-session-exit block text-center text-sm font-medium"
              >
                ← Back to class
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !classId || !examId || !hit) {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-white/15 bg-black/40 text-center shadow-lg backdrop-blur-sm">
          <CardHeader className="items-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-400" aria-hidden />
            <CardTitle className="text-lg font-semibold tracking-tight text-white">
              Cannot open exam
            </CardTitle>
            <CardDescription className="text-white/70">
              {error ||
                'Open an exam from a class you are enrolled in, or check the class code and exam link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10" asChild>
              <Link to="/student/my-classes">← Enrolled classes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQ = questions[currentQuestionIndex]

  const showSectionIntro =
    currentQ &&
    (currentQuestionIndex === 0 ||
      questions[currentQuestionIndex - 1]?.sectionId !== currentQ.sectionId) &&
    (currentQ.sectionTitle || currentQ.sectionDescription)

  // Lobby Scene
  if (scene === 'lobby') {
    const examSt = normalizeExamStatus(hit.exam.status)
    const inLobby = examSt === PG_EXAM_STATUS.WAITING
    return (
      <div className="acsis-student-exam min-h-screen flex flex-col">
        <ExamSessionHeader title={examTitle} />
        <main className="lobby-main">
          <h2 className="lobby-warning-title">Warning:</h2>
          <div className="lobby-copy text-sm leading-relaxed text-white/90">
            <p>This examination system monitors your activity to ensure academic fairness.</p>
            <p>
              Actions like <strong>tab switching</strong>, <strong>leaving the exam page</strong>,{' '}
              <strong>screenshots</strong>, or <strong>right-clicking</strong> are detected. Avoid pressing the
              Windows key.
            </p>
            <p>
              You are allowed up to <strong>3 strikes</strong> only. If this limit is exceeded, your exam will be
              automatically submitted.
            </p>
            <p>Please remain on this page and complete the exam honestly.</p>
          </div>
          <div className="lobby-footer">
            <div className="lobby-spinner" aria-hidden />
            <p className="lobby-waiting text-sm font-medium text-white/80">
              {inLobby
                ? `Waiting for ${instructorWait} to start the exam…`
                : 'Exam in progress — starting shortly…'}
            </p>
          </div>
          <p className="exam-type-hint mt-6 text-xs text-white/60">
            {inLobby
              ? 'You are in the lobby. The timer starts when your instructor goes live.'
              : 'Your session is ongoing. Do not re-enter the exam code from the class page.'}
          </p>
          <Link to={`/student/my-classes/${classId}`} className="exam-session-exit">
            ← Back to class
          </Link>
        </main>
      </div>
    )
  }

  // Countdown Scene
  if (scene === 'countdown') {
    return (
      <div className="acsis-student-exam min-h-screen flex flex-col">
        <main className="countdown-main">
          <p className="countdown-label text-sm font-medium uppercase tracking-wide text-white/70">
            Starting in
          </p>
          <p className="countdown-number">{countdownNum}</p>
        </main>
      </div>
    )
  }

  // Submitted Scene
  if (scene === 'submitted') {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-white/15 bg-black/40 text-center shadow-lg backdrop-blur-sm">
          <CardHeader className="items-center space-y-4 pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" aria-hidden />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-white">
              Exam submitted
            </CardTitle>
            <CardDescription className="text-white/70">
              Thank you for completing the exam. Your responses have been recorded and submitted to
              your instructor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitError ? (
              <p className="text-sm font-medium text-red-400" role="alert">
                {submitError} — contact your instructor if this persists.
              </p>
            ) : null}
            {submitResult?.scoreReleased && submitResult?.percentage != null ? (
              <p className="text-base font-semibold text-white">
                Score: {submitResult.percentage}% ({submitResult.rawScore}/{submitResult.totalPoints}{' '}
                points)
              </p>
            ) : submitResult?.scoreReleased && submitResult?.rawScore != null ? (
              <p className="text-base font-semibold text-white">
                Score: {submitResult.rawScore}/{submitResult.totalPoints} points
              </p>
            ) : submitResult?.scorePending || (submitResult && !submitResult.scoreReleased) ? (
              <p className="text-sm font-medium text-white/80">
                Your score will appear after your instructor releases results.
              </p>
            ) : null}
            {warningCount >= MAX_EXAM_WARNINGS ? (
              <p className="text-sm font-medium text-amber-300">
                Your exam was auto-submitted after {MAX_EXAM_WARNINGS} integrity warnings.
              </p>
            ) : null}
            <Button className="w-full" asChild>
              <Link to={`/student/my-classes/${classId}`}>Return to class</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Question Layout
  const detectionOverlay =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`detection-overlay${detectionOpen ? ' is-active' : ''}`}
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
          >
            <AlertTriangle className="detection-overlay__icon" aria-hidden />
            <h2 className="detection-title">Warning — Suspicious Activity!</h2>
            <p className="detection-sub">
              {lastViolationLabel || 'A proctoring rule was violated.'} This incident was logged for your
              instructor and administrator.
            </p>
            <p className="detection-strikes">
              Strike {warningCount} of {MAX_EXAM_WARNINGS}
              {warningCount >= MAX_EXAM_WARNINGS - 1 ? ' — one more ends your exam' : ''}
            </p>
            <p className="detection-countdown">
              Returning to exam in {detectionReturn} seconds…
            </p>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="acsis-student-exam min-h-screen flex flex-col">
      <ExamSessionHeader
        title={examTitle}
        titleClassName="hidden sm:block max-w-md"
        className="sticky top-0 z-10 shrink-0"
      >
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
              warningCount >= 2
                ? 'bg-red-900/40 text-red-200'
                : warningCount >= 1
                  ? 'bg-orange-900/40 text-orange-200'
                  : 'bg-white/10 text-white/80'
            }`}
            title="Integrity warnings — 3 strikes auto-submits your exam"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            {warningCount} / {MAX_EXAM_WARNINGS} warnings
          </div>
          <div className="exam-timer flex items-center gap-2 lg:hidden">
            <Clock className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
            {secondsLeft > 0 ? formatClock(secondsLeft) : '--:--'}
          </div>
        </div>
      </ExamSessionHeader>

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-stretch">
        <main className="exam-stage flex-1 flex flex-col min-w-0">
          {currentQ ? (
            <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
              {showSectionIntro && currentQ.sectionDescription ? (
                <div className="question-box question-box--section mb-6">
                  <p className="question-box--section__desc whitespace-pre-wrap">
                    {currentQ.sectionDescription}
                  </p>
                </div>
              ) : null}

              <div className="mb-8">
                <div className="exam-question-meta-row">
                  <span className="exam-set-name">
                    {currentQ.sectionTitle || 'General'}
                  </span>
                  <span className="exam-type-badge">{questionTypeLabel(currentQ.type)}</span>
                </div>
                <div className="question-box question-box--prompt whitespace-pre-wrap">
                  {currentQ.question}
                </div>
                {currentQ.imageUrl && (
                  <div className="mt-6">
                    <img
                      src={currentQ.imageUrl}
                      alt="Question illustration"
                      className="exam-question-image max-h-80 max-w-full rounded-xl object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Question Inputs */}
              <div className="flex-1">
                {currentQ.type === 'multiple-choice' && (
                  <div className="options-list">
                    {(currentQ.options || []).map((opt, i) => {
                      const isSelected = answers[currentQ.id] === opt
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))}
                          className={`option-row${isSelected ? ' is-selected' : ''}`}
                        >
                          <span className="option-radio" aria-hidden />
                          <span>{opt}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQ.type === 'truefalse' && (
                  <div className="tf-grid">
                    {['True', 'False'].map((v) => {
                      const isSelected = answers[currentQ.id] === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: v }))}
                          className={`option-row${isSelected ? ' is-selected' : ''}`}
                        >
                          <span className="option-radio" aria-hidden />
                          <span>{v}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQ.type === 'identification' && (
                  <div className="max-w-xl">
                    <p className="exam-type-hint" style={{ textAlign: 'left' }}>
                      Type your answer below
                    </p>
                    <input
                      id="id-answer"
                      type="text"
                      className="id-input"
                      value={answers[currentQ.id] || ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value.toUpperCase() }))
                      }
                      placeholder="Your answer..."
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                )}

                {currentQ.type === 'coding' && (
                  <div className="code-editor-wrap max-w-3xl w-full">
                    <p className="exam-type-hint" style={{ textAlign: 'left', marginBottom: 8 }}>
                      Language: {normalizeCodingLanguage(currentQ.language || currentQ.options?.[0])}
                    </p>
                    <Editor
                      height="min(42vh, 360px)"
                      language={normalizeCodingLanguage(currentQ.language || currentQ.options?.[0])}
                      theme={monacoThemeForApp(theme)}
                      value={answers[currentQ.id] || ''}
                      onChange={(val) =>
                        setAnswers((prev) => ({ ...prev, [currentQ.id]: val ?? '' }))
                      }
                      options={MONACO_EXAM_EDITOR_OPTIONS}
                    />
                  </div>
                )}
              </div>

              <div className="exam-footer-bar" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="btn-next"
                  style={
                    currentQuestionIndex === 0
                      ? { opacity: 0.45, cursor: 'not-allowed' }
                      : undefined
                  }
                >
                  ← Previous
                </button>
                <div className="exam-footer-right">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                      className="btn-next"
                    >
                      Next →
                    </button>
                  ) : (
                    <button type="button" onClick={() => submitToServer()} className="btn-next">
                      Submit exam
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center lobby-waiting">No questions found.</div>
          )}
        </main>

        <aside
          className="w-full lg:w-80 lg:border-l border-white/10 shrink-0 p-6 lg:p-8 flex flex-col lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]"
          style={{ background: 'rgba(0, 0, 0, 0.28)' }}
        >
          <div className="hidden lg:block mb-8">
            <h3 className="exam-type-label" style={{ textAlign: 'left', marginBottom: 12 }}>
              Time remaining
            </h3>
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/15 bg-black/25">
              <Clock className="w-6 h-6 opacity-70" aria-hidden />
              <span className="exam-timer">{formatClock(secondsLeft)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-5 h-5 opacity-70" aria-hidden />
              <h3 className="exam-type-label" style={{ textAlign: 'left', marginBottom: 0 }}>
                Question navigator
              </h3>
            </div>
            <div className="flex items-center gap-4 mb-6 text-xs text-white/65">
              <div className="flex items-center gap-1.5">
                <Circle className="w-3 h-3 opacity-40" /> Unanswered
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" /> Answered
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isActive = idx === currentQuestionIndex
                const isAnswered = !!answers[q.id] && answers[q.id].trim() !== ''
                let btnClass =
                  'relative flex items-center justify-center w-full aspect-square rounded-lg text-sm font-medium transition-all border-2 '
                if (isActive) {
                  btnClass += 'border-emerald-400 bg-emerald-900/50 text-white'
                } else if (isAnswered) {
                  btnClass += 'border-transparent bg-emerald-800/60 text-emerald-100 hover:bg-emerald-800/80'
                } else {
                  btnClass += 'border-white/20 bg-black/20 text-white/70 hover:border-white/35'
                }
                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={btnClass}
                    aria-label={`Go to question ${idx + 1}`}
                  >
                    {idx + 1}
                    {isAnswered && !isActive ? (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#051a0d] rounded-full" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="progress-row mb-4">
              <span className="progress-label">Completion</span>
              <span className="progress-label">
                {Object.keys(answers).filter((k) => answers[k] && answers[k].trim() !== '').length} /{' '}
                {questions.length}
              </span>
            </div>
            <button type="button" onClick={() => submitToServer()} className="btn-next w-full justify-center">
              Finish &amp; submit
            </button>
          </div>
        </aside>

      </div>

      {detectionOverlay}
    </div>
  )
}
