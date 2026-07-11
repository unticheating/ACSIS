import { useEffect, useMemo, useState } from 'react'
import { FileText, Search, ScrollText, X } from 'lucide-react'
import FadeIn from '@/components/ui/fade-in.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
import AuditLogDateRangePicker from '@/components/ui/audit-log-date-range.jsx'
import { exportAdminAuditLogs, fetchAdminAuditLogs } from '@/lib/adminMonitoringApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import { formatSectionTitle } from '@/lib/sectionLabel.js'
import '../../pages/teacher-ui/reports.css'

const AUDIT_FETCH_LIMIT = 500

const EVENT_TYPE_OPTIONS = [
  { value: 'user_login', label: 'User login', group: 'Access' },
  { value: 'teacher_login', label: 'Teacher login', group: 'Access' },
  { value: 'exam_created', label: 'Exam created', group: 'Exams' },
  { value: 'exam_published', label: 'Exam published', group: 'Exams' },
  { value: 'exam_assigned', label: 'Exam assigned', group: 'Exams' },
  { value: 'exam_started', label: 'Exam started', group: 'Exams' },
  { value: 'exam_restarted', label: 'Exam restarted', group: 'Exams' },
  { value: 'exam_ended', label: 'Exam ended', group: 'Exams' },
  { value: 'exam_code_updated', label: 'Exam code updated', group: 'Exams' },
  { value: 'exam_deleted', label: 'Exam deleted', group: 'Exams' },
  { value: 'scores_released', label: 'Scores released', group: 'Results' },
  { value: 'answer_corrected', label: 'Answer corrected', group: 'Results' },
  { value: 'violation_dismissed', label: 'Violation dismissed', group: 'Results' },
  { value: 'student_detected', label: 'Student detected', group: 'Monitoring' },
  { value: 'class_created', label: 'Class created', group: 'Classes' },
  { value: 'class_updated', label: 'Class updated', group: 'Classes' },
  { value: 'class_deleted', label: 'Class deleted', group: 'Classes' },
  { value: 'student_enrolled', label: 'Student enrolled', group: 'Enrollment' },
]

const EVENT_TYPE_LABELS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
)

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function labelForEvent(eventType) {
  if (EVENT_TYPE_LABELS[eventType]) return EVENT_TYPE_LABELS[eventType]
  return String(eventType || 'Activity').replace(/_/g, ' ')
}

function badgeForEvent(eventType) {
  const slug = String(eventType || 'unknown')
  return (
    <span className={`exam-audit-logs__badge exam-audit-logs__badge--${slug}`}>
      {labelForEvent(eventType)}
    </span>
  )
}

function classSectionLabel(log) {
  const label = formatSectionTitle({
    programCode: log.programCode,
    sectionCode: log.sectionCode,
  })
  if (label !== 'Section') return label
  return log.className || '—'
}

function sectionFilterKey(log) {
  const label = classSectionLabel(log)
  if (label === '—') return log.classId ? `class:${log.classId}` : ''
  return label
}

function actorLabel(log) {
  if (!log.teacherName) return '—'
  const role = String(log.actorRole || '').trim()
  if (!role) return log.teacherName
  return `${log.teacherName} · ${role}`
}

function detailsLabel(log) {
  const parts = []
  if (log.studentName) parts.push(log.studentName)
  if (log.questionSetTitle) parts.push(`Question set: ${log.questionSetTitle}`)
  if (log.details) parts.push(log.details)
  return parts.join(' · ') || '—'
}

function logInDateRange(occurredAt, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true
  if (!occurredAt) return false
  const at = new Date(occurredAt)
  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00`)
    if (at < from) return false
  }
  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`)
    if (at > to) return false
  }
  return true
}

function hasActiveFilters({ query, eventType, examId, sectionKey, actorMemberId, dateFrom, dateTo }) {
  return Boolean(query.trim() || eventType || examId || sectionKey || actorMemberId || dateFrom || dateTo)
}

export default function AdminAuditTrailPanel() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])
  const [query, setQuery] = useState('')
  const [eventType, setEventType] = useState('')
  const [examId, setExamId] = useState('')
  const [sectionKey, setSectionKey] = useState('')
  const [actorMemberId, setActorMemberId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load(isBackground = false) {
      if (!isBackground) setLoading(true)
      try {
        const data = await fetchAdminAuditLogs({ limit: AUDIT_FETCH_LIMIT })
        if (!cancelled) {
          setLogs(Array.isArray(data.logs) ? data.logs : [])
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit trail.')
          if (!isBackground) setLogs([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load(false)
    const timer = window.setInterval(() => load(true), 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const examOptions = useMemo(() => {
    const seen = new Map()
    for (const log of logs) {
      if (!log.examId || !log.examTitle) continue
      seen.set(String(log.examId), log.examTitle)
    }
    return [...seen.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [logs])

  const sectionOptions = useMemo(() => {
    const seen = new Map()
    for (const log of logs) {
      const key = sectionFilterKey(log)
      if (!key) continue
      seen.set(key, classSectionLabel(log))
    }
    return [...seen.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [logs])

  const userOptions = useMemo(() => {
    const seen = new Map()
    for (const log of logs) {
      if (!log.teacherMemberId || !log.teacherName) continue
      seen.set(String(log.teacherMemberId), actorLabel(log))
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [logs])

  const eventTypeGroups = useMemo(() => {
    const groups = new Map()
    for (const option of EVENT_TYPE_OPTIONS) {
      if (!groups.has(option.group)) groups.set(option.group, [])
      groups.get(option.group).push(option)
    }
    return [...groups.entries()]
  }, [])

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter((log) => {
      if (eventType && log.eventType !== eventType) return false
      if (examId && String(log.examId) !== examId) return false
      if (sectionKey && sectionFilterKey(log) !== sectionKey) return false
      if (actorMemberId && String(log.teacherMemberId) !== actorMemberId) return false
      if (!logInDateRange(log.occurredAt, dateFrom, dateTo)) return false
      if (!q) return true
      const haystack = [
        labelForEvent(log.eventType),
        log.details,
        log.className,
        log.examTitle,
        log.questionSetTitle,
        classSectionLabel(log),
        log.studentName,
        log.teacherName,
        log.actorRole,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [logs, query, eventType, examId, sectionKey, actorMemberId, dateFrom, dateTo])

  const filtersActive = hasActiveFilters({
    query,
    eventType,
    examId,
    sectionKey,
    actorMemberId,
    dateFrom,
    dateTo,
  })

  const summaryLabel = useMemo(() => {
    if (loading && logs.length === 0) return ''
    if (filtersActive) {
      return `${filteredLogs.length} of ${logs.length} loaded entries`
    }
    if (logs.length >= AUDIT_FETCH_LIMIT) {
      return `Latest ${AUDIT_FETCH_LIMIT} entries`
    }
    return `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`
  }, [loading, logs.length, filteredLogs.length, filtersActive])

  const clearFilters = () => {
    setQuery('')
    setEventType('')
    setExamId('')
    setSectionKey('')
    setActorMemberId('')
    setDateFrom('')
    setDateTo('')
  }

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      await exportAdminAuditLogs({
        search: query.trim(),
        eventType,
        examId,
        sectionKey,
        teacherMemberId: actorMemberId,
        dateFrom,
        dateTo,
        examTitle: examOptions.find((exam) => exam.id === examId)?.title || '',
        sectionLabel: sectionOptions.find((section) => section.key === sectionKey)?.label || '',
        teacherName: userOptions.find((user) => user.id === actorMemberId)?.name || '',
      })
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to export audit trail.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="admin-audit-section reports-page exam-audit-logs">
      <FadeIn className="admin-audit-section__header" delay={0.05}>
        <div className="exam-audit-logs__header">
          <div>
            <h2 className="admin-audit-section__title">Audit trail</h2>
            <p className="admin-audit-section__sub">
              Sign-ins and actions across your institution — teachers, students, and administrators.
            </p>
          </div>
          {summaryLabel ? (
            <p className="exam-audit-logs__summary" aria-live="polite">
              {summaryLabel}
            </p>
          ) : null}
        </div>
      </FadeIn>

      <FadeIn delay={0.08} className="exam-audit-logs__toolbar rp-surface">
        <div className="exam-audit-logs__search">
          <Search className="exam-audit-logs__search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, user, quiz, section, or student…"
            className="exam-audit-logs__search-input"
            aria-label="Search audit trail"
          />
        </div>

        <div className="exam-audit-logs__filters-row">
          <div className="exam-audit-logs__filters">
            <label className="exam-audit-logs__filter">
              <span className="exam-audit-logs__filter-label">Action</span>
              <select
                className="exam-audit-logs__select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                aria-label="Filter by action"
              >
                <option value="">All actions</option>
                {eventTypeGroups.map(([group, options]) => (
                  <optgroup key={group} label={group}>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="exam-audit-logs__filter">
              <span className="exam-audit-logs__filter-label">User</span>
              <select
                className="exam-audit-logs__select"
                value={actorMemberId}
                onChange={(e) => setActorMemberId(e.target.value)}
                aria-label="Filter by user"
              >
                <option value="">All users</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="exam-audit-logs__filter">
              <span className="exam-audit-logs__filter-label">Quiz</span>
              <select
                className="exam-audit-logs__select"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                aria-label="Filter by quiz"
              >
                <option value="">All quizzes</option>
                {examOptions.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="exam-audit-logs__filter">
              <span className="exam-audit-logs__filter-label">Section</span>
              <select
                className="exam-audit-logs__select"
                value={sectionKey}
                onChange={(e) => setSectionKey(e.target.value)}
                aria-label="Filter by section"
              >
                <option value="">All sections</option>
                {sectionOptions.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="exam-audit-logs__filter">
              <span className="exam-audit-logs__filter-label">Date range</span>
              <AuditLogDateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={({ dateFrom: from, dateTo: to }) => {
                  setDateFrom(from)
                  setDateTo(to)
                }}
              />
            </div>
          </div>

          <div className="exam-audit-logs__filters-actions">
            {filtersActive ? (
              <button type="button" className="btn-ghost-text exam-audit-logs__clear" onClick={clearFilters}>
                <X aria-hidden="true" />
                Clear
              </button>
            ) : null}
            <button
              type="button"
              className="btn-action btn-primary exam-audit-logs__export"
              disabled={exporting || loading || filteredLogs.length === 0}
              onClick={handleExportPdf}
            >
              <FileText aria-hidden="true" />
              {exporting ? 'Generating…' : 'Export PDF'}
            </button>
          </div>
        </div>
      </FadeIn>

      {error ? (
        <p className="um-banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading && logs.length === 0 ? (
        <PageSpinner label="Loading audit trail…" />
      ) : null}

      {(!loading || logs.length > 0) && (!error || logs.length > 0) ? (
        <FadeIn delay={0.12} className="rp-surface exam-audit-logs__panel">
          {filteredLogs.length === 0 ? (
            <div className="exam-audit-logs__empty">
              <div className="exam-audit-logs__empty-icon" aria-hidden="true">
                <ScrollText />
              </div>
              <p className="exam-audit-logs__empty-title">
                {logs.length === 0 ? 'No audit entries yet' : 'No entries match your filters'}
              </p>
              <p className="exam-audit-logs__empty-sub">
                {logs.length === 0
                  ? 'User sign-ins and actions across your institution will appear here.'
                  : 'Try clearing filters or broadening your search.'}
              </p>
              {filtersActive && logs.length > 0 ? (
                <button type="button" className="btn-action btn-outline" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="exam-audit-logs__table-wrap">
              <table className="exam-audit-logs__table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Action</th>
                    <th scope="col">User</th>
                    <th scope="col">Quiz</th>
                    <th scope="col">Section</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="exam-audit-logs__time">
                        <time dateTime={log.occurredAt || undefined}>{formatTime(log.occurredAt)}</time>
                      </td>
                      <td className="exam-audit-logs__action">{badgeForEvent(log.eventType)}</td>
                      <td>{actorLabel(log)}</td>
                      <td className="exam-audit-logs__quiz">{log.examTitle || '—'}</td>
                      <td className="exam-audit-logs__section">
                        <span className="exam-audit-logs__section-chip">{classSectionLabel(log)}</span>
                      </td>
                      <td className="exam-audit-logs__details" title={detailsLabel(log)}>
                        {detailsLabel(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeIn>
      ) : null}
    </section>
  )
}
