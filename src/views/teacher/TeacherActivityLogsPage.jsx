import { useEffect, useMemo, useState } from 'react'
import { Search, ActivitySquare, AlertCircle } from 'lucide-react'
import FadeIn from '@/components/ui/fade-in.jsx'
import { fetchTeacherActivityLogs } from '@/lib/teacherExamResultsApi.js'
import { formatSectionTitle } from '@/lib/sectionLabel.js'
import '../../pages/teacher-ui/reports.css'

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return '—'
  }
}

function labelForEvent(eventType) {
  if (eventType === 'exam_created') return 'Exam created'
  if (eventType === 'exam_published') return 'Exam published'
  if (eventType === 'exam_started') return 'Exam started'
  if (eventType === 'exam_restarted') return 'Exam restarted'
  if (eventType === 'exam_ended') return 'Exam ended'
  if (eventType === 'scores_released') return 'Scores released'
  if (eventType === 'exam_assigned') return 'Exam assigned'
  if (eventType === 'exam_code_updated') return 'Exam code updated'
  if (eventType === 'exam_deleted') return 'Exam deleted'
  if (eventType === 'answer_corrected') return 'Answer corrected'
  if (eventType === 'violation_dismissed') return 'Violation dismissed'
  return String(eventType || 'Activity').replace(/_/g, ' ')
}

function badgeForEvent(eventType) {
  const label = labelForEvent(eventType);
  let colorClasses = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700/50";
  
  if (['exam_created', 'exam_published', 'exam_started', 'exam_assigned'].includes(eventType)) {
    colorClasses = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40";
  } else if (['exam_ended', 'scores_released'].includes(eventType)) {
    colorClasses = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40";
  } else if (['exam_deleted'].includes(eventType)) {
    colorClasses = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40";
  } else if (['exam_restarted', 'exam_code_updated', 'answer_corrected', 'violation_dismissed'].includes(eventType)) {
    colorClasses = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      {label}
    </span>
  );
}

function classSectionLabel(log) {
  const label = formatSectionTitle({
    programCode: log.programCode,
    sectionCode: log.sectionCode,
  })
  if (label !== 'Section') return label
  return log.className || '—'
}

function detailsLabel(log) {
  const parts = []
  if (log.studentName) parts.push(log.studentName)
  if (log.questionSetTitle) parts.push(`Question set: ${log.questionSetTitle}`)
  if (log.details) parts.push(log.details)
  return parts.join(' · ') || '—'
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
        const data = await fetchTeacherActivityLogs(100)
        if (!cancelled) setLogs(Array.isArray(data.logs) ? data.logs : [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load exam audit logs.')
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
        log.questionSetTitle,
        classSectionLabel(log),
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
        <FadeIn className="pb-6" delay={0.05}>
          <div className="exam-title-row mb-6">
            <div>
              <h2 className="rp-page-title">
                Exam audit logs
              </h2>
              <p className="rp-page-sub">
                A record of actions taken on your exams: starting, ending, restarting, releasing scores,
                correcting answers, and other exam-level changes.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-shadow">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search action, quiz, section, or student..."
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                background: 'transparent',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
              }}
              className="w-full p-0 m-0 placeholder:text-muted-foreground text-foreground"
            />
          </label>
        </FadeIn>

        {error ? (
          <FadeIn delay={0.1}>
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 dark:border-red-900/50 dark:bg-red-900/20">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error loading logs</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </FadeIn>
        ) : null}

        {loading && logs.length === 0 ? (
          <div className="flex items-center gap-3 px-2 py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading exam audit logs…</p>
          </div>
        ) : null}

        {(!loading || logs.length > 0) && !error && (
          <FadeIn className="panel" delay={0.1}>
            {filteredLogs.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-muted-foreground opacity-60" />
                </div>
                <p className="text-base font-semibold text-foreground">No audit logs found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query or check back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm text-muted-foreground border-collapse">
                  <thead className="bg-muted/30 text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 whitespace-nowrap">Time</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">Action</th>
                      <th className="px-5 py-3.5">Quiz</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">Section</th>
                      <th className="px-5 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-muted/30 group">
                        <td className="whitespace-nowrap px-5 py-4 text-foreground font-medium">{formatTime(log.occurredAt)}</td>
                        <td className="px-5 py-4 whitespace-nowrap">{badgeForEvent(log.eventType)}</td>
                        <td className="px-5 py-4 font-medium text-foreground">{log.examTitle || '—'}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                            {classSectionLabel(log)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground min-w-[200px]" title={detailsLabel(log)}>
                          {detailsLabel(log)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FadeIn>
        )}
      </div>
    </div>
  )
}
