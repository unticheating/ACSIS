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
  lockStudentExam,
  logExamCheating,
  saveExamAnswer,
  submitExamAnswers,
} from '@/lib/studentExamApi.js'
import { PG_EXAM_STATUS, normalizeExamStatus } from '@/lib/examFlowUi.js'
import {
  displayStrikeCount,
  labelForCheatEvent,
  resolveMaxWarnings,
  warningCountBadgeClass,
} from '@/lib/examAntiCheat.js'
import { getFocusViolationFromKey, isFullscreenRestoreKey } from '@/lib/examScreenshotGuard.js'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
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
const AUTOSAVE_DEBOUNCE_MS = 800

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
  const { institution } = useInstitutionTheme()
  const institutionMaxWarnings = institution?.maxWarnings

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
      const loadedMax = resolveMaxWarnings(data.maxWarnings, institutionMaxWarnings)
      setMaxWarnings(loadedMax)
      setWarningCount(displayStrikeCount(data.warningCount, loadedMax))
      setExamLocked(Boolean(data.sessionLocked))
      setLockReason(data.lockReason || null)
      if (data.savedAnswers && typeof data.savedAnswers === 'object') {
        setAnswers((prev) => ({ ...prev, ...data.savedAnswers }))
      }
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
  }, [classId, examId, institutionMaxWarnings])

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
  const [maxWarnings, setMaxWarnings] = useState(() =>
    resolveMaxWarnings(undefined, institutionMaxWarnings),
  )
  const [examLocked, setExamLocked] = useState(false)
  const [lockReason, setLockReason] = useState(null)
  const [lastViolationLabel, setLastViolationLabel] = useState('')
  const lockingRef = useRef(false)
  const autosaveSkipRef = useRef(true)
  const fullscreenKeyHandledUntilRef = useRef(0)
  const examLockedRef = useRef(false)
  const warningCountRef = useRef(0)
  const maxWarningsRef = useRef(resolveMaxWarnings(undefined, institutionMaxWarnings))

  useEffect(() => {
    examLockedRef.current = examLocked
  }, [examLocked])
  useEffect(() => {
    warningCountRef.current = warningCount
  }, [warningCount])
  useEffect(() => {
    maxWarningsRef.current = maxWarnings
  }, [maxWarnings])

  const requestExamFullscreen = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
  }, [])

  const markFullscreenKeyHandled = useCallback(() => {
    fullscreenKeyHandledUntilRef.current = Date.now() + 900
  }, [])

  const wasFullscreenKeyRecent = useCallback(() => {
    return Date.now() < fullscreenKeyHandledUntilRef.current
  }, [])

  const applyExamLock = useCallback(
    async (reason = 'time_up') => {
      if (!classId || !examId || lockingRef.current) return
      lockingRef.current = true
      try {
        const res = await lockStudentExam(classId, examId, reason)
        setExamLocked(true)
        setLockReason(res.lockReason || reason)
        setMaxWarnings(resolveMaxWarnings(res.maxWarnings, institutionMaxWarnings))
        if (res.warningCount != null) {
          setWarningCount(
            displayStrikeCount(res.warningCount, resolveMaxWarnings(res.maxWarnings, institutionMaxWarnings)),
          )
        }
      } catch (err) {
        console.error('[exam lock]', err)
        setExamLocked(true)
        setLockReason(reason)
      }
    },
    [classId, examId, institutionMaxWarnings],
  )

  const submitToServer = useCallback(async () => {
    if (!classId || !examId) {
      setScene('submitted')
      return
    }
    const payload = examLocked
      ? []
      : questions.map((q) => ({
          questionId: q.id,
          answerText: answers[q.id] != null ? String(answers[q.id]) : '',
        }))
    setSubmitError(null)
    try {
      const result = await submitExamAnswers(classId, examId, payload)
      setSubmitResult(result)
      setScene('submitted')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit exam.'
      setSubmitError(msg)
      acsisToastError(msg)
      console.error(err)
    }
  }, [answers, classId, examId, examLocked, questions])

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
  const [overlayStrikeDisplay, setOverlayStrikeDisplay] = useState(null)
  const detectionRunningRef = useRef(false)
  const pendingMaxWarningsLockRef = useRef(false)
  const postCooldownUntilRef = useRef(0)
  const visibilityTimerRef = useRef(null)
  const returnSceneRef = useRef('question')
  useEffect(() => {
    if (scene !== 'question' || !hit?.exam) return undefined
    const tick = () => {
      const { seconds } = computeExamTimeDisplay({
        status: hit.exam.status,
        scheduledEnd: hit.exam.scheduledEnd,
      })
      const left = seconds ?? 0
      setSecondsLeft(left)
      if (left <= 0 && !examLocked && !lockingRef.current) {
        void applyExamLock('time_up')
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [scene, hit?.exam, examLocked, applyExamLock])

  useEffect(() => {
    if (scene !== 'question' || examLocked || !classId || !examId || questions.length === 0) {
      return undefined
    }
    if (autosaveSkipRef.current) {
      autosaveSkipRef.current = false
      return undefined
    }
    const timer = window.setTimeout(() => {
      for (const q of questions) {
        const val = answers[q.id]
        if (val == null || String(val).trim() === '') continue
        void saveExamAnswer(classId, examId, {
          questionId: q.id,
          answerText: String(val),
        }).catch((err) => console.error('[autosave]', err))
      }
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [answers, scene, examLocked, classId, examId, questions])

  const showViolationOverlay = useCallback(
    (returnTo, { restoreFullscreenAfter = false } = {}) => {
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
            setOverlayStrikeDisplay(null)
            postCooldownUntilRef.current = Date.now() + POST_DETECTION_COOLDOWN_MS
            if (pendingMaxWarningsLockRef.current) {
              pendingMaxWarningsLockRef.current = false
              void applyExamLock('max_warnings')
            } else if (restoreFullscreenAfter && isExamScene(returnSceneRef.current)) {
              requestExamFullscreen()
            }
          }, OVERLAY_FADE_MS)
          return
        }
        left -= 1
        window.setTimeout(tick, 1000)
      }
      tick()
    },
    [requestExamFullscreen, applyExamLock],
  )

  const recordViolation = useCallback(
    async (eventType, details = null, opts = {}) => {
      if (detectionRunningRef.current) return
      if (!opts.skipCooldown && Date.now() < postCooldownUntilRef.current) return
      if (!isExamScene(sceneRef.current)) return
      if (!classId || !examId) return

      const strikeMax = resolveMaxWarnings(maxWarningsRef.current, institutionMaxWarnings)
      const strikesNow = Number(warningCountRef.current) || 0
      if (examLockedRef.current || strikesNow >= strikeMax) return

      detectionRunningRef.current = true
      if (!opts.skipCooldown) {
        postCooldownUntilRef.current = Date.now() + 1500
      }

      const nextStrike = Math.min(strikesNow + 1, strikeMax)
      const isFinalStrike = nextStrike >= strikeMax

      setLastViolationLabel(
        details ? `${labelForCheatEvent(eventType)} (${details})` : labelForCheatEvent(eventType),
      )
      setOverlayStrikeDisplay(nextStrike)
      showViolationOverlay(sceneRef.current, {
        restoreFullscreenAfter: Boolean(opts.restoreFullscreenAfter) && !isFinalStrike,
      })

      let count = strikesNow
      try {
        let res
        try {
          res = await logExamCheating(classId, examId, eventType, details)
        } catch (firstErr) {
          if (eventType !== 'other') {
            res = await logExamCheating(
              classId,
              examId,
              'other',
              `${eventType}${details ? `: ${details}` : ''}`,
            )
          } else {
            throw firstErr
          }
        }
        const resolvedMax = resolveMaxWarnings(res.maxWarnings, institutionMaxWarnings)
        count = displayStrikeCount(res.warningCount ?? count + 1, resolvedMax)
        setWarningCount(count)
        warningCountRef.current = count
        setOverlayStrikeDisplay(count)
        setMaxWarnings(resolvedMax)
        maxWarningsRef.current = resolvedMax

        if (res.sessionLocked) {
          setExamLocked(true)
          examLockedRef.current = true
          setLockReason('max_warnings')
          pendingMaxWarningsLockRef.current = true
          return
        }
      } catch (err) {
        console.error('[anti-cheat]', err)
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('not live') || msg.includes('Join the exam')) {
          setLastViolationLabel(msg)
          return
        }
      }

      if (count >= strikeMax) {
        setExamLocked(true)
        examLockedRef.current = true
        setLockReason('max_warnings')
        pendingMaxWarningsLockRef.current = true
      }
    },
    [
      classId,
      examId,
      warningCount,
      maxWarnings,
      institutionMaxWarnings,
      showViolationOverlay,
      applyExamLock,
    ],
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
    let lastFullscreenExitLogAt = 0
    function onFullscreenChange() {
      if (!isExamScene(sceneRef.current) || detectionRunningRef.current) return
      if (!document.fullscreenElement) {
        if (wasFullscreenKeyRecent()) return
        const strikeMax = resolveMaxWarnings(maxWarningsRef.current, institutionMaxWarnings)
        if (examLockedRef.current || (Number(warningCountRef.current) || 0) >= strikeMax) return
        const now = Date.now()
        if (now - lastFullscreenExitLogAt < 2000) return
        lastFullscreenExitLogAt = now
        recordViolation('window_blur', 'Exited fullscreen', { restoreFullscreenAfter: true })
      }
    }
    let lastFocusKeyLogAt = 0
    let lastFullscreenKeyStrikeAt = 0
    function blockFocusKeys(ev) {
      if (detectionRunningRef.current) return false
      if (!isExamScene(sceneRef.current)) return false
      const violation = getFocusViolationFromKey(ev)
      if (!violation) return false
      ev.preventDefault()
      ev.stopPropagation()
      const now = Date.now()
      if (now - lastFocusKeyLogAt < 600) return true
      lastFocusKeyLogAt = now
      recordViolation(violation.eventType, violation.details, { skipCooldown: true })
      return true
    }
    function blockFullscreenExitKey(ev) {
      if (!isExamScene(sceneRef.current)) return false
      if (!isFullscreenRestoreKey(ev)) return false
      ev.preventDefault()
      ev.stopPropagation()
      if (ev.type === 'keyup') return true
      if (ev.repeat) return true
      const strikeMax = resolveMaxWarnings(maxWarningsRef.current, institutionMaxWarnings)
      if (examLockedRef.current || (Number(warningCountRef.current) || 0) >= strikeMax) return true
      if (detectionRunningRef.current) return true
      const now = Date.now()
      if (now - lastFullscreenKeyStrikeAt < 800) return true
      lastFullscreenKeyStrikeAt = now
      markFullscreenKeyHandled()
      const label = ev.code === 'F11' ? 'Pressed F11' : 'Pressed Escape'
      recordViolation('window_blur', label, { restoreFullscreenAfter: true, skipCooldown: true })
      return true
    }
    function onFocusKeyUp(ev) {
      if (blockFullscreenExitKey(ev)) return
      blockFocusKeys(ev)
    }
    function onKey(ev) {
      if (!isExamScene(sceneRef.current)) return
      if (blockFullscreenExitKey(ev)) return
      if (detectionRunningRef.current) return
      if (blockFocusKeys(ev)) return
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
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('keyup', onFocusKeyUp, true)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCut, true)
    document.addEventListener('paste', onPaste, true)
    return () => {
      window.removeEventListener('blur', onWindowBlur)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('keyup', onFocusKeyUp, true)
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('cut', onCut, true)
      document.removeEventListener('paste', onPaste, true)
      cancelTabLeave()
    }
  }, [
    cancelTabLeave,
    scheduleTabLeave,
    recordViolation,
    markFullscreenKeyHandled,
    wasFullscreenKeyRecent,
    requestExamFullscreen,
  ])

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
    requestExamFullscreen()
    const guard = window.setInterval(() => {
      if (
        sceneRef.current === 'question' &&
        !document.fullscreenElement &&
        !detectionRunningRef.current
      ) {
        requestExamFullscreen()
      }
    }, 500)
    return () => {
      window.clearInterval(guard)
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [scene, requestExamFullscreen])

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
              <strong>screenshots</strong>, <strong>right-clicking</strong>, pressing the{' '}
              <strong>Windows key</strong>, or leaving fullscreen (<strong>F11</strong> / <strong>Esc</strong>) are
              counted as strikes. After an F11/Esc warning, you will return to fullscreen automatically.
            </p>
            <p>
              You are allowed up to <strong>{maxWarnings} strikes</strong> only. If this limit is exceeded, your
              exam will be automatically submitted.
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
            {lockReason === 'max_warnings' ? (
              <p className="text-sm font-medium text-amber-300">
                Your exam was locked after reaching the maximum integrity warnings, then submitted
                when you sent it.
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
  const overlayStrikes =
    overlayStrikeDisplay ?? displayStrikeCount(warningCount, maxWarnings)
  const overlayIsFinalStrike = overlayStrikes >= maxWarnings

  const detectionOverlay =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`detection-overlay${detectionOpen ? ' is-active' : ''}${
              overlayIsFinalStrike ? ' detection-overlay--final' : ''
            }`}
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
          >
            <AlertTriangle className="detection-overlay__icon" aria-hidden />
            <h2 className="detection-title">
              {overlayIsFinalStrike
                ? 'Final Warning — Maximum Strikes Reached'
                : 'Warning — Suspicious Activity!'}
            </h2>
            <p className="detection-sub">
              {overlayIsFinalStrike ? (
                <>
                  You have reached <strong>{maxWarnings} of {maxWarnings}</strong> integrity warnings.
                  Your exam is now <strong>locked</strong> — you may review answers but cannot change them.
                  Click <strong>Send exam</strong> when you are ready to submit.
                </>
              ) : (
                <>
                  {lastViolationLabel || 'A proctoring rule was violated.'} This incident was logged for
                  your instructor and administrator.
                </>
              )}
            </p>
            <p className="detection-strikes">
              Strike {overlayStrikes} of {maxWarnings}
              {overlayIsFinalStrike
                ? ' — no further warnings remain'
                : overlayStrikes >= maxWarnings - 1 && overlayStrikes < maxWarnings
                  ? ' — one more locks your exam'
                  : ''}
            </p>
            <p className="detection-countdown">
              {overlayIsFinalStrike
                ? `Returning to your locked exam in ${detectionReturn} seconds…`
                : `Returning to exam in ${detectionReturn} seconds…`}
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${warningCountBadgeClass(
              displayStrikeCount(warningCount, maxWarnings),
              maxWarnings,
            )}`}
            title={`Integrity warnings — ${maxWarnings} strikes locks your exam for manual submit`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            {displayStrikeCount(warningCount, maxWarnings)} / {maxWarnings} warnings
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
              {examLocked ? (
                <div
                  className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
                  role="status"
                >
                  {lockReason === 'max_warnings'
                    ? 'Maximum warnings reached. You can review your answers but cannot change them. Click Send exam when ready.'
                    : 'Time is up. You can review your answers but cannot change them. Click Send exam when ready.'}
                </div>
              ) : null}
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
                          disabled={examLocked}
                          onClick={() =>
                            !examLocked &&
                            setAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))
                          }
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
                          disabled={examLocked}
                          onClick={() =>
                            !examLocked && setAnswers((prev) => ({ ...prev, [currentQ.id]: v }))
                          }
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
                      readOnly={examLocked}
                      onChange={(e) =>
                        !examLocked &&
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
                        !examLocked && setAnswers((prev) => ({ ...prev, [currentQ.id]: val ?? '' }))
                      }
                      options={{
                        ...MONACO_EXAM_EDITOR_OPTIONS,
                        readOnly: examLocked,
                      }}
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
                  {examLocked ? (
                    <button type="button" onClick={() => submitToServer()} className="btn-next">
                      Send exam
                    </button>
                  ) : currentQuestionIndex < questions.length - 1 ? (
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
              {examLocked ? 'Send exam' : 'Finish & submit'}
            </button>
          </div>
        </aside>

      </div>

      {detectionOverlay}
    </div>
  )
}
