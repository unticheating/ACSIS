import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Clock3, LogIn, Search, UserCheck2, BookPlus, Play, SquarePen, GraduationCap, FileCheck2 } from 'lucide-react'
import FadeIn from '@/components/ui/fade-in.jsx'
import { fetchTeacherActivityLogs } from '@/lib/teacherExamResultsApi.js'
import '../../pages/teacher-ui/reports.css'

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

function labelForEvent(eventType) {
  if (eventType === 'teacher_login') return 'Teacher logged in'
  if (eventType === 'class_created') return 'Class created'
  if (eventType === 'class_updated') return 'Class updated'
  if (eventType === 'class_deleted') return 'Class deleted'
  if (eventType === 'exam_created') return 'Exam created'
  if (eventType === 'exam_published') return 'Exam published'
  if (eventType === 'exam_started') return 'Exam started'
  if (eventType === 'exam_restarted') return 'Exam restarted'
  if (eventType === 'exam_ended') return 'Exam ended'
  if (eventType === 'scores_released') return 'Scores released'
  if (eventType === 'exam_assigned') return 'Exam assigned'
  if (eventType === 'student_enrolled') return 'Student enrolled'
  if (eventType === 'student_detected') return 'Student detected'
  return String(eventType || 'Activity').replace(/_/g, ' ')
}

function iconForEvent(eventType) {
  if (eventType === 'teacher_login') return LogIn
  if (eventType === 'class_created') return BookPlus
  if (eventType === 'class_updated') return SquarePen
  if (eventType === 'exam_created') return GraduationCap
  if (eventType === 'exam_published' || eventType === 'exam_started' || eventType === 'exam_restarted') return Play
  if (eventType === 'scores_released') return FileCheck2
  if (eventType === 'exam_assigned') return UserCheck2
  if (eventType === 'student_enrolled') return UserCheck2
  return CircleAlert
}

export default function TeacherActivityLogsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await fetchTeacherActivityLogs(60)
        if (!cancelled) setLogs(Array.isArray(data.logs) ? data.logs : [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load activity logs.')
          setLogs([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const timer = window.setInterval(load, 8000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((log) => {
      const haystack = [
        labelForEvent(log.eventType),
        log.details,
        log.className,
        log.examTitle,
        log.studentName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [logs, query])

  return (
    <div className="acsis-view reports-page">
      <div className="container" style={{ padding: 0 }}>
        <FadeIn className="panel" delay={0.05}>
          <div className="exam-title-row">
            <div>
              <h2>Teacher activity logs</h2>
                <p>Important teacher events are shown here: logins, class changes, exam lifecycle events, assignments, enrollments, and detections.</p>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logins, detections, exams, or students"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
        </FadeIn>

        {error ? <p className="px-1 text-sm text-red-600" role="alert">{error}</p> : null}
        {loading && logs.length === 0 ? <p className="px-1 text-sm text-muted-foreground">Loading activity logs…</p> : null}

        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <FadeIn className="panel py-8 text-center text-sm text-muted-foreground" delay={0.1}>
              No activity logs found.
            </FadeIn>
          ) : (
            filteredLogs.map((log, index) => {
              const Icon = iconForEvent(log.eventType)
              return (
                <FadeIn key={log.id} delay={0.08 + index * 0.03} className="panel">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="m-0 text-base font-semibold text-foreground">{labelForEvent(log.eventType)}</h3>
                        <span className="text-xs text-muted-foreground">{formatTime(log.occurredAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {log.details || 'No additional details recorded.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {log.className ? <span className="rounded-full bg-muted px-2 py-1">{log.className}</span> : null}
                        {log.examTitle ? <span className="rounded-full bg-muted px-2 py-1">{log.examTitle}</span> : null}
                        {log.studentName ? <span className="rounded-full bg-muted px-2 py-1">{log.studentName}</span> : null}
                      </div>
                    </div>
                    <Clock3 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </div>
                </FadeIn>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}