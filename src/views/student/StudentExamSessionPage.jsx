import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Clock, LayoutGrid, CheckCircle2, Circle, AlertTriangle } from 'lucide-react'
import PlpLogo from '@/components/brand/PlpLogo.jsx'
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
// Removed legacy CSS import

const COUNTDOWN_SEC = 3
const DETECTION_RETURN_SEC = 5
const OVERLAY_FADE_MS = 340
const TAB_LEAVE_DEBOUNCE_MS = 450
const POST_DETECTION_COOLDOWN_MS = 1400

function isExamScene(name) {
  return name === 'question'
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
  const durationMin = Number(hit?.exam?.duration || 35)
  const instructorWait = useMemo(() => {
    if (activeAccount?.id === 'faculty') return activeAccount.displayName
    return 'your instructor'
  }, [activeAccount])

  const questions = hit?.exam?.questions || []

  const [countdownNum, setCountdownNum] = useState(COUNTDOWN_SEC)
  const [secondsLeft, setSecondsLeft] = useState(durationMin * 60)
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
        duration: hit.exam.duration ?? durationMin,
        openedAt: hit.exam.openedAt,
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
  }, [scene, hit?.exam, durationMin, submitToServer])

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

      let count = warningCount
      try {
        const res = await logExamCheating(classId, examId, eventType, details)
        count = Number(res.warningCount ?? count + 1)
        setWarningCount(count)

        if (res.autoSubmitted) {
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
          showViolationOverlay(sceneRef.current)
          return
        }
        count = Math.min(MAX_EXAM_WARNINGS, warningCount + 1)
        setWarningCount(count)
        if (count >= MAX_EXAM_WARNINGS) {
          await submitToServer()
          return
        }
      }

      if (count >= MAX_EXAM_WARNINGS) {
        await submitToServer()
        return
      }

      showViolationOverlay(sceneRef.current)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading exam details...</p>
      </div>
    )
  }

  if (needsPassword && classId && examId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <form
          onSubmit={submitExamPassword}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full"
        >
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enter exam code</h1>
          <p className="text-sm text-gray-600 mb-4">
            Type the code your instructor shared after publishing the exam.
          </p>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest uppercase mb-2"
            placeholder="Exam code"
            value={examPassword}
            onChange={(e) => setExamPassword(e.target.value.toUpperCase())}
            autoFocus
            maxLength={12}
          />
          {error ? (
            <p className="text-sm text-red-600 mb-3" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={joining || !examPassword.trim()}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {joining ? 'Joining…' : 'Join exam lobby'}
          </button>
          <Link
            to={`/student/my-classes/${classId}`}
            className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-800"
          >
            ← Back to class
          </Link>
        </form>
      </div>
    )
  }

  if (error || !classId || !examId || !hit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 font-medium mb-6">
            {error || 'Open an exam from a class you are enrolled in, or check the class code and exam link.'}
          </p>
          <Link to="/student/my-classes" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
            ← Enrolled classes
          </Link>
        </div>
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
    return (
      <div 
        className="min-h-screen flex flex-col font-sans relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #030f08 0%, #051a0d 38%, #020806 100%)' }}
      >
        {/* Background glow effects from original CSS */}
        <div 
          className="absolute inset-0 pointer-events-none z-0" 
          style={{ 
            background: `radial-gradient(ellipse 120% 85% at 50% 100%, rgba(22, 101, 52, 0.45) 0%, transparent 55%), 
                         radial-gradient(ellipse 80% 50% at 50% 0%, rgba(15, 60, 35, 0.3) 0%, transparent 45%)`
          }} 
        />
        <div className="relative z-10 flex flex-col min-h-screen">
          <header className="h-16 border-b border-white/10 flex items-center px-6">
            <PlpLogo className="w-8 h-8 mr-3 opacity-90" />
            <h1 className="font-semibold text-gray-200 truncate">{examTitle}</h1>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 uppercase tracking-wider" style={{ color: '#f87171' }}>
              WARNING:
            </h1>
            <div className="max-w-2xl text-left text-gray-200 space-y-5 text-lg leading-relaxed">
              <p>This examination system monitors your activity to ensure academic fairness.</p>
              <p>
                Actions like <strong className="text-white">tab switching</strong>, <strong className="text-white">leaving the exam page</strong>,{' '}
                <strong className="text-white">screenshots</strong>, or <strong className="text-white">right-clicking</strong> are detected. Avoid pressing the Windows Key.
              </p>
              <p>
                You are allowed up to <strong className="text-white">3 strikes</strong> only. If this limit is exceeded, your exam will be
                automatically submitted.
              </p>
              <p>Please remain on this page and complete the exam honestly.</p>
            </div>
            
            <div className="mt-16 flex flex-col items-center gap-4">
              <div className="w-6 h-6 border-2 border-white/25 border-t-white rounded-full animate-spin" />
              <p className="text-white/90 font-medium tracking-wide">
                {normalizeExamStatus(hit.exam.status) === PG_EXAM_STATUS.WAITING
                  ? `Waiting for ${instructorWait} to start the exam…`
                  : 'Preparing your exam…'}
              </p>
              <p className="text-white/60 text-sm max-w-md">
                You are in the lobby. The timer starts when your instructor goes live.
              </p>
            </div>
            
            <Link to={`/student/my-classes/${classId}`} className="mt-12 text-sm text-green-300 hover:text-green-100 transition-colors tracking-widest font-semibold">
              ← Back to class
            </Link>
          </main>
        </div>
      </div>
    )
  }

  // Countdown Scene
  if (scene === 'countdown') {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-2xl font-medium mb-4 opacity-80">Starting in</p>
          <p className="text-9xl font-bold animate-pulse">{countdownNum}</p>
        </div>
      </div>
    )
  }

  // Submitted Scene
  if (scene === 'submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Exam Submitted Successfully!</h1>
          {submitError ? (
            <p className="text-red-600 text-sm mb-4" role="alert">
              {submitError} — contact your instructor if this persists.
            </p>
          ) : null}
          {submitResult?.scoreReleased && submitResult?.percentage != null ? (
            <p className="text-gray-800 text-lg font-semibold mb-2">
              Score: {submitResult.percentage}% ({submitResult.rawScore}/{submitResult.totalPoints} points)
            </p>
          ) : submitResult?.scoreReleased && submitResult?.rawScore != null ? (
            <p className="text-gray-800 text-lg font-semibold mb-2">
              Score: {submitResult.rawScore}/{submitResult.totalPoints} points
            </p>
          ) : submitResult?.scorePending || (submitResult && !submitResult.scoreReleased) ? (
            <p className="text-gray-700 text-base font-medium mb-2">
              Your score will appear here after your instructor releases results.
            </p>
          ) : null}
          {warningCount >= MAX_EXAM_WARNINGS ? (
            <p className="text-amber-700 text-sm font-medium mb-4">
              Your exam was auto-submitted after {MAX_EXAM_WARNINGS} integrity warnings.
            </p>
          ) : null}
          <p className="text-gray-600 text-lg mb-8">
            Thank you for completing the exam. Your responses have been recorded and securely submitted to your instructor.
          </p>
          <Link to={`/student/my-classes/${classId}`} className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Return to Class Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Main Question Layout
  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      onContextMenu={(e) => {
        e.preventDefault()
        recordViolation('other', 'Right-click')
      }}
    >
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <PlpLogo className="w-8 h-8" />
          <h1 className="font-semibold text-gray-800 hidden sm:block truncate max-w-md">{examTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
              warningCount >= 2 ? 'bg-red-100 text-red-800' : warningCount >= 1 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
            }`}
            title="Integrity warnings — 3 strikes auto-submits your exam"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            {warningCount} / {MAX_EXAM_WARNINGS} warnings
          </div>
          <div className="flex lg:hidden items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full font-mono text-gray-700 font-semibold">
            <Clock className="w-4 h-4" />
            {formatClock(secondsLeft)}
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-stretch">
        
        {/* Left Pane: Question Area */}
        <main className="flex-1 flex flex-col p-6 lg:p-10 lg:pr-6 min-w-0">
          {currentQ ? (
            <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
              {showSectionIntro ? (
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/80 px-5 py-4">
                  {currentQ.sectionTitle ? (
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-800">
                      {currentQ.sectionTitle}
                    </p>
                  ) : null}
                  {currentQ.sectionDescription ? (
                    <p className="mt-2 text-base text-blue-950 leading-relaxed whitespace-pre-wrap">
                      {currentQ.sectionDescription}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Question Header */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                  {currentQ.type === 'multiple-choice' ? 'Multiple Choice' : 
                   currentQ.type === 'truefalse' ? 'True / False' : 'Identification'}
                </div>
                <h2 className="text-2xl lg:text-3xl font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {currentQ.question}
                </h2>
                {currentQ.imageUrl && (
                  <div className="mt-6">
                    <img
                      src={currentQ.imageUrl}
                      alt="Question image"
                      className="max-h-80 max-w-full rounded-xl border border-gray-200 object-contain bg-white shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Question Inputs */}
              <div className="flex-1">
                {currentQ.type === 'multiple-choice' && (
                  <div className="space-y-3">
                    {(currentQ.options || []).map((opt, i) => {
                      const isSelected = answers[currentQ.id] === opt;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: opt }))}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50 shadow-sm' 
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                          </div>
                          <span className={`text-base leading-relaxed ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                            {opt}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQ.type === 'truefalse' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['True', 'False'].map((v) => {
                      const isSelected = answers[currentQ.id] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: v }))}
                          className={`p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50 shadow-sm' 
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                          </div>
                          <span className={`text-lg ${isSelected ? 'text-blue-900 font-bold' : 'text-gray-700 font-medium'}`}>
                            {v}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentQ.type === 'identification' && (
                  <div className="max-w-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="id-answer">
                      Type your answer below
                    </label>
                    <input
                      id="id-answer"
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-lg"
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
              </div>

              {/* Navigation Footer */}
              <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                    disabled={currentQuestionIndex === 0}
                    className={`px-5 py-2.5 rounded-lg border font-medium transition-colors ${
                      currentQuestionIndex === 0 
                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' 
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    ← Previous
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <button 
                      type="button" 
                      onClick={() => setCurrentQuestionIndex(i => i + 1)}
                      className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                    >
                      Next →
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => submitToServer()}
                      className="px-6 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm"
                    >
                      Submit Exam
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No questions found.
            </div>
          )}
        </main>

        {/* Right Pane: Question Navigator Sidebar */}
        <aside className="w-full lg:w-80 lg:border-l border-gray-200 bg-white shrink-0 p-6 lg:p-8 flex flex-col lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
          {/* Desktop Timer Area */}
          <div className="hidden lg:block mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Time Remaining</h3>
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 rounded-xl border border-gray-200">
              <Clock className="w-6 h-6 text-gray-400" />
              <span className="font-mono text-3xl text-gray-800 tracking-tight font-semibold">
                {formatClock(secondsLeft)}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-5 h-5 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Question Navigator</h3>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mb-6 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><Circle className="w-3 h-3 text-gray-300" /> Unanswered</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-full" /> Answered</div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isActive = idx === currentQuestionIndex;
                const isAnswered = !!answers[q.id] && answers[q.id].trim() !== '';
                
                let btnClass = "relative flex items-center justify-center w-full aspect-square rounded-lg text-sm font-medium transition-all duration-200 border-2 ";
                
                if (isActive) {
                  // Active question takes priority in styling (Blue)
                  btnClass += "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20";
                } else if (isAnswered) {
                  // Answered (Green)
                  btnClass += "border-transparent bg-green-100 text-green-800 hover:bg-green-200";
                } else {
                  // Unanswered (White/Gray outline)
                  btnClass += "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50";
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
                    {isAnswered && !isActive && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit Action Block at bottom of Navigator */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">Completion</span>
              <span className="font-semibold text-gray-900">
                {Object.keys(answers).filter(k => answers[k] && answers[k].trim() !== '').length} / {questions.length}
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => submitToServer()}
              className="w-full px-6 py-3.5 rounded-xl font-semibold bg-gray-900 text-white hover:bg-gray-800 active:bg-black transition-colors shadow-sm"
            >
              Finish & Submit
            </button>
          </div>
        </aside>

      </div>

      {/* Cheat Detection Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-red-600/95 backdrop-blur-sm flex flex-col items-center justify-center text-white transition-opacity duration-300 ${
          detectionOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        role="alertdialog"
        aria-modal="true"
      >
        <AlertTriangle className="w-20 h-20 mb-6 text-white" />
        <h2 className="text-4xl font-bold mb-4">Warning — Suspicious Activity!</h2>
        <p className="text-xl opacity-90 mb-4 max-w-lg text-center">
          {lastViolationLabel || 'A proctoring rule was violated.'} This incident was logged for your instructor and
          administrator.
        </p>
        <div className="px-6 py-3 bg-red-900/50 rounded-full font-bold text-lg mb-8">
          Strike {warningCount} of {MAX_EXAM_WARNINGS}
          {warningCount >= MAX_EXAM_WARNINGS - 1 ? ' — one more ends your exam' : ''}
        </div>
        <p className="text-lg font-medium opacity-80 animate-pulse">
          Returning to exam in {detectionReturn} seconds...
        </p>
      </div>
    </div>
  )
}
