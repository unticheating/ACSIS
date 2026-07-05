import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, AlertTriangle, Search, ShieldAlert, X, Maximize, Minimize, Play, Pause } from 'lucide-react'
import { useDetectionsToolbar } from '@/context/DetectionsToolbarContext.jsx'
import {
  dismissTeacherViolation,
  fetchTeacherActiveMonitoring,
  fetchTeacherExamSessionDetail,
  fetchTeacherMonitoringSnapshot,
} from '@/lib/teacherExamResultsApi.js'
import { labelForCheatEvent, MAX_EXAM_WARNINGS } from '@/lib/examAntiCheat.js'
import { computeExamTimeDisplay } from '@/lib/examCountdown.js'
import {
  arrangeSeatsBySettings,
  buildSeatGridFromRoster,
  DEFAULT_SEAT_SETTINGS,
  loadSeatSettings,
  moveSeatAt,
  saveSeatLayout,
  saveSeatSettings,
  VIEW_MODES,
} from '@/lib/detectionsSeatLayout.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
import '../../pages/teacher-ui/reports.css'
import '../../styles/teacher-detections-live.css'

function splitName(fullName) {
  const parts = String(fullName || 'Student').trim().split(/\s+/)
  if (parts.length < 2) return { firstName: parts[0] || 'Student', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function formatViolationLabel(v) {
  if (v.label) return v.label
  const base = labelForCheatEvent(v.eventType) || v.eventType || 'event'
  const detail = v.details ? ` — ${v.details}` : ''
  const when = v.occurredAt ? new Date(v.occurredAt).toLocaleTimeString() : ''
  return `${base}${detail}${when ? ` (${when})` : ''}`
}

function normalizeViolationEntry(v) {
  return {
    id: v.id,
    label: formatViolationLabel(v),
    dismissedAt: v.dismissedAt || null,
  }
}

function violationsBySession(violations) {
  const map = new Map()
  for (const v of violations || []) {
    const sid = v.sessionId
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid).push(normalizeViolationEntry(v))
  }
  return map
}

function resolveSeatTone(entry) {
  if (!entry.joined) return 'absent'
  if (entry.status === 'submitted') return 'submitted'
  const strikes = Number(entry.warningCount || 0)
  if (strikes >= MAX_EXAM_WARNINGS) return 'warn3'
  if (strikes === 2) return 'warn2'
  if (strikes === 1) return 'warn1'
  return 'ongoing'
}

function statusLabelForTone(tone) {
  const map = {
    absent: 'Enrolled — not joined yet',
    ongoing: 'Active — no warnings',
    warn1: '1 warning',
    warn2: '2 warnings',
    warn3: 'Max warnings — locked for submit',
    submitted: 'Exam submitted',
  }
  return map[tone] || tone
}

function isDoneTone(tone) {
  return tone === 'submitted'
}

function isViolator(student) {
  const strikes = Number(student.strikes || 0)
  if (strikes > 0) return true
  return student.tone === 'warn1' || student.tone === 'warn2' || student.tone === 'warn3'
}

const VIOLATOR_TONE_RANK = {
  warn3: 0,
  warn2: 1,
  warn1: 2,
}

function compareListStudents(a, b) {
  const aViolator = isViolator(a)
  const bViolator = isViolator(b)
  if (aViolator !== bViolator) return aViolator ? -1 : 1
  if (aViolator && bViolator) {
    const strikeDiff = Number(b.strikes || 0) - Number(a.strikes || 0)
    if (strikeDiff !== 0) return strikeDiff
    const toneDiff =
      (VIOLATOR_TONE_RANK[a.tone] ?? 9) - (VIOLATOR_TONE_RANK[b.tone] ?? 9)
    if (toneDiff !== 0) return toneDiff
  }
  const lastCmp = (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
  if (lastCmp !== 0) return lastCmp
  return (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
}

function studentMatchesListSearch(student, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [student.firstName, student.lastName, student.schoolId, statusLabelForTone(student.tone)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function rosterEntryToSeat(entry, violationLabels = []) {
  const firstName = entry.firstName || splitName(entry.studentName).firstName
  const lastName = entry.lastName || splitName(entry.studentName).lastName
  const strikes = Number(entry.warningCount || 0)
  const tone = resolveSeatTone(entry)
  return {
    id: entry.sessionId ? `session-${entry.sessionId}` : `member-${entry.memberId}`,
    sessionId: entry.sessionId,
    memberId: entry.memberId,
    sessionStatus: entry.status,
    joined: entry.joined,
    firstName,
    lastName,
    avatarUrl: entry.avatarUrl,
    schoolId: entry.schoolId || '',
    tone,
    strikes,
    violations: violationLabels,
  }
}

function rosterToSeats(roster, vMap) {
  return (roster || []).map((r) =>
    rosterEntryToSeat(r, r.sessionId ? vMap.get(r.sessionId) || [] : []),
  )
}

function seatModifier(tone) {
  if (tone === 'empty') return 'acsis-detections-seat--empty'
  return `acsis-detections-seat--${tone}`
}

function seatInitials(student) {
  const f = student.firstName?.[0] || ''
  const l = student.lastName?.[0] || ''
  return (l && f ? l + f : l || f || '?').toUpperCase()
}

const ExamTimer = React.memo(function ExamTimer({ activeExam }) {
  const [clockTick, setClockTick] = useState(0)

  useEffect(() => {
    if (!activeExam) return undefined
    const interval = window.setInterval(() => setClockTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [activeExam])

  const examTime = useMemo(
    () => (activeExam ? computeExamTimeDisplay(activeExam) : null),
    [activeExam, clockTick],
  )

  return (
    <FadeIn
      delay={0.35}
      className={`flex flex-col items-center justify-center min-w-[90px] px-3 py-1.5 rounded-lg border shadow-sm transition-colors ${
        examTime?.isLow 
          ? 'bg-destructive/10 border-destructive/30 text-destructive animate-pulse' 
          : 'bg-primary/10 border-primary/20 text-primary'
      }`}
    >
      <span className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
        <Clock className="w-4 h-4 opacity-80" aria-hidden />
        {examTime?.display ?? '--:--'}
      </span>
      <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">{examTime?.label ?? 'Time'}</span>
    </FadeIn>
  )
})

export default function TeacherDetectionsPage() {
  const [searchParams] = useSearchParams()
  const classIdParam = searchParams.get('classId')
  const examIdParam = searchParams.get('examId')

  const [activeExam, setActiveExam] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [dismissingLogId, setDismissingLogId] = useState(null)
  const [dismissError, setDismissError] = useState('')
  const [dragSourceIdx, setDragSourceIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [seatSettings, setSeatSettings] = useState(() => ({ ...DEFAULT_SEAT_SETTINGS }))
  const [listSearchQuery, setListSearchQuery] = useState('')
  const dragMovedRef = useRef(false)
  const monitoringRef = useRef(null)

  // Native Browser Full Screen States
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const pageContainerRef = useRef(null)

  // Handle browser native fullscreen change triggers (e.g. hitting ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const nativeActive = !!document.fullscreenElement
      setIsFullscreen(nativeActive)
      if (!nativeActive) {
        setIsAutoScrolling(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Native Full Screen Request Toggle
  const toggleNativeFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (pageContainerRef.current) {
          await pageContainerRef.current.requestFullscreen()
        }
      } catch (err) {
        console.error('[Fullscreen Error]', err)
      }
    } else {
      document.exitFullscreen()
    }
  }

  // Smooth Auto Scroll Animation Logic
  useEffect(() => {
    if (!isFullscreen || !isAutoScrolling || !pageContainerRef.current) return

    let animationFrameId
    let direction = 1
    let lastTimestamp = 0
    const pixelsPerSecond = 30 
    let fractionalScroll = 0

    const scrollStep = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp
      const delta = timestamp - lastTimestamp
      lastTimestamp = timestamp

      const element = pageContainerRef.current
      if (!element) return

      fractionalScroll += (pixelsPerSecond * delta) / 1000
      
      if (fractionalScroll >= 1) {
        const pixelsToMove = Math.floor(fractionalScroll)
        fractionalScroll -= pixelsToMove
        
        element.scrollTop += (pixelsToMove * direction)

        if (direction === 1 && element.scrollTop + element.clientHeight >= element.scrollHeight - 2) {
          direction = -1
        } else if (direction === -1 && element.scrollTop <= 2) {
          direction = 1
        }
      }

      animationFrameId = requestAnimationFrame(scrollStep)
    }

    animationFrameId = requestAnimationFrame(scrollStep)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isFullscreen, isAutoScrolling])

  const applySettingsLayout = useCallback(
    (settings, exam = activeExam) => {
      const data = monitoringRef.current
      if (!data || !exam?.classId || !exam?.id) return
      const vMap = violationsBySession(data.violations)
      const rosterSeats = rosterToSeats(data.roster || [], vMap)
      const grid = arrangeSeatsBySettings(rosterSeats, settings)
      setStudents(grid)
      saveSeatLayout(exam.classId, exam.id, grid)
    },
    [activeExam],
  )

  const applyMonitoringData = useCallback((data, exam) => {
    monitoringRef.current = data
    const vMap = violationsBySession(data.violations)
    const rosterSeats = rosterToSeats(data.roster || [], vMap)
    const settings =
      exam?.classId != null && exam?.id != null
        ? loadSeatSettings(exam.classId, exam.id)
        : { ...DEFAULT_SEAT_SETTINGS }
    setSeatSettings(settings)
    setStudents(
      buildSeatGridFromRoster(rosterSeats, exam?.classId ?? null, exam?.id ?? null, settings),
    )
    if (data.exam && exam) {
      setActiveExam((prev) => ({
        ...(prev || exam),
        status: data.exam.status ?? prev?.status ?? exam.status,
        duration: data.exam.duration ?? prev?.duration ?? exam.duration,
        openedAt: data.exam.openedAt ?? prev?.openedAt ?? exam.openedAt,
        updatedAt: data.exam.updatedAt ?? prev?.updatedAt ?? exam.updatedAt,
      }))
    }
  }, [])

  const handleFillModeChange = useCallback(
    (fillMode) => {
      if (!activeExam?.classId || !activeExam?.id) return
      const next = { ...seatSettings, fillMode }
      setSeatSettings(next)
      saveSeatSettings(activeExam.classId, activeExam.id, next)
      applySettingsLayout(next, activeExam)
    },
    [activeExam, seatSettings, applySettingsLayout],
  )

  const handleViewModeChange = useCallback(
    (viewMode) => {
      if (!activeExam?.classId || !activeExam?.id) return
      const next = { ...seatSettings, viewMode }
      setSeatSettings(next)
      saveSeatSettings(activeExam.classId, activeExam.id, next)
    },
    [activeExam, seatSettings],
  )

  const { setToolbar } = useDetectionsToolbar() || {}
  const [monitoringReady, setMonitoringReady] = useState(false)

  useEffect(() => {
    if (!setToolbar) return undefined
    return () => setToolbar(null)
  }, [setToolbar])

  useEffect(() => {
    if (!setToolbar) return
    if (!activeExam) {
      setToolbar(null)
      return
    }
    setToolbar({
      seatSettings,
      viewMode: seatSettings.viewMode ?? VIEW_MODES.CLASSROOM,
      onFillModeChange: handleFillModeChange,
      onViewModeChange: handleViewModeChange,
    })
  }, [activeExam, seatSettings, handleFillModeChange, handleViewModeChange, setToolbar])

  const handleSeatDrop = useCallback(
    (fromIdx, toIdx) => {
      if (fromIdx === toIdx) return
      dragMovedRef.current = true
      setStudents((prev) => {
        const next = moveSeatAt(prev, fromIdx, toIdx)
        if (activeExam?.classId != null && activeExam?.id != null) {
          saveSeatLayout(activeExam.classId, activeExam.id, next)
        }
        return next
      })
      setDragSourceIdx(null)
      setDragOverIdx(null)
    },
    [activeExam],
  )

  const refreshSessions = useCallback(
    async (exam) => {
      if (!exam?.classId || !exam?.id) return
      try {
        const data = await fetchTeacherMonitoringSnapshot(exam.classId, exam.id)
        applyMonitoringData(data, exam)
      } catch (err) {
        console.error('[Detections] Failed to load sessions:', err)
      }
    },
    [applyMonitoringData],
  )

  async function openStudentDetail(student) {
    setDismissError('')
    if (!student?.sessionId || !activeExam?.classId || !activeExam?.id) {
      setSelectedStudent(student)
      return
    }
    setSelectedStudent(student)
    try {
      const detail = await fetchTeacherExamSessionDetail(
        activeExam.classId,
        activeExam.id,
        student.sessionId,
      )
      const violations = (detail.violations || []).map(normalizeViolationEntry)
      const strikes = Number(detail.session?.warningCount ?? student.strikes ?? 0)
      setSelectedStudent((prev) =>
        prev && prev.sessionId === student.sessionId
          ? {
              ...prev,
              strikes,
              tone: resolveSeatTone({
                joined: true,
                warningCount: strikes,
                status: detail.session?.status ?? prev.sessionStatus,
              }),
              sessionStatus: detail.session?.status ?? prev.sessionStatus,
              violations: violations.length ? violations : prev.violations,
            }
          : prev,
      )
    } catch (err) {
      console.error('[Detections] session detail:', err)
    }
  }

  const handleDismissViolation = useCallback(
    async (violation) => {
      if (!violation?.id || !selectedStudent?.sessionId || !activeExam?.classId || !activeExam?.id) {
        return
      }
      if (violation.dismissedAt) return
      setDismissError('')
      setDismissingLogId(violation.id)
      try {
        const result = await dismissTeacherViolation(
          activeExam.classId,
          activeExam.id,
          selectedStudent.sessionId,
          violation.id,
        )
        const strikes = Number(result.warningCount ?? 0)
        const nextViolations = (selectedStudent.violations || []).map((v) =>
          v.id === violation.id ? { ...v, dismissedAt: new Date().toISOString() } : v,
        )
        const nextTone = resolveSeatTone({
          joined: true,
          warningCount: strikes,
          status: selectedStudent.sessionStatus,
        })
        setSelectedStudent((prev) =>
          prev
            ? {
                ...prev,
                strikes,
                tone: nextTone,
                violations: nextViolations,
              }
            : prev,
        )
        const snapshot = await fetchTeacherMonitoringSnapshot(activeExam.classId, activeExam.id)
        applyMonitoringData(snapshot, activeExam)
        const rosterEntry = (snapshot.roster || []).find(
          (r) => r.sessionId === selectedStudent.sessionId,
        )
        if (rosterEntry) {
          const vMap = violationsBySession(snapshot.violations)
          setSelectedStudent((prev) =>
            prev && prev.sessionId === selectedStudent.sessionId
              ? {
                  ...rosterEntryToSeat(rosterEntry, vMap.get(selectedStudent.sessionId) || []),
                  sessionStatus: rosterEntry.status,
                  violations: nextViolations,
                }
              : prev,
          )
        }
      } catch (err) {
        setDismissError(err?.message || 'Could not mark as false positive.')
      } finally {
        setDismissingLogId(null)
      }
    },
    [activeExam, selectedStudent, applyMonitoringData],
  )

  useEffect(() => {
    let cancelled = false
    async function loadActiveExam() {
      try {
        if (classIdParam && examIdParam) {
          const data = await fetchTeacherMonitoringSnapshot(classIdParam, examIdParam)
          if (cancelled) return
          if (data.exam) {
            const exam = {
              id: data.exam.id,
              classId: Number(classIdParam),
              title: data.exam.title,
              status: data.exam.status,
              code: data.exam.code,
              scheduledStart: data.exam.scheduledStart,
              scheduledEnd: data.exam.scheduledEnd,
              openedAt: data.exam.openedAt,
              updatedAt: data.exam.updatedAt,
            }
            setActiveExam(exam)
            applyMonitoringData(data, exam)
          } else {
            setActiveExam(null)
          }
          return
        }

        const data = await fetchTeacherActiveMonitoring()
        if (cancelled) return
        if (data.activeExam) {
          setActiveExam(data.activeExam)
          applyMonitoringData(data, data.activeExam)
        } else {
          setActiveExam(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Detections] Failed to fetch active exam:', err)
          setActiveExam(null)
        }
      } finally {
        if (!cancelled) setMonitoringReady(true)
      }
    }
    loadActiveExam()
    return () => {
      cancelled = true
    }
  }, [applyMonitoringData, classIdParam, examIdParam])

  useEffect(() => {
    if (!activeExam?.classId || !activeExam?.id) return undefined

    const streamUrl = `/api/teacher/classes/${encodeURIComponent(activeExam.classId)}/exams/${encodeURIComponent(activeExam.id)}/monitoring/stream`
    let es = null
    let fallbackTimer = null

    function startFallbackPoll() {
      if (fallbackTimer) return
      fallbackTimer = window.setInterval(() => refreshSessions(activeExam), 8000)
    }

    if (typeof EventSource !== 'undefined') {
      es = new EventSource(streamUrl)
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data?.ok !== false) {
            applyMonitoringData(data, activeExam)
          }
        } catch (err) {
          console.error('[Detections] SSE parse error:', err)
        }
      }
      es.onerror = () => {
        es?.close()
        es = null
        startFallbackPoll()
      }
    } else {
      startFallbackPoll()
    }

    return () => {
      es?.close()
      if (fallbackTimer) window.clearInterval(fallbackTimer)
    }
  }, [activeExam, refreshSessions, applyMonitoringData])

  const isLive = Boolean(monitoringReady && activeExam)
  const isClassroomView = (seatSettings.viewMode ?? VIEW_MODES.CLASSROOM) !== VIEW_MODES.LIST
  const presentStudents = students.filter((s) => s.tone !== 'empty')
  const sortedListStudents = useMemo(
    () => presentStudents.slice().sort(compareListStudents),
    [presentStudents],
  )

  const filteredListStudents = useMemo(
    () => sortedListStudents.filter((s) => studentMatchesListSearch(s, listSearchQuery)),
    [sortedListStudents, listSearchQuery],
  )

  const listViolatorCount = useMemo(
    () => sortedListStudents.filter(isViolator).length,
    [sortedListStudents],
  )
  const countByTone = (tone) => (isLive ? presentStudents.filter((s) => s.tone === tone).length : null)
  const countDone = () =>
    isLive ? presentStudents.filter((s) => isDoneTone(s.tone)).length : null

  const examSubtitle = activeExam
    ? `${activeExam.title}${activeExam.className ? ` · ${activeExam.className}` : ''}`
    : ''

  const statValue = (n) => String(n)

  // Reusable node renderer to safely display seats without duplicating the entire JSX block
  const renderSeatNode = (student, idx, isWalkwayCol) => {
    const isEmpty = student.tone === 'empty'
    const initials = !isEmpty ? seatInitials(student) : ''
    const tone = student.tone
    const isDragging = dragSourceIdx === idx
    const isDropTarget = dragOverIdx === idx && dragSourceIdx != null && dragSourceIdx !== idx

    return (
      <React.Fragment key={`seat-${idx}-${student.id}`}>
        {isWalkwayCol ? <div className="acsis-detections-walkway" aria-hidden /> : null}
        <div
          role={isEmpty ? undefined : 'button'}
          tabIndex={isEmpty ? undefined : 0}
          draggable={!isEmpty}
          style={{ animationDelay: `${0.1 + (idx % 20) * 0.02}s` }}
          className={`acsis-animate-seat acsis-detections-seat ${seatModifier(tone)}${isDragging ? ' acsis-detections-seat--dragging' : ''}${isDropTarget ? ' acsis-detections-seat--drop-target' : ''}${!isEmpty ? ' acsis-detections-seat--draggable' : ''}`}
          title={
            isEmpty
              ? 'Drop student here'
              : `${statusLabelForTone(tone)} — drag to move seat`
          }
          onDragStart={(e) => {
            if (isEmpty) return
            e.dataTransfer.setData('text/plain', String(idx))
            e.dataTransfer.effectAllowed = 'move'
            setDragSourceIdx(idx)
          }}
          onDragEnd={() => {
            setDragSourceIdx(null)
            setDragOverIdx(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (dragSourceIdx !== idx) setDragOverIdx(idx)
          }}
          onDragLeave={() => {
            setDragOverIdx((prev) => (prev === idx ? null : prev))
          }}
          onDrop={(e) => {
            e.preventDefault()
            const from = Number(e.dataTransfer.getData('text/plain'))
            if (!Number.isNaN(from)) handleSeatDrop(from, idx)
          }}
          onClick={() => {
            if (dragMovedRef.current) {
              dragMovedRef.current = false
              return
            }
            if (!isEmpty) openStudentDetail(student)
          }}
          onKeyDown={(e) => {
            if (!isEmpty && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              openStudentDetail(student)
            }
          }}
        >
          {!isEmpty ? (
            <>
              <div className="acsis-detections-seat__top">
                <div className={`acsis-detections-seat__avatar acsis-detections-seat__avatar--${tone}`}>
                  {student.avatarUrl ? (
                    <img src={student.avatarUrl} alt={initials} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    initials
                  )}
                </div>
                {student.strikes > 0 ? (
                  <span
                    className="acsis-detections-seat__strikes"
                    title={`${student.strikes} / ${MAX_EXAM_WARNINGS} warnings`}
                  >
                    {student.strikes}/{MAX_EXAM_WARNINGS}
                  </span>
                ) : null}
              </div>
              <div className="acsis-detections-seat__identity min-w-0">
                {student.lastName ? (
                  <div className="acsis-detections-seat__last">{student.lastName}</div>
                ) : null}
                <div className="acsis-detections-seat__name">
                  {student.firstName || 'Student'}
                </div>
              </div>
              {tone === 'submitted' && student.strikes > 0 ? (
                <span
                  className="acsis-detections-seat__badge acsis-detections-seat__badge--submitted-warn"
                  title="Submitted with warnings"
                >
                  {student.strikes} warning{student.strikes === 1 ? '' : 's'}
                </span>
              ) : null}
            </>
          ) : (
            <span className="acsis-detections-seat__empty-label">Empty</span>
          )}
        </div>
      </React.Fragment>
    )
  }

  return (
    <div 
      ref={pageContainerRef}
      className={`acsis-detections-live acsis-view bg-background ${isFullscreen ? 'w-screen h-screen overflow-auto p-6 sm:p-10 select-none' : ''}`} 
      aria-busy={!monitoringReady}
    >
      
      {/* Unclipped, Fixed Floating Controller Panel exclusively for True Fullscreen mode */}
      {isFullscreen && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 bg-background/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-2xl border border-border"
          style={{ zoom: 1 }}
        >
          <button 
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`flex items-center gap-2 px-4 py-1.5 font-semibold rounded-full transition-all text-xs uppercase tracking-wider shadow-sm ${
              isAutoScrolling 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground'
            }`}
          >
            {isAutoScrolling ? <Pause className="w-3.5 h-3.5"/> : <Play className="w-3.5 h-3.5"/>}
            {isAutoScrolling ? 'Pause Scroll' : 'Auto-Scroll'}
          </button>
          
          <div className="w-px h-5 bg-border" />
          
          <button 
            onClick={toggleNativeFullscreen}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all text-xs uppercase tracking-wider shadow-sm"
          >
            <Minimize className="w-3.5 h-3.5" />
            Exit Full Screen
          </button>
        </div>
      )}

      {/* Top Details Panel (only rendered when NOT in native full screen) */}
      {!isFullscreen && (
        <div className="container" style={{ padding: 0 }}>
          {activeExam ? (
          <div className="panel acsis-detections-panel">
            <div className="acsis-detections-panel__row">
              <div className="acsis-detections-panel__intro">
                <div className="acsis-detections-header__title-row">
                  <span
                    className={`acsis-detections-live-dot${isLive ? ' acsis-detections-live-dot--live' : ' acsis-detections-live-dot--idle'}`}
                    aria-hidden
                  />
                  <h1 className="acsis-detections-header__title">Live Monitoring</h1>
                </div>
                <p className="acsis-detections-header__exam">{examSubtitle}</p>
              </div>

              <div className="acsis-detections-header__stats">
                <FadeIn delay={0.05} className="acsis-detections-stat acsis-detections-stat--absent">
                  <span className="acsis-detections-stat__value">{statValue(countByTone('absent'))}</span>
                  <span className="acsis-detections-stat__label">Not joined</span>
                </FadeIn>
                <FadeIn delay={0.1} className="acsis-detections-stat acsis-detections-stat--ongoing">
                  <span className="acsis-detections-stat__value">{statValue(countByTone('ongoing'))}</span>
                  <span className="acsis-detections-stat__label">Active</span>
                </FadeIn>
                <FadeIn delay={0.15} className="acsis-detections-stat acsis-detections-stat--warn1">
                  <span className="acsis-detections-stat__value">{statValue(countByTone('warn1'))}</span>
                  <span className="acsis-detections-stat__label">1 warning</span>
                </FadeIn>
                <FadeIn delay={0.2} className="acsis-detections-stat acsis-detections-stat--warn2">
                  <span className="acsis-detections-stat__value">{statValue(countByTone('warn2'))}</span>
                  <span className="acsis-detections-stat__label">2 warnings</span>
                </FadeIn>
                <FadeIn delay={0.25} className="acsis-detections-stat acsis-detections-stat--warn3">
                  <span className="acsis-detections-stat__value">{statValue(countByTone('warn3'))}</span>
                  <span className="acsis-detections-stat__label">3 warnings</span>
                </FadeIn>
                <FadeIn delay={0.3} className="acsis-detections-stat acsis-detections-stat--submitted">
                  <span className="acsis-detections-stat__value">{statValue(countDone())}</span>
                  <span className="acsis-detections-stat__label">Done</span>
                </FadeIn>
                <ExamTimer activeExam={activeExam} />
                
                <FadeIn delay={0.4} className="flex items-center ml-2">
                  <button
                    onClick={toggleNativeFullscreen}
                    className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 font-bold rounded-full transition-all border border-emerald-500/30 shadow-sm hover:shadow-md active:scale-95"
                  >
                    <Maximize className="w-4 h-4" />
                    <span className="text-[10px] sm:text-xs tracking-wider uppercase">Full Screen</span>
                  </button>
                </FadeIn>
              </div>
            </div>
          </div>
          ) : null}

          {!monitoringReady ? (
            <PageSpinner label="Loading monitoring…" />
          ) : !activeExam ? (
            <div className="panel acsis-detections-empty-panel text-center">
              <ShieldAlert className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-4 sm:mb-6" aria-hidden />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">No Active Exams</h2>
              <p className="text-muted-foreground text-base sm:text-lg px-2 m-0">
                Activate an exam from the &apos;My Classes&apos; page to begin live monitoring your students.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {isLive ? (
      <div className={`acsis-detections-body${!isClassroomView ? ' acsis-detections-body--list' : ''}`}>
        {isClassroomView ? (
          <div 
            style={{ 
              zoom: isFullscreen ? 1.15 : 1, 
              transformOrigin: 'top center' 
            }} 
            className={`w-full transition-all flex justify-center overflow-visible ${isFullscreen ? 'pt-28 pb-48' : 'pt-6 pb-12'}`}
          >
            {isFullscreen ? (
              <div className="flex flex-col gap-14 w-full max-w-[1200px] items-center">
                {/* Top Stack: Left 4 Columns */}
                <div 
                  className="acsis-detections-seating"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', width: '100%' }}
                >
                  {students.map((student, idx) => {
                    if (idx % 8 >= 4) return null // Skip right-side columns to render left first
                    return renderSeatNode(student, idx, false)
                  })}
                </div>

                {/* Bottom Stack: Right 4 Columns */}
                <div 
                  className="acsis-detections-seating"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', width: '100%' }}
                >
                  {students.map((student, idx) => {
                    if (idx % 8 < 4) return null // Skip left-side columns
                    return renderSeatNode(student, idx, false)
                  })}
                </div>
              </div>
            ) : (
              <div className="acsis-detections-seating">
                {students.map((student, idx) => {
                  const isWalkwayCol = idx % 8 === 4
                  return renderSeatNode(student, idx, isWalkwayCol)
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="acsis-detections-list-view">
            <div className="acsis-detections-list-view__toolbar">
              <label className="acsis-detections-list-view__search-wrap">
                <Search className="acsis-detections-list-view__search-icon" aria-hidden />
                <input
                  type="search"
                  className="acsis-detections-list-view__search"
                  placeholder="Search by name, ID, or status…"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              {listViolatorCount > 0 && !listSearchQuery.trim() ? (
                <p className="acsis-detections-list-view__hint">
                  {listViolatorCount} student{listViolatorCount === 1 ? '' : 's'} with warnings — shown first
                </p>
              ) : null}
            </div>

            <ul className="acsis-detections-list-view__cards acsis-scroll-y">
              {filteredListStudents.length === 0 ? (
                <li className="acsis-detections-list-view__empty">
                  {listSearchQuery.trim()
                    ? 'No students match your search.'
                    : 'No students in this exam yet.'}
                </li>
              ) : (
                filteredListStudents.map((student, index) => {
                  const prev = filteredListStudents[index - 1]
                  const showDivider =
                    !listSearchQuery.trim() &&
                    prev &&
                    isViolator(prev) &&
                    !isViolator(student)

                  return (
                    <React.Fragment key={student.id}>
                      {showDivider ? (
                        <li className="acsis-detections-list-view__divider" aria-hidden>
                          Other students
                        </li>
                      ) : null}
                      <li>
                        <button
                          type="button"
                          className={`acsis-detections-list-card acsis-detections-list-card--${student.tone}${isViolator(student) ? ' acsis-detections-list-card--violator' : ''}`}
                          onClick={() => openStudentDetail(student)}
                        >
                          <div
                            className={`acsis-detections-list-card__strikes${student.strikes > 0 ? ` acsis-detections-list-card__strikes--${student.tone}` : ' acsis-detections-list-card__strikes--none'}`}
                            aria-label={`${student.strikes} of ${MAX_EXAM_WARNINGS} warnings`}
                          >
                            <span className="acsis-detections-list-card__strikes-value">
                              {student.strikes > 0 ? student.strikes : '—'}
                            </span>
                            <span className="acsis-detections-list-card__strikes-label">
                              /{MAX_EXAM_WARNINGS}
                            </span>
                          </div>
                          <div className="acsis-detections-list-card__body">
                            <span
                              className={`acsis-detections-list-card__avatar acsis-detections-list-card__avatar--${student.tone}`}
                            >
                              {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt={seatInitials(student)} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                seatInitials(student)
                              )}
                            </span>
                            <span className="acsis-detections-list-card__meta">
                              <span className="acsis-detections-list-card__name">
                                {student.lastName ? (
                                  <>
                                    <span className="acsis-detections-list-card__name-last">
                                      {student.lastName}
                                    </span>
                                    {student.firstName ? (
                                      <span className="acsis-detections-list-card__name-first">
                                        , {student.firstName}
                                      </span>
                                    ) : null}
                                  </>
                                ) : (
                                  student.firstName || 'Student'
                                )}
                              </span>
                              <span className="acsis-detections-list-card__sub">
                                {student.schoolId ? (
                                  <span className="acsis-detections-list-card__id">{student.schoolId}</span>
                                ) : null}
                                <span
                                  className={`acsis-detections-list-card__status acsis-detections-list-card__status--${student.tone}`}
                                >
                                  {statusLabelForTone(student.tone)}
                                </span>
                              </span>
                            </span>
                          </div>
                        </button>
                      </li>
                    </React.Fragment>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
      ) : null}

      {selectedStudent ? (
        <div
          className="acsis-detections-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="acsis-detections-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detections-student-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-4 sm:p-6 text-white flex justify-between items-start gap-3 acsis-detections-modal__header acsis-detections-modal__header--${selectedStudent.tone}`}
            >
              <div className="min-w-0">
                <h3 id="detections-student-title" className="text-lg sm:text-2xl font-bold truncate">
                  {selectedStudent.lastName
                    ? `${selectedStudent.lastName}, ${selectedStudent.firstName}`
                    : selectedStudent.firstName}
                </h3>
                <p className="opacity-90 text-sm sm:text-base">{selectedStudent.schoolId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-6 h-6" aria-hidden />
              </button>
            </div>

            <div className="acsis-detections-modal__body">
              <div className="acsis-detections-modal__summary">
                <div>
                  <div className="acsis-detections-modal__label">Current status</div>
                  <div className={`acsis-detections-modal__status acsis-detections-modal__status--${selectedStudent.tone}`}>
                    {statusLabelForTone(selectedStudent.tone)}
                  </div>
                </div>
                <div className="acsis-detections-modal__strikes-block">
                  <div className="acsis-detections-modal__label">Warnings</div>
                  <div className="acsis-detections-modal__strikes-value">
                    {selectedStudent.strikes} / {MAX_EXAM_WARNINGS}
                  </div>
                </div>
              </div>

              <div className="acsis-detections-modal__violations">
                <h4 className="acsis-detections-modal__violations-title">Violation log</h4>
                <p className="acsis-detections-modal__violations-hint">
                  Mark a detection as false positive to remove one warning and unlock the student if they
                  were locked for max warnings.
                </p>
                {dismissError ? (
                  <p className="acsis-detections-modal__error" role="alert">
                    {dismissError}
                  </p>
                ) : null}
                {selectedStudent.violations?.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedStudent.violations.map((v) => {
                      const dismissed = Boolean(v.dismissedAt)
                      const label = typeof v === 'string' ? v : v.label
                      const logId = typeof v === 'object' && v.id != null ? v.id : null
                      return (
                        <li
                          key={logId ?? label}
                          className={`acsis-detections-violation${dismissed ? ' acsis-detections-violation--dismissed' : ''}`}
                        >
                          <div className="acsis-detections-violation__main">
                            <AlertTriangle
                              className={`w-4 h-4 mt-0.5 shrink-0 acsis-detections-modal__violation-icon acsis-detections-modal__violation-icon--${selectedStudent.tone}`}
                              aria-hidden
                            />
                            <span className="acsis-detections-violation__text">{label}</span>
                          </div>
                          {dismissed ? (
                            <span className="acsis-detections-violation__badge">False positive</span>
                          ) : logId ? (
                            <button
                              type="button"
                              className="acsis-detections-violation__dismiss"
                              disabled={dismissingLogId === logId}
                              onClick={() => handleDismissViolation(v)}
                            >
                              {dismissingLogId === logId ? 'Saving…' : 'Mark false positive'}
                            </button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="acsis-detections-modal__empty">No suspicious activity detected.</p>
                )}
              </div>
            </div>

            <div className="acsis-detections-modal__footer">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="acsis-detections-modal__close-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}