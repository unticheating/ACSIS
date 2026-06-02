import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, AlertTriangle, Search, ShieldAlert, X } from 'lucide-react'
import { useDetectionsToolbar } from '@/context/DetectionsToolbarContext.jsx'
import {
  fetchTeacherActiveMonitoring,
  fetchTeacherExamSessionDetail,
  fetchTeacherMonitoringSnapshot,
} from '@/lib/teacherExamResultsApi.js'
import { MAX_EXAM_WARNINGS } from '@/lib/examAntiCheat.js'
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
import '../../pages/teacher-ui/reports.css'
import '../../styles/teacher-detections-live.css'

function splitName(fullName) {
  const parts = String(fullName || 'Student').trim().split(/\s+/)
  if (parts.length < 2) return { firstName: parts[0] || 'Student', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function formatViolationEntry(v) {
  const when = v.occurredAt ? new Date(v.occurredAt).toLocaleTimeString() : ''
  const detail = v.details ? ` — ${v.details}` : ''
  return `${v.eventType || 'event'}${detail}${when ? ` (${when})` : ''}`
}

function violationsBySession(violations) {
  const map = new Map()
  for (const v of violations || []) {
    const sid = v.sessionId
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid).push(formatViolationEntry(v))
  }
  return map
}

/**
 * Seat color: absent | ongoing | warn1 | warn2 | warn3 | submitted | done-warn3
 * Auto-submit at 3 warnings → done-warn3 (red, still counts as Done).
 */
function resolveSeatTone(entry) {
  if (!entry.joined) return 'absent'
  const strikes = Number(entry.warningCount || 0)
  if (strikes >= MAX_EXAM_WARNINGS) {
    return entry.status === 'submitted' ? 'done-warn3' : 'warn3'
  }
  if (entry.status === 'submitted') return 'submitted'
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
    warn3: '3 warnings — auto-submit pending',
    'done-warn3': 'Auto-submitted (3 warnings)',
    submitted: 'Exam submitted',
  }
  return map[tone] || tone
}

function isDoneTone(tone) {
  return tone === 'submitted' || tone === 'done-warn3'
}

function isViolator(student) {
  const strikes = Number(student.strikes || 0)
  if (strikes > 0) return true
  return student.tone === 'warn1' || student.tone === 'warn2' || student.tone === 'warn3' || student.tone === 'done-warn3'
}

const VIOLATOR_TONE_RANK = {
  warn3: 0,
  'done-warn3': 0,
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
  const { firstName, lastName } = splitName(entry.studentName)
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
  return (f + l).toUpperCase() || '?'
}

export default function TeacherDetectionsPage() {
  const [searchParams] = useSearchParams()
  const classIdParam = searchParams.get('classId')
  const examIdParam = searchParams.get('examId')

  const [activeExam, setActiveExam] = useState(null)
  const [clockTick, setClockTick] = useState(0)
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [dragSourceIdx, setDragSourceIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [seatSettings, setSeatSettings] = useState(() => ({ ...DEFAULT_SEAT_SETTINGS }))
  const [listSearchQuery, setListSearchQuery] = useState('')
  const dragMovedRef = useRef(false)
  const monitoringRef = useRef(null)

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
      const labels = (detail.violations || []).map((v) => v.label || formatViolationEntry(v))
      setSelectedStudent((prev) =>
        prev && prev.sessionId === student.sessionId
          ? { ...prev, violations: labels.length ? labels : prev.violations }
          : prev,
      )
    } catch (err) {
      console.error('[Detections] session detail:', err)
    }
  }

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

  useEffect(() => {
    if (!activeExam) return undefined
    const interval = window.setInterval(() => setClockTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [activeExam])

  const examTime = useMemo(
    () => (activeExam ? computeExamTimeDisplay(activeExam) : null),
    [activeExam, clockTick],
  )

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

  const examSubtitle = !monitoringReady
    ? 'Loading…'
    : activeExam
      ? `${activeExam.title}${activeExam.className ? ` · ${activeExam.className}` : ''}`
      : 'No active exam — activate one from My Classes'

  const statValue = (n) => (n == null ? '—' : String(n))

  return (
    <div className="acsis-detections-live acsis-view" aria-busy={!monitoringReady}>
      <div className="container" style={{ padding: 0 }}>
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
                <span className="acsis-detections-stat__label">1 warn</span>
              </FadeIn>
              <FadeIn delay={0.2} className="acsis-detections-stat acsis-detections-stat--warn2">
                <span className="acsis-detections-stat__value">{statValue(countByTone('warn2'))}</span>
                <span className="acsis-detections-stat__label">2 warns</span>
              </FadeIn>
              <FadeIn delay={0.25} className="acsis-detections-stat acsis-detections-stat--warn3">
                <span className="acsis-detections-stat__value">{statValue(countByTone('warn3'))}</span>
                <span className="acsis-detections-stat__label">3 warns</span>
              </FadeIn>
              <FadeIn delay={0.3} className="acsis-detections-stat acsis-detections-stat--submitted">
                <span className="acsis-detections-stat__value">{statValue(countDone())}</span>
                <span className="acsis-detections-stat__label">Done</span>
              </FadeIn>
              <FadeIn
                delay={0.35}
                className={`acsis-detections-stat acsis-detections-stat--timer${examTime?.isLow ? ' acsis-detections-stat--timer-low' : ''}`}
              >
                <span className="acsis-detections-stat__value acsis-detections-stat__timer">
                  <Clock className="acsis-detections-stat__clock" aria-hidden />
                  {examTime?.display ?? '--:--'}
                </span>
                <span className="acsis-detections-stat__label">{examTime?.label ?? 'Time'}</span>
              </FadeIn>
            </div>
          </div>
        </div>

        {monitoringReady && !activeExam ? (
          <div className="panel acsis-detections-empty-panel text-center">
            <ShieldAlert className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-4 sm:mb-6" aria-hidden />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">No Active Exams</h2>
            <p className="text-muted-foreground text-base sm:text-lg px-2 m-0">
              Activate an exam from the &apos;My Classes&apos; page to begin live monitoring your students.
            </p>
          </div>
        ) : null}
      </div>

      {isLive ? (
      <div className={`acsis-detections-body${!isClassroomView ? ' acsis-detections-body--list' : ''}`}>
        {isClassroomView ? (
          <>
        <div className="acsis-detections-board w-full flex items-start justify-center relative box-border pt-1 sm:pt-2">
          <div className="absolute top-full w-full h-4 flex justify-around px-8 opacity-20 pointer-events-none" aria-hidden>
            <div className="w-2 h-full bg-muted-foreground/40" />
            <div className="w-2 h-full bg-muted-foreground/40" />
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-muted-foreground tracking-wide sm:tracking-widest uppercase text-center px-2 py-3">
            Front of Classroom
          </h2>
        </div>

        <p className="acsis-detections-drag-hint">Drag a student to another seat to match your classroom layout.</p>

        <div className="acsis-detections-seating">
          {students.map((student, idx) => {
            const isWalkwayCol = idx % 8 === 4
            const isEmpty = student.tone === 'empty'
            const initials = !isEmpty ? seatInitials(student) : ''
            const tone = student.tone
            const isDragging = dragSourceIdx === idx
            const isDropTarget = dragOverIdx === idx && dragSourceIdx != null && dragSourceIdx !== idx

            return (
              <React.Fragment key={`seat-${idx}-${student.id}`}>
                {isWalkwayCol ? <div className="acsis-detections-walkway" aria-hidden /> : null}
                <FadeIn
                  delay={0.1 + idx * 0.02}
                  role={isEmpty ? undefined : 'button'}
                  tabIndex={isEmpty ? undefined : 0}
                  draggable={!isEmpty}
                  className={`acsis-detections-seat ${seatModifier(tone)}${isDragging ? ' acsis-detections-seat--dragging' : ''}${isDropTarget ? ' acsis-detections-seat--drop-target' : ''}${!isEmpty ? ' acsis-detections-seat--draggable' : ''}`}
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
                          {initials}
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
                      <div className="min-w-0">
                        <div className="acsis-detections-seat__name">{student.firstName}</div>
                        <div className="acsis-detections-seat__last">{student.lastName}</div>
                      </div>
                      {tone === 'done-warn3' ? (
                        <span className="acsis-detections-seat__badge acsis-detections-seat__badge--auto">
                          Auto-submitted
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="acsis-detections-seat__empty-label">Empty</span>
                  )}
                </FadeIn>
              </React.Fragment>
            )
          })}
        </div>
          </>
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
                              {seatInitials(student)}
                            </span>
                            <span className="acsis-detections-list-card__meta">
                              <span className="acsis-detections-list-card__name">
                                {student.firstName} {student.lastName}
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
                  {selectedStudent.firstName} {selectedStudent.lastName}
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

            <div className="p-4 sm:p-6">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Current Status</div>
                  <div className={`font-bold text-base sm:text-lg acsis-detections-modal__status acsis-detections-modal__status--${selectedStudent.tone}`}>
                    {statusLabelForTone(selectedStudent.tone)}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-sm text-gray-500 font-medium mb-1">Strikes</div>
                  <div className="font-bold text-xl text-gray-900">{selectedStudent.strikes} / 3</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Violation Log</h4>
                {selectedStudent.violations?.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedStudent.violations.map((v, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100"
                      >
                        <AlertTriangle
                          className={`w-4 h-4 mt-0.5 shrink-0 acsis-detections-modal__violation-icon acsis-detections-modal__violation-icon--${selectedStudent.tone}`}
                          aria-hidden
                        />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                    No suspicious activity detected.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors min-h-[44px]"
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






