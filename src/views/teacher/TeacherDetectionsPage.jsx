import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, AlertTriangle, ShieldAlert, MonitorPlay, X } from 'lucide-react'
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
} from '@/lib/detectionsSeatLayout.js'
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

/** Seat color: absent | submitted | ongoing | warn1 | warn2 | warn3 */
function resolveSeatTone(entry) {
  if (!entry.joined) return 'absent'
  const strikes = Number(entry.warningCount || 0)
  if (entry.status === 'submitted') return 'submitted'
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
    warn3: 'Max warnings (3+)',
    submitted: 'Exam submitted',
  }
  return map[tone] || tone
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
  const [activeExam, setActiveExam] = useState(null)
  const [clockTick, setClockTick] = useState(0)
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [dragSourceIdx, setDragSourceIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [seatSettings, setSeatSettings] = useState(() => ({ ...DEFAULT_SEAT_SETTINGS }))
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

  const { setToolbar } = useDetectionsToolbar() || {}

  useEffect(() => {
    if (!setToolbar || !activeExam) {
      setToolbar?.(null)
      return undefined
    }
    setToolbar({
      seatSettings,
      onFillModeChange: handleFillModeChange,
    })
    return () => setToolbar(null)
  }, [activeExam, seatSettings, handleFillModeChange, setToolbar])

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
    async function loadActiveExam() {
      try {
        const data = await fetchTeacherActiveMonitoring()
        if (!data.activeExam) return
        setActiveExam(data.activeExam)
        applyMonitoringData(data, data.activeExam)
      } catch (err) {
        console.error('[Detections] Failed to fetch active exam:', err)
      }
    }
    loadActiveExam()
  }, [applyMonitoringData])

  useEffect(() => {
    if (!activeExam?.classId || !activeExam?.id) return undefined
    const interval = window.setInterval(() => refreshSessions(activeExam), 5000)
    return () => window.clearInterval(interval)
  }, [activeExam, refreshSessions])

  useEffect(() => {
    if (!activeExam) return undefined
    const interval = window.setInterval(() => setClockTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [activeExam])

  const examTime = useMemo(
    () => computeExamTimeDisplay(activeExam),
    [activeExam, clockTick],
  )

  if (!activeExam) {
    return (
      <div className="acsis-detections-live acsis-detections-live--empty acsis-view">
        <div className="flex items-center gap-3 mb-6">
          <MonitorPlay className="w-8 h-8 text-gray-400 shrink-0" aria-hidden />
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 tracking-tight">Live Monitoring</h1>
        </div>
        <div className="acsis-detections-empty-card bg-white rounded-2xl shadow-sm border border-gray-200 text-center max-w-2xl mx-auto">
          <ShieldAlert className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4 sm:mb-6" aria-hidden />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">No Active Exams</h2>
          <p className="text-gray-500 text-base sm:text-lg px-2">
            Activate an exam from the &apos;My Classes&apos; page to begin live monitoring your students.
          </p>
        </div>
      </div>
    )
  }

  const presentStudents = students.filter((s) => s.tone !== 'empty')
  const countByTone = (tone) => presentStudents.filter((s) => s.tone === tone).length

  return (
    <div className="acsis-detections-live acsis-view">
      <header className="acsis-detections-header">
        <div className="acsis-detections-header__inner">
          <div className="acsis-detections-header__intro">
            <div className="acsis-detections-header__title-row">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <h1 className="acsis-detections-header__title">Live Monitoring</h1>
            </div>
            <p className="acsis-detections-header__exam">
              {activeExam.title}
              {activeExam.className ? ` · ${activeExam.className}` : ''}
            </p>
          </div>

          <div className="acsis-detections-header__stats">
            <div className="acsis-detections-stat acsis-detections-stat--absent">
              <span className="acsis-detections-stat__value">{countByTone('absent')}</span>
              <span className="acsis-detections-stat__label">Not joined</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--ongoing">
              <span className="acsis-detections-stat__value">{countByTone('ongoing')}</span>
              <span className="acsis-detections-stat__label">Active</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--warn1">
              <span className="acsis-detections-stat__value">{countByTone('warn1')}</span>
              <span className="acsis-detections-stat__label">1 warn</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--warn2">
              <span className="acsis-detections-stat__value">{countByTone('warn2')}</span>
              <span className="acsis-detections-stat__label">2 warns</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--warn3">
              <span className="acsis-detections-stat__value">{countByTone('warn3')}</span>
              <span className="acsis-detections-stat__label">3 warns</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--submitted">
              <span className="acsis-detections-stat__value">{countByTone('submitted')}</span>
              <span className="acsis-detections-stat__label">Done</span>
            </div>
            <div
              className={`acsis-detections-stat acsis-detections-stat--timer${examTime.isLow ? ' acsis-detections-stat--timer-low' : ''}`}
            >
              <span className="acsis-detections-stat__value acsis-detections-stat__timer">
                <Clock className="acsis-detections-stat__clock" aria-hidden />
                {examTime.display}
              </span>
              <span className="acsis-detections-stat__label">{examTime.label}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="acsis-detections-body">
        <div className="acsis-detections-board w-full bg-white border-4 border-gray-300 rounded-lg shadow-sm flex items-center justify-center relative box-border">
          <div className="absolute top-full w-full h-4 flex justify-around px-8 opacity-20 pointer-events-none" aria-hidden>
            <div className="w-2 h-full bg-gray-400" />
            <div className="w-2 h-full bg-gray-400" />
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-gray-400 tracking-wide sm:tracking-widest uppercase text-center px-2 py-3">
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
                <div
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
                      </div>
                      <div className="min-w-0">
                        <div className="acsis-detections-seat__name">{student.firstName}</div>
                        <div className="acsis-detections-seat__last">{student.lastName}</div>
                      </div>
                    </>
                  ) : (
                    <span className="acsis-detections-seat__empty-label">Empty</span>
                  )}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

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
