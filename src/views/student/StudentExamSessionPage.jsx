import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import StreamBackLink from '@/components/layout/StreamBackLink.jsx'
import { Clock, LayoutGrid, CheckCircle2, AlertTriangle, Keyboard as KeyboardIcon, Moon, Sun, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { ExamSessionHeader } from '@/components/student/ExamSessionHeader.jsx'
import { ExamKeyboard } from '@/components/student/ExamKeyboard.jsx'
import { CollapsibleQuestion } from '@/components/student/CollapsibleQuestion.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
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
  stampStudentExamSessionStart,
} from '@/lib/studentExamApi.js'
import { PG_EXAM_STATUS, normalizeExamStatus } from '@/lib/examFlowUi.js'
import {
  displayStrikeCount,
  labelForCheatEvent,
  resolveMaxWarnings,
  warningCountBadgeClass,
} from '@/lib/examAntiCheat.js'
import { getFocusViolationFromKey } from '@/lib/examScreenshotGuard.js'
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


import { labelForQuestionType } from '@/lib/questionTypes.js'
import { QuestionTypeIcon } from '@/components/exam/QuestionTypeIcon.jsx'
import { MatchingQuestionInput } from '@/components/exam/MatchingPairEditor.jsx'
import DiagramEditor from '@/components/exam/DiagramEditor.jsx'
import {
  matchingPairsFromQuestion,
  parseMatchingStudentAnswer,
  stringifyMatchingStudentAnswer,
} from '@/lib/matchingQuestion.js'
import { applyLayoutToExamQuestions, buildShuffleLayout, shuffleArray } from '@/lib/examShuffle.js'
import { diagramVariantFromQuestion, emptyDiagramData } from '@/lib/diagramQuestion.js'

function questionTypeLabel(type) {
  return labelForQuestionType(type)
}

const ONSCREEN_KEYBOARD_TYPES = new Set(['identification', 'coding', 'essay', 'diagramming'])

function supportsOnscreenKeyboard(type) {
  return ONSCREEN_KEYBOARD_TYPES.has(String(type || '').toLowerCase())
}

function ExamQuestionNavigator({ questions, answers, currentQuestionIndex, examLocked, onSelectQuestion }) {
  return (
    <>
      <div className="exam-nav-legend">
        <span className="exam-nav-legend-item">
          <span className="exam-nav-legend-dot exam-nav-legend-dot--empty" aria-hidden />
          Unanswered
        </span>
        <span className="exam-nav-legend-item">
          <span className="exam-nav-legend-dot exam-nav-legend-dot--answered" aria-hidden />
          Answered
        </span>
      </div>
      <div
        className={`exam-nav-grid${examLocked ? ' is-locked' : ''}`}
        aria-disabled={examLocked || undefined}
      >
        {questions.map((q, idx) => {
          const isActive = idx === currentQuestionIndex
          const isAnswered = isQuestionAnswered(q, answers[q.id])
          const btnClass = [
            'exam-nav-btn',
            isActive ? 'is-active' : '',
            isAnswered ? 'is-answered' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={q.id || idx}
              type="button"
              disabled={examLocked}
              onClick={() => {
                if (!examLocked) onSelectQuestion(idx)
              }}
              className={btnClass}
              aria-label={`Go to question ${idx + 1}`}
              aria-current={isActive ? 'true' : undefined}
              aria-disabled={examLocked || undefined}
            >
              {idx + 1}
              {isAnswered && !isActive ? (
                <span className="exam-nav-btn__dot" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>
    </>
  )
}

function isQuestionAnswered(question, rawAnswer) {
  if (rawAnswer == null || String(rawAnswer).trim() === '') return false
  const type = String(question?.type || '').toLowerCase()
  if (type === 'matching') {
    const pairs = matchingPairsFromQuestion(question)
    const map = parseMatchingStudentAnswer(rawAnswer)
    return pairs.length > 0 && pairs.every((pair) => String(map[pair.left] || '').trim())
  }
  if (type === 'diagramming') {
    try {
      const data = JSON.parse(String(rawAnswer))
      return Array.isArray(data?.nodes) && data.nodes.length > 0
    } catch {
      return false
    }
  }
  return String(rawAnswer).trim() !== ''
}

function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function questionWatermarkStyle(questionIndex, refCode) {
  const seed = questionIndex * 997 + String(refCode).length * 13
  const rnd = (n) => {
    const x = Math.sin(seed * n) * 10000
    return x - Math.floor(x)
  }
  return {
    top: `${10 + rnd(1) * 58}%`,
    left: `${6 + rnd(2) * 52}%`,
  }
}

export default function StudentExamSessionPage() {
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const examId = searchParams.get('examId') || ''
  const { activeAccount } = useSession()
  const { theme, toggleTheme } = useTheme()
  const { institution } = useInstitutionTheme()
  const institutionMaxWarnings = institution?.maxWarnings

  const [hit, setHit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [examPassword, setExamPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [scene, setScene] = useState('lobby')
  const [sessionStatus, setSessionStatus] = useState(null)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const monacoEditorRef = useRef(null)
  const sceneRef = useRef(scene)
  const detectionOpenRef = useRef(false)

  function applyClosedJoinedSession(data) {
    const examSt = normalizeExamStatus(data.exam?.status)
    const sessionSt = (data.sessionStatus || '').toLowerCase()
    const closedWhileJoined =
      sessionSt !== 'submitted' &&
      examSt === PG_EXAM_STATUS.CLOSED &&
      (sessionSt === 'on_hold' || sessionSt === 'in_progress')
    if (!closedWhileJoined) return false

    const locked = true
    setExamLocked(locked)
    const reason = data.lockReason || 'teacher_closed'
    setLockReason((prev) => prev || reason)
    examLockedRef.current = locked
    lockReasonRef.current = reason
    setHit({ exam: { ...data.exam, questions: data.questions || [] }, sessionStartedAt: data.sessionStartedAt })
    if ((data.questions?.length || 0) > 0) {
      setScene('question')
    }
    return true
  }

  const loadSession = useCallback(async () => {
    if (classId === 'preview') {
      try {
        const previewStr = localStorage.getItem('examPreviewData')
        if (!previewStr) throw new Error('No preview data')
        const previewData = JSON.parse(previewStr)
        let previewQuestions = Array.isArray(previewData.questions) ? previewData.questions : []
        if (previewData.shuffleQuestions || previewData.shuffleChoices) {
          const layout = buildShuffleLayout(previewQuestions, {
            shuffleQuestions: Boolean(previewData.shuffleQuestions),
            shuffleChoices: Boolean(previewData.shuffleChoices),
          })
          previewQuestions = applyLayoutToExamQuestions(previewQuestions, layout)
        }
        setNeedsPassword(false)
        setHit({ exam: { ...previewData, questions: previewQuestions, status: 'open' } })
        setExamLocked(false)
        setMaxWarnings(resolveMaxWarnings(undefined, institutionMaxWarnings))
        setWarningCount(0)
        setError(null)
      } catch (err) {
        setError('Failed to load preview.')
        acsisToastError('Failed to load preview.')
      } finally {
        setLoading(false)
      }
      return
    }

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
      setSessionStatus(data.sessionStatus ?? null)
      const examSt = normalizeExamStatus(data.exam?.status)
      const sessionSt = (data.sessionStatus || '').toLowerCase()
      const closedWhileJoined =
        sessionSt !== 'submitted' &&
        examSt === PG_EXAM_STATUS.CLOSED &&
        (sessionSt === 'on_hold' || sessionSt === 'in_progress')
      const locked =
        sessionSt !== 'submitted' &&
        (Boolean(data.sessionLocked) ||
          closedWhileJoined ||
          (examSt === PG_EXAM_STATUS.OPEN && Boolean(data.sessionLocked)))
      setExamLocked(locked)
      setLockReason(
        locked
          ? data.lockReason ||
            (closedWhileJoined ? 'teacher_closed' : null) ||
            (displayStrikeCount(data.warningCount, loadedMax) >= loadedMax ? 'max_warnings' : null)
          : null,
      )
      examLockedRef.current = locked
      if (data.savedAnswers && typeof data.savedAnswers === 'object') {
        setAnswers((prev) => ({ ...prev, ...data.savedAnswers }))
      }
      if (data.sessionStatus === 'submitted') {
        setHit({ exam: data.exam, sessionStartedAt: data.sessionStartedAt })
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
      setHit({ exam: { ...data.exam, questions: data.questions || [] }, sessionStartedAt: data.sessionStartedAt })
      if (closedWhileJoined && (data.questions?.length || 0) > 0) {
        setScene('question')
      }
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
    if (classId === 'preview') return undefined
    if (!hit?.exam || needsPassword) return undefined
    const st = normalizeExamStatus(hit.exam.status)
    const shouldPollLobby =
      st === PG_EXAM_STATUS.WAITING ||
      scene === 'lobby' ||
      scene === 'countdown'
    if (!shouldPollLobby) return undefined

    const interval = window.setInterval(() => {
      loadSession()
    }, 2500)
    return () => window.clearInterval(interval)
  }, [classId, hit?.exam?.status, needsPassword, loadSession, scene])

  /** Sync lock/strike state when professor dismisses a false positive during the exam. */
  useEffect(() => {
    if (classId === 'preview') return undefined
    if (scene !== 'question' || !classId || !examId) return undefined
    const interval = window.setInterval(async () => {
      try {
        const data = await fetchStudentExamSession(classId, examId)
        const examSt = normalizeExamStatus(data.exam?.status)

        // Check exam status FIRST — if teacher closed the exam while student is answering,
        // lock them in-place immediately so they can submit (like timeout).
        if (examSt === PG_EXAM_STATUS.CLOSED) {
          setSessionStatus(data.sessionStatus ?? null)
          const sessionSt = (data.sessionStatus || '').toLowerCase()
          const shouldLock =
            sessionSt === 'on_hold' ||
            sessionSt === 'in_progress' ||
            Boolean(data.sessionLocked)
          if (shouldLock && !examLockedRef.current) {
            setExamLocked(true)
            const reason = data.lockReason || 'teacher_closed'
            setLockReason(reason)
            examLockedRef.current = true
            lockReasonRef.current = reason
          } else if (shouldLock) {
            setLockReason((prev) => prev || data.lockReason || 'teacher_closed')
          }
          setHit((prev) => ({
            sessionStartedAt: data.sessionStartedAt,
            exam: {
              ...(prev?.exam || {}),
              ...data.exam,
              questions: prev?.exam?.questions?.length
                ? prev.exam.questions
                : data.questions || [],
            },
          }))
          if (
            (sessionSt === 'on_hold' || sessionSt === 'in_progress') &&
            (data.questions?.length || 0) > 0
          ) {
            // Only skip countdown on reload if we've already stamped the start time
            if (data.sessionStartedAt) {
              setScene('question')
            } else {
              setScene('countdown')
            }
          }
          return
        }

        if (!data.joined) {
          setNeedsPassword(true)
          setExamLocked(false)
          setLockReason(null)
          lockingRef.current = false
          setScene('lobby')
          setHit(data.exam ? { exam: data.exam, sessionStartedAt: data.sessionStartedAt } : null)
          return
        }
        if (data.sessionStatus === 'submitted') return
        setSessionStatus(data.sessionStatus ?? null)
        if (examSt !== PG_EXAM_STATUS.OPEN) {
          if (applyClosedJoinedSession(data)) return
          setExamLocked(false)
          setLockReason(null)
          lockingRef.current = false
          setScene('lobby')
          setHit((prev) => ({
            sessionStartedAt: data.sessionStartedAt,
            exam: {
              ...(prev?.exam || {}),
              ...data.exam,
              questions: prev?.exam?.questions || data.questions || [],
            },
          }))
          return
        }
        const loadedMax = resolveMaxWarnings(data.maxWarnings, institutionMaxWarnings)
        setMaxWarnings(loadedMax)
        setWarningCount(displayStrikeCount(data.warningCount, loadedMax))
        warningCountRef.current = displayStrikeCount(data.warningCount, loadedMax)

        const serverLocked = Boolean(data.sessionLocked)
        if (serverLocked) {
          setExamLocked(true)
          setLockReason(data.lockReason || null)
          examLockedRef.current = true
          lockingRef.current = false
        } else if (lockingRef.current) {
          // Keep local lock while the lock API is in flight.
        } else if (
          examLockedRef.current &&
          lockReasonRef.current === 'max_warnings' &&
          displayStrikeCount(data.warningCount, loadedMax) < loadedMax
        ) {
          setExamLocked(false)
          setLockReason(null)
          examLockedRef.current = false
        } else if (!examLockedRef.current) {
          setExamLocked(false)
          setLockReason(null)
          examLockedRef.current = false
        }
        setHit((prev) =>
          prev
            ? {
              sessionStartedAt: prev.sessionStartedAt ?? data.sessionStartedAt,
              exam: {
                ...prev.exam,
                ...data.exam,
                questions: data.questions?.length ? data.questions : prev.exam?.questions || [],
              },
            }
            : { sessionStartedAt: data.sessionStartedAt, exam: { ...data.exam, questions: data.questions || [] } },
        )
      } catch {
        /* ignore transient poll errors */
      }
    }, 4000)
    return () => window.clearInterval(interval)
  }, [scene, classId, examId, institutionMaxWarnings])

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const lockingRef = useRef(false)
  const autosaveSkipRef = useRef(true)
  const matchingOptionsRef = useRef({})
  const examLockedRef = useRef(false)
  const lockReasonRef = useRef(null)
  const warningCountRef = useRef(0)
  const maxWarningsRef = useRef(resolveMaxWarnings(undefined, institutionMaxWarnings))
  // Tracks the real moment the student's exam clock starts (after the 3-2-1 animation ends)
  const examActualStartRef = useRef(null)

  const currentQ = questions[currentQuestionIndex]

  const matchingRightOptions = useMemo(() => {
    if (!currentQ || currentQ.type !== 'matching') return []
    const qid = String(currentQ.id)
    if (!matchingOptionsRef.current[qid]) {
      const pairs = matchingPairsFromQuestion(currentQ)
      matchingOptionsRef.current[qid] = shuffleArray(pairs.map((pair) => pair.right))
    }
    return matchingOptionsRef.current[qid]
  }, [currentQ])

  const rawCode = activeAccount?.studentNumber || activeAccount?.id
  const studentCode = rawCode ? btoa(String(rawCode)).replace(/=/g, '') : 'UNKNOWN'
  const watermarkStyle = useMemo(
    () => questionWatermarkStyle(currentQuestionIndex, studentCode),
    [currentQuestionIndex, studentCode],
  )

  const answeredCount = useMemo(
    () => questions.filter((q) => isQuestionAnswered(q, answers[q.id])).length,
    [questions, answers],
  )

  const selectQuestion = useCallback(
    (idx) => {
      if (examLocked) return
      setCurrentQuestionIndex(idx)
      setMobileNavOpen(false)
    },
    [examLocked],
  )

  useEffect(() => {
    if (!mobileNavOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [currentQuestionIndex])

  useEffect(() => {
    examLockedRef.current = examLocked
  }, [examLocked])
  useEffect(() => {
    lockReasonRef.current = lockReason
  }, [lockReason])
  useEffect(() => {
    warningCountRef.current = warningCount
  }, [warningCount])
  useEffect(() => {
    maxWarningsRef.current = maxWarnings
  }, [maxWarnings])

  const requestExamFullscreen = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => { })
    }
  }, [])

  const applyExamLock = useCallback(
    async (reason = 'time_up') => {
      if (classId === 'preview') {
        setExamLocked(true)
        setLockReason(reason)
        examLockedRef.current = true
        lockReasonRef.current = reason
        return
      }
      if (!classId || !examId || lockingRef.current) return
      lockingRef.current = true
      setExamLocked(true)
      setLockReason(reason)
      examLockedRef.current = true
      lockReasonRef.current = reason
      try {
        const res = await lockStudentExam(classId, examId, reason)
        const resolvedReason = res.lockReason || reason
        setLockReason(resolvedReason)
        lockReasonRef.current = resolvedReason
        setMaxWarnings(resolveMaxWarnings(res.maxWarnings, institutionMaxWarnings))
        if (res.warningCount != null) {
          setWarningCount(
            displayStrikeCount(res.warningCount, resolveMaxWarnings(res.maxWarnings, institutionMaxWarnings)),
          )
        }
      } catch (err) {
        console.error('[exam lock]', err)
        setLockReason(reason)
        lockReasonRef.current = reason
      } finally {
        lockingRef.current = false
      }
    },
    [classId, examId, institutionMaxWarnings],
  )

  const submitToServer = useCallback(async () => {
    if (classId === 'preview') {
      setSubmitResult({ scoreReleased: false, scorePending: true })
      setScene('submitted')
      return
    }
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
  }, [examGuardActive])

  useEffect(() => {
    if (!hit?.exam) return
    const st = normalizeExamStatus(hit.exam.status)
    if (st === PG_EXAM_STATUS.CLOSED) {
      if (scene === 'question') {
        if (!examLocked) {
          setExamLocked(true)
          setLockReason((prev) => prev || 'teacher_closed')
          examLockedRef.current = true
        }
      } else if (scene !== 'submitted' && !needsPassword && !detectionOpenRef.current) {
        const qs = questions.length > 0 ? questions : hit?.exam?.questions || []
        if (qs.length > 0) {
          setExamLocked(true)
          setLockReason((prev) => prev || 'teacher_closed')
          examLockedRef.current = true
          setScene('question')
        }
      }
      return
    }
    if (st !== PG_EXAM_STATUS.OPEN) {
      if (scene === 'countdown' || scene === 'question') {
        examActualStartRef.current = null
        setScene('lobby')
      }
      return
    }
    if (questions.length > 0 && scene === 'lobby') {
      examActualStartRef.current = null
      // If the student already has a server-stamped start time, skip the 3-2-1
      // animation and jump straight into the question scene so the timer
      // continues from where it left off rather than restarting.
      if (hit.sessionStartedAt) {
        setScene('question')
      } else {
        setScene('countdown')
      }
    }
  }, [hit?.exam?.status, hit?.sessionStartedAt, questions.length, scene, needsPassword, examLocked])

  const [detectionOpen, setDetectionOpen] = useState(false)
  useEffect(() => {
    detectionOpenRef.current = detectionOpen
  }, [detectionOpen])
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
      if (normalizeExamStatus(hit.exam.status) !== PG_EXAM_STATUS.OPEN) return
      // Use the local actual start (after 3-2-1) if available, else fall back to server sessionStartedAt
      const startedAt = examActualStartRef.current
        ? new Date(examActualStartRef.current).toISOString()
        : hit.sessionStartedAt
      const { seconds } = computeExamTimeDisplay({
        status: hit.exam.status,
        duration: hit.exam.duration,
        sessionStartedAt: startedAt,
      })
      if (seconds == null) {
        setSecondsLeft(null)
        return
      }
      setSecondsLeft(seconds)
      if (seconds <= 0 && !examLockedRef.current && !lockingRef.current) {
        void applyExamLock('time_up')
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [scene, hit?.exam, applyExamLock])

  useEffect(() => {
    if (classId === 'preview') return undefined
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
      if (classId === 'preview') {
        const strikeMax = resolveMaxWarnings(maxWarningsRef.current, institutionMaxWarnings)
        const strikesNow = Number(warningCountRef.current) || 0
        if (examLockedRef.current || strikesNow >= strikeMax) return

        detectionRunningRef.current = true
        if (!opts.skipCooldown) postCooldownUntilRef.current = Date.now() + 1500

        const nextStrike = Math.min(strikesNow + 1, strikeMax)
        const isFinalStrike = nextStrike >= strikeMax
        setLastViolationLabel(details ? `${labelForCheatEvent(eventType)} (${details})` : labelForCheatEvent(eventType))
        setOverlayStrikeDisplay(nextStrike)
        showViolationOverlay(sceneRef.current, {
          restoreFullscreenAfter: Boolean(opts.restoreFullscreenAfter) && !isFinalStrike,
        })

        setWarningCount(nextStrike)
        warningCountRef.current = nextStrike
        if (nextStrike >= strikeMax) {
          setExamLocked(true)
          examLockedRef.current = true
          setLockReason('max_warnings')
          pendingMaxWarningsLockRef.current = true
        }
        return
      }
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
    const isHiddenOrBlurred = document.hidden || !document.hasFocus()
    if (!isHiddenOrBlurred) return
    if (!isExamScene(sceneRef.current) || detectionRunningRef.current) return

    visibilityTimerRef.current = window.setTimeout(() => {
      visibilityTimerRef.current = null
      const stillHiddenOrBlurred = document.hidden || !document.hasFocus()
      if (!stillHiddenOrBlurred || !isExamScene(sceneRef.current) || detectionRunningRef.current) return
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
      const isHiddenOrBlurred = document.hidden || !document.hasFocus()
      if (isHiddenOrBlurred) scheduleTabLeave()
      else cancelTabLeave()
    }
    function onWindowBlur() {
      if (!isExamScene(sceneRef.current) || detectionRunningRef.current) return
      scheduleTabLeave()
    }
    function onWindowFocus() {
      if (!document.hidden && document.hasFocus()) {
        cancelTabLeave()
      }
    }
    function onPopState() {
      if (!isExamScene(sceneRef.current)) return
      recordViolation('other', 'Attempted to navigate back or leave page')
      const ok = window.confirm(
        'Leave the exam? Your progress is saved, but you should stay on this page until you submit.',
      )
      if (!ok) {
        window.history.pushState({ examGuard: true }, '')
      }
    }
    function onBeforeUnload(e) {
      if (!isExamScene(sceneRef.current)) return
      window.setTimeout(() => {
        if (isExamScene(sceneRef.current)) {
          recordViolation('other', 'Attempted to close or reload tab')
        }
      }, 100)
      e.preventDefault()
      e.returnValue = ''
    }
    let lastFocusKeyLogAt = 0
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
    function onFocusKeyUp(ev) {
      blockFocusKeys(ev)
    }
    function onKey(ev) {
      if (!isExamScene(sceneRef.current)) return
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
    window.addEventListener('focus', onWindowFocus)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('keyup', onFocusKeyUp, true)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCut, true)
    document.addEventListener('paste', onPaste, true)
    return () => {
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('keyup', onFocusKeyUp, true)
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
        document.exitFullscreen().catch(() => { })
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
        window.setTimeout(() => {
          // Record the exact moment the student sees the first question
          examActualStartRef.current = Date.now()
          setScene('question')
          
          // Persist the stamp to the server so it survives reloads
          stampStudentExamSessionStart(classId, examId).then(res => {
            if (res.ok && res.startedAt) {
              setHit(h => h ? { ...h, sessionStartedAt: res.startedAt } : h)
            }
          }).catch(console.error)
          
        }, 1000)
        return
      }
      n -= 1
      window.setTimeout(step, 1000)
    }
    const id = window.setTimeout(step, 0)
    return () => window.clearTimeout(id)
  }, [scene, classId, examId])

  if (loading) {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center">
        <p className="text-sm font-medium text-foreground/70 animate-pulse">Loading exam details…</p>
      </div>
    )
  }

  if (needsPassword && classId && examId) {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-white/15 bg-background/40 text-card-foreground shadow-lg backdrop-blur-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
              Enter exam code
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Enter the exam code from your instructor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitExamPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-code" className="text-sm font-medium text-foreground/90">
                  Exam code
                </Label>
                <Input
                  id="exam-code"
                  type="text"
                  className="text-center font-mono text-base tracking-widest uppercase bg-background/40 border-emerald-600/50 text-foreground"
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
              <StreamBackLink
                to={`/student/my-classes/${classId}`}
                className="exam-session-exit block text-center text-sm font-medium"
              >
                Back to class
              </StreamBackLink>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !classId || (!examId && classId !== 'preview') || !hit) {
    return (
      <div className="acsis-student-exam min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border bg-card text-center shadow-lg">
          <CardHeader className="items-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-400" aria-hidden />
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
              Cannot open exam
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error ||
                'Open an exam from a class you are enrolled in, or check the class code and exam link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <StreamBackLink to="/student/my-classes" className="w-full justify-center">
                Enrolled classes
              </StreamBackLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }



  // Lobby Scene
  if (scene === 'lobby') {
    const examSt = normalizeExamStatus(hit.exam.status)
    const inLobby = examSt === PG_EXAM_STATUS.WAITING
    const heldAfterClose =
      examSt === PG_EXAM_STATUS.CLOSED &&
      (sessionStatus === 'on_hold' || sessionStatus === 'in_progress')
    return (
      <div className="acsis-student-exam min-h-screen flex flex-col">
        <ExamSessionHeader title={examTitle} />
        <main className="lobby-main">
          <div className="my-auto flex flex-col items-center">
            <h2 className="lobby-warning-title">
              {heldAfterClose ? 'Exam ended' : 'Before you begin'}
            </h2>
            <div className="lobby-copy text-sm leading-relaxed text-foreground opacity-90">
              {heldAfterClose ? (
                <>
                  <p>Your instructor ended the exam while you were still in the lobby.</p>
                  <p className="mt-4">
                    Loading your session so you can review and submit any work already saved.
                  </p>
                </>
              ) : (
                <>
              <p>This examination system monitors your activity to ensure academic fairness.</p>
              <p className="mt-4">
                You are allowed up to <strong className="text-red-500">{maxWarnings} strikes</strong> only. If this limit is exceeded, your
                exam will be <strong className="text-red-500">locked</strong>: you cannot change or move between answers; use{' '}
                <strong>Send exam</strong> when you are ready to submit.
              </p>
              <p className="mt-4">Please remain on this page and complete the exam honestly.</p>
              <p className="mt-6">
                The following actions are counted as strikes:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 my-5">
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-sm font-semibold tracking-wide text-red-500">Tab switching</span>
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-sm font-semibold tracking-wide text-red-500">Leaving the exam page</span>
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-sm font-semibold tracking-wide text-red-500">Screenshots</span>
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-sm font-semibold tracking-wide text-red-500">Right-clicking</span>
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-sm font-semibold tracking-wide text-red-500">Windows key</span>
              </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-col items-center pb-4">
            <div className="lobby-footer !pb-2">
              <div className="lobby-spinner" aria-hidden />
              <p className="lobby-waiting text-sm font-medium text-foreground opacity-80">
                {heldAfterClose
                  ? 'Preparing your held session…'
                  : inLobby
                  ? `Waiting for ${instructorWait} to start the exam…`
                  : 'Exam in progress - starting shortly…'}
              </p>
            </div>
            <p className="exam-type-hint text-xs text-muted-foreground m-0">
              {heldAfterClose
                ? 'You can submit saved answers once your session opens.'
                : inLobby
                ? 'You are in the lobby. The timer starts when your instructor goes live.'
                : 'Your session is ongoing. Do not re-enter the exam code from the class page.'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Countdown Scene
  if (scene === 'countdown') {
    return (
      <div className="acsis-student-exam min-h-screen flex flex-col">
        <main className="countdown-main">
          <p className="countdown-label text-sm font-medium uppercase tracking-wide text-muted-foreground">
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
        <Card className="w-full max-w-lg border-border bg-card text-center shadow-lg">
          <CardHeader className="items-center space-y-4 pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" aria-hidden />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
              Exam submitted
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Thank you for completing the exam. Your responses have been recorded and submitted to
              your instructor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitError ? (
              <p className="text-sm font-medium text-red-400" role="alert">
                {submitError} - contact your instructor if this persists.
              </p>
            ) : null}
            {submitResult?.scoreReleased && submitResult?.percentage != null ? (
              <p className="text-base font-semibold text-foreground">
                Score: {submitResult.percentage}% ({submitResult.rawScore}/{submitResult.totalPoints}{' '}
                points)
              </p>
            ) : submitResult?.scoreReleased && submitResult?.rawScore != null ? (
              <p className="text-base font-semibold text-foreground">
                Score: {submitResult.rawScore}/{submitResult.totalPoints} points
              </p>
            ) : submitResult?.scorePending || (submitResult && !submitResult.scoreReleased) ? (
              <p className="text-sm font-medium text-muted-foreground">
                Your score will appear after your instructor releases results.
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
          className={`detection-overlay text-white ${detectionOpen ? ' is-active' : ''}${overlayIsFinalStrike ? ' detection-overlay--final' : ''
            }`}
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
        >
          <AlertTriangle className="detection-overlay__icon text-white" aria-hidden />
          <h2 className="detection-title text-white">
            {overlayIsFinalStrike
              ? 'Final Warning: Maximum Strikes Reached'
              : 'Warning: Suspicious Activity!'}
          </h2>
          <p className="detection-sub text-white">
            {overlayIsFinalStrike ? (
              <>
                You have reached <strong>{maxWarnings} of {maxWarnings}</strong> integrity warnings.
                Your exam is now <strong>locked</strong>: you cannot change answers or switch questions.
                Click <strong>Send exam</strong> when you are ready to submit.
              </>
            ) : (
              <>
                {lastViolationLabel || 'A proctoring rule was violated.'} This incident was logged for
                your instructor and administrator.
              </>
            )}
          </p>
          <p className="detection-strikes text-white">
            Strike {overlayStrikes} of {maxWarnings}
            {overlayIsFinalStrike
              ? ' - no further warnings remain'
              : overlayStrikes >= maxWarnings - 1 && overlayStrikes < maxWarnings
                ? ' - one more locks your exam'
                : ''}
          </p>
          <p className="detection-countdown text-white">
            {overlayIsFinalStrike
              ? `Returning to your locked exam in ${detectionReturn} seconds…`
              : `Returning to exam in ${detectionReturn} seconds…`}
          </p>
        </div>,
        document.body,
      )
      : null

  return (
    <div className="acsis-student-exam acsis-student-exam--session min-h-screen flex flex-col">
      <ExamSessionHeader
        title={examTitle}
        titleClassName="hidden sm:block max-w-md"
        className="sticky top-0 z-10 shrink-0"
      >
        <div className="exam-chrome-toolbar">
          <div
            className={`exam-strike-badge ${warningCountBadgeClass(
              displayStrikeCount(warningCount, maxWarnings),
              maxWarnings,
            )}`}
            title={`Integrity warnings - ${maxWarnings} strikes locks your exam for manual submit`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            <span className="sm:hidden">
              {displayStrikeCount(warningCount, maxWarnings)}/{maxWarnings}
            </span>
            <span className="hidden sm:inline">
              {displayStrikeCount(warningCount, maxWarnings)} / {maxWarnings} warnings
            </span>
          </div>
          <div className="exam-timer flex items-center gap-1.5 lg:hidden shrink-0">
            <Clock className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
            {secondsLeft != null && secondsLeft > 0 ? formatClock(secondsLeft) : '--:--'}
          </div>
          <div className="exam-chrome-tools">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="exam-topbar-icon-btn"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {currentQ && supportsOnscreenKeyboard(currentQ.type) ? (
              <button
                type="button"
                onClick={() => setShowKeyboard((v) => !v)}
                title={showKeyboard ? 'Hide on-screen keyboard' : 'Show on-screen keyboard'}
                aria-label={showKeyboard ? 'Hide on-screen keyboard' : 'Show on-screen keyboard'}
                aria-pressed={showKeyboard}
                className={`exam-topbar-icon-btn${showKeyboard ? ' exam-topbar-icon-btn--active' : ''}`}
              >
                <KeyboardIcon className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </ExamSessionHeader>

      <div className="exam-session-layout flex-1 flex flex-col lg:flex-row w-full items-stretch">
        <main
          className="exam-stage flex-1 flex flex-col min-w-0 relative"
          onPointerDown={() => {
            if (!document.fullscreenElement) requestExamFullscreen()
          }}
        >
          {currentQ ? (
            <div className="exam-question-shell flex-1 flex flex-col w-full">
              {examLocked ? (
                <div
                  className="exam-lock-banner rounded-xl border border-amber-500/40 bg-amber-100 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
                  role="status"
                >
                  {lockReason === 'max_warnings'
                    ? 'Maximum warnings reached. You cannot change answers or switch questions. Click Send exam when ready.'
                    : lockReason === 'teacher_closed'
                      ? 'The exam has been ended by your teacher. Please submit your answers now.'
                      : 'Time is up. You cannot change answers or switch questions. Click Send exam when ready.'}
                </div>
              ) : null}
              <div className="exam-question-scroll">
                <div
                  className={examLocked ? 'exam-strike-lock-blur' : undefined}
                  aria-hidden={examLocked ? true : undefined}
                >
                  <div className="exam-question-intro">
                  <div
                    className="exam-question-watermark"
                    style={watermarkStyle}
                    aria-hidden="true"
                  >
                    Ref: {studentCode}
                  </div>
                  <div className="exam-question-meta-row">
                    <span className="exam-type-badge">
                      <QuestionTypeIcon type={currentQ.type} size={14} className="exam-type-badge__icon" />
                      {questionTypeLabel(currentQ.type)}
                    </span>
                  </div>
                  {currentQ.sectionDescription?.trim() ? (
                    <p className="exam-set-instructions">{currentQ.sectionDescription.trim()}</p>
                  ) : null}
                  <CollapsibleQuestion
                    text={currentQ.question}
                    className="question-box question-box--prompt whitespace-pre-wrap"
                  />
                  {currentQ.imageUrl && (
                    <div className="mt-5">
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
                    <div className="w-full">
                      <div className="mb-2">
                        <p className="exam-type-hint m-0 text-left">
                          Type your answer below
                        </p>
                      </div>
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
                      <div className="mb-2">
                        <p className="exam-type-hint m-0 text-left">
                          Language: {normalizeCodingLanguage(currentQ.language || currentQ.options?.[0])}
                        </p>
                      </div>
                      <Editor
                        height="min(42vh, 360px)"
                        language={normalizeCodingLanguage(currentQ.language || currentQ.options?.[0])}
                        theme={monacoThemeForApp(theme)}
                        value={answers[currentQ.id] || ''}
                        onChange={(val) =>
                          !examLocked && setAnswers((prev) => ({ ...prev, [currentQ.id]: val ?? '' }))
                        }
                        onMount={(editor) => { monacoEditorRef.current = editor }}
                        options={{
                          ...MONACO_EXAM_EDITOR_OPTIONS,
                          readOnly: examLocked,
                        }}
                      />
                    </div>
                  )}

                  {currentQ.type === 'matching' && (
                    <div>
                      <p className="exam-type-hint mb-3 text-left">Match each item on the left to the correct option.</p>
                      <MatchingQuestionInput
                        pairs={matchingPairsFromQuestion(currentQ)}
                        rightOptions={matchingRightOptions}
                        value={parseMatchingStudentAnswer(answers[currentQ.id])}
                        disabled={examLocked}
                        onChange={(map) =>
                          !examLocked &&
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: stringifyMatchingStudentAnswer(map),
                          }))
                        }
                      />
                    </div>
                  )}

                  {currentQ.type === 'essay' && (
                    <div className="max-w-3xl">
                      <p className="exam-type-hint mb-2 text-left">Write your answer in the box below.</p>
                      <textarea
                        rows={10}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[220px]"
                        placeholder="Type your essay response..."
                        value={answers[currentQ.id] || ''}
                        readOnly={examLocked}
                        onChange={(e) =>
                          !examLocked &&
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {currentQ.type === 'diagramming' && (
                    <div className="exam-diagram-answer">
                      <p className="exam-type-hint mb-2 text-left">
                        Build a {diagramVariantFromQuestion(currentQ) === 'erd' ? 'entity relationship diagram' : 'flowchart'}.
                        Drag shapes from the toolbox, connect handles, and click a node to edit its label.
                      </p>
                      <DiagramEditor
                        key={currentQ.id}
                        variant={diagramVariantFromQuestion(currentQ)}
                        value={answers[currentQ.id] || emptyDiagramData()}
                        readOnly={examLocked}
                        onChange={(json) =>
                          !examLocked && setAnswers((prev) => ({ ...prev, [currentQ.id]: json }))
                        }
                        height="min(52vh, 440px)"
                      />
                    </div>
                  )}
                </div>
              </div>
              </div>

              <div className="exam-footer-bar">
                {!examLocked ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="exam-footer-btn"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <div className="exam-footer-right">
                      {currentQuestionIndex === questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setIsSubmitDialogOpen(true)}
                          className="btn-next"
                        >
                          Submit exam
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
                          disabled={currentQuestionIndex >= questions.length - 1}
                          className="exam-footer-btn"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center lobby-waiting">No questions found.</div>
          )}
        </main>

        <aside className="exam-sidebar hidden lg:flex">
          <div className="exam-sidebar-section">
            <div className="exam-sidebar-heading">
              <Clock className="w-4 h-4 opacity-70 shrink-0" aria-hidden />
              <h3 className="exam-type-label">Time remaining</h3>
            </div>
            <div className="exam-timer-block">
              <span className="exam-timer">
                {secondsLeft != null && secondsLeft > 0 ? formatClock(secondsLeft) : '--:--'}
              </span>
            </div>
          </div>

          <div className="exam-sidebar-section exam-sidebar-section--grow">
            <div className="exam-sidebar-heading">
              <LayoutGrid className="w-4 h-4 opacity-70 shrink-0" aria-hidden />
              <h3 className="exam-type-label">Question navigator</h3>
            </div>
            <ExamQuestionNavigator
              questions={questions}
              answers={answers}
              currentQuestionIndex={currentQuestionIndex}
              examLocked={examLocked}
              onSelectQuestion={selectQuestion}
            />
          </div>

          <div className="exam-sidebar-footer">
            <div className="progress-row mb-4">
              <span className="progress-label">Completion</span>
              <span className="progress-label">
                {answeredCount} / {questions.length}
              </span>
            </div>
            <button type="button" onClick={() => setIsSubmitDialogOpen(true)} className="btn-next w-full">
              {examLocked ? 'Send exam' : 'Submit exam'}
            </button>
          </div>
        </aside>

        <div className={`exam-mobile-nav lg:hidden${mobileNavOpen ? ' is-open' : ''}`}>
          {mobileNavOpen ? (
            <button
              type="button"
              className="exam-mobile-nav__backdrop"
              aria-label="Close question navigator"
              onClick={() => setMobileNavOpen(false)}
            />
          ) : null}
          <div className="exam-mobile-nav__panel" role="region" aria-label="Question navigator">
            <div
              className="exam-mobile-nav__sheet"
              id="exam-mobile-nav-sheet"
            >
              <div className="exam-mobile-nav__sheet-head">
                <div className="exam-sidebar-heading">
                  <LayoutGrid className="w-4 h-4 opacity-70 shrink-0" aria-hidden />
                  <h3 className="exam-type-label">Question navigator</h3>
                </div>
                <div className="exam-mobile-nav__meta">
                  <span>{answeredCount} / {questions.length} answered</span>
                </div>
              </div>
              <ExamQuestionNavigator
                questions={questions}
                answers={answers}
                currentQuestionIndex={currentQuestionIndex}
                examLocked={examLocked}
                onSelectQuestion={selectQuestion}
              />
              <div className="exam-mobile-nav__sheet-footer">
                <button type="button" onClick={() => setIsSubmitDialogOpen(true)} className="btn-next w-full">
                  {examLocked ? 'Send exam' : 'Submit exam'}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="exam-mobile-nav__handle"
              aria-expanded={mobileNavOpen}
              aria-controls="exam-mobile-nav-sheet"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <LayoutGrid className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
              <span className="exam-mobile-nav__handle-label">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="exam-mobile-nav__handle-meta">
                {answeredCount}/{questions.length} done
              </span>
              <ChevronUp className={`exam-mobile-nav__chevron${mobileNavOpen ? ' is-open' : ''}`} aria-hidden />
            </button>
          </div>
        </div>

      </div>

      {showKeyboard && currentQ && supportsOnscreenKeyboard(currentQ.type) && (
        <ExamKeyboard
          value={answers[currentQ.id] || ''}
          onChange={(val) =>
            !examLocked &&
            setAnswers((prev) => ({
              ...prev,
              [currentQ.id]: currentQ.type === 'identification' ? val.toUpperCase() : val,
            }))
          }
          onClose={() => setShowKeyboard(false)}
          questionType={currentQ.type}
          editorRef={monacoEditorRef}
        />
      )}

      {detectionOverlay}

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              Are you sure you're ready to submit? You won't be able to change your answers afterwards.
              <br /><br />
              If you encounter any issues or have concerns, please speak with your instructor before submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setIsSubmitDialogOpen(false); submitToServer(); }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
