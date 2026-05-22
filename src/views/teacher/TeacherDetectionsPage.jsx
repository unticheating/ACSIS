import React, { useCallback, useEffect, useState } from 'react'
import { Clock, AlertTriangle, ShieldAlert, MonitorPlay, X } from 'lucide-react'
import { apiFetch } from '@/lib/apiFetch.js'
import {
  fetchTeacherExamResults,
  fetchTeacherExamSessionDetail,
} from '@/lib/teacherExamResultsApi.js'
import '../../styles/teacher-detections-live.css'

const SEAT_COUNT = 40

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

function sessionToSeat(session, violationLabels = []) {
  const { firstName, lastName } = splitName(session.studentName)
  const strikes = Number(session.warningCount || 0)
  let status = 'good'
  if (session.status === 'submitted') status = 'good'
  else if (strikes >= 3) status = 'void'
  else if (strikes >= 1) status = 'warning'
  return {
    id: `session-${session.sessionId}`,
    sessionId: session.sessionId,
    sessionStatus: session.status,
    firstName,
    lastName,
    schoolId: session.schoolId || '',
    status,
    strikes,
    violations: violationLabels,
  }
}

function buildSeatGrid(sessions, vMap) {
  const seats = sessions.map((s) => sessionToSeat(s, vMap.get(s.sessionId) || []))
  while (seats.length < SEAT_COUNT) {
    seats.push({ id: `empty-${seats.length}`, status: 'empty', strikes: 0, violations: [] })
  }
  return seats.slice(0, SEAT_COUNT)
}

function seatModifier(status) {
  if (status === 'empty') return 'acsis-detections-seat--empty'
  if (status === 'void') return 'acsis-detections-seat--void'
  if (status === 'warning') return 'acsis-detections-seat--warning'
  return 'acsis-detections-seat--good'
}

export default function TeacherDetectionsPage() {
  const [seconds, setSeconds] = useState(0)
  const [activeExam, setActiveExam] = useState(null)
  const [students, setStudents] = useState(() => buildSeatGrid([]))
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [violationTotal, setViolationTotal] = useState(0)

  const refreshSessions = useCallback(async (exam) => {
    if (!exam?.classId || !exam?.id) return
    try {
      const data = await fetchTeacherExamResults(exam.classId, exam.id)
      const joined = (data.sessions || []).filter(
        (s) => s.status === 'in_progress' || s.status === 'submitted',
      )
      const vMap = violationsBySession(data.violations)
      setViolationTotal((data.violations || []).length)
      setStudents(buildSeatGrid(joined, vMap))
    } catch (err) {
      console.error('[Detections] Failed to load sessions:', err)
    }
  }, [])

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
    async function findActiveExam() {
      try {
        const res = await apiFetch('/api/teacher/classes')
        if (!res.ok) return
        const classes = await res.json()
        for (const cls of classes) {
          const exRes = await apiFetch(`/api/teacher/classes/${cls.id}/exams`)
          if (!exRes.ok) continue
          const clsData = await exRes.json()
          const found = (clsData.exams || []).find((e) =>
            ['waiting', 'open'].includes((e.status || '').toLowerCase()),
          )
          if (found) {
            const exam = { ...found, classId: cls.id, className: clsData.name }
            setActiveExam(exam)
            await refreshSessions(exam)
            return
          }
        }
      } catch (err) {
        console.error('[Detections] Failed to fetch active exam:', err)
      }
    }
    findActiveExam()
  }, [refreshSessions])

  useEffect(() => {
    if (!activeExam?.classId || !activeExam?.id) return undefined
    const interval = window.setInterval(() => refreshSessions(activeExam), 5000)
    return () => window.clearInterval(interval)
  }, [activeExam, refreshSessions])

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (totalSeconds) => {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const s = String(totalSeconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

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

  const presentStudents = students.filter((s) => s.status !== 'empty')
  const warnings = presentStudents.filter((s) => s.status === 'warning').length
  const voids = presentStudents.filter((s) => s.status === 'void').length

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
            <p className="acsis-detections-header__exam">{activeExam.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              {students.filter((s) => s.status !== 'empty').length} student(s) joined · {violationTotal}{' '}
              violation log(s). Events are recorded when students leave the tab during a live exam.
            </p>
          </div>

          <div className="acsis-detections-header__stats">
            <div className="acsis-detections-stat acsis-detections-stat--warnings">
              <span className="acsis-detections-stat__value">{warnings}</span>
              <span className="acsis-detections-stat__label">Warnings</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--voids">
              <span className="acsis-detections-stat__value">{voids}</span>
              <span className="acsis-detections-stat__label">Voided</span>
            </div>
            <div className="acsis-detections-stat acsis-detections-stat--timer">
              <Clock className="w-5 h-5 text-gray-400 shrink-0" aria-hidden />
              <span className="acsis-detections-stat__timer">{formatTime(seconds)}</span>
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

        <div className="acsis-detections-seating">
          {students.map((student, idx) => {
            const isWalkwayCol = idx % 8 === 4
            const isEmpty = student.status === 'empty'
            const initials = !isEmpty ? `${student.firstName[0]}${student.lastName[0]}` : ''

            return (
              <React.Fragment key={student.id}>
                {isWalkwayCol ? <div className="acsis-detections-walkway" aria-hidden /> : null}
                <div
                  role={isEmpty ? undefined : 'button'}
                  tabIndex={isEmpty ? undefined : 0}
                  className={`acsis-detections-seat ${seatModifier(student.status)}`}
                  onClick={() => {
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
                        <div
                          className={`acsis-detections-seat__avatar ${
                            student.status === 'void'
                              ? 'bg-red-200 text-red-800'
                              : student.status === 'warning'
                                ? 'bg-orange-200 text-orange-800'
                                : 'bg-green-200 text-green-800'
                          }`}
                        >
                          {initials}
                        </div>
                        {student.status === 'void' ? (
                          <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" aria-hidden />
                        ) : student.status === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" aria-hidden />
                        ) : (
                          <div className="w-3 h-3 bg-green-500 rounded-full shrink-0" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="acsis-detections-seat__name">{student.firstName}</div>
                        <div className="acsis-detections-seat__last">{student.lastName}</div>
                      </div>
                      {(student.status === 'warning' || student.status === 'void') && (
                        <span className="acsis-detections-seat__strikes">
                          {student.strikes} {student.strikes === 1 ? 'strike' : 'strikes'}
                        </span>
                      )}
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
              className={`p-4 sm:p-6 text-white flex justify-between items-start gap-3 ${
                selectedStudent.status === 'void'
                  ? 'bg-red-600'
                  : selectedStudent.status === 'warning'
                    ? 'bg-orange-500'
                    : 'bg-green-600'
              }`}
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
                  <div
                    className={`font-bold text-base sm:text-lg ${
                      selectedStudent.status === 'void'
                        ? 'text-red-600'
                        : selectedStudent.status === 'warning'
                          ? 'text-orange-600'
                          : 'text-green-600'
                    }`}
                  >
                    {selectedStudent.status === 'void'
                      ? 'Exam Voided'
                      : selectedStudent.status === 'warning'
                        ? 'Warning Issued'
                        : 'Doing Well'}
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
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            selectedStudent.status === 'void' ? 'text-red-500' : 'text-orange-500'
                          }`}
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
