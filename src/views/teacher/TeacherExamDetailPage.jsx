import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  BarChart3,
  FileText,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Presentation,
  Radio,
  RotateCcw,
  Search,
  Send,
  StopCircle,
  Trash2,
  UsersRound,
  Maximize2,
} from 'lucide-react'
import StreamBackLink from '@/components/layout/StreamBackLink.jsx'
import { QuestionTypeIcon } from '@/components/exam/QuestionTypeIcon.jsx'
import { useTeacherShellBreadcrumbTrail } from '@/context/TeacherShellBreadcrumbContext.jsx'
import TeacherMcTabs from '@/components/teacher/TeacherMcTabs.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import {
  fetchTeacherExamResults,
  fetchTeacherExamSessionDetail,
  fetchTeacherMonitoringSnapshot,
  dismissTeacherViolation,
} from '@/lib/teacherExamResultsApi.js'
import { releaseExamScores } from '@/lib/teacherExamGradingApi.js'
import { labelForCheatEvent } from '@/lib/examAntiCheat.js'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  PG_EXAM_STATUS,
  normalizeExamStatus,
} from '@/lib/examFlowUi.js'
import { coerceDisplayString, coerceRouteParam } from '@/lib/coerceDisplay.js'
import { formatCourseBreadcrumbLabel, formatSectionTitle, formatTermPeriod } from '@/lib/sectionLabel.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { copyToClipboard } from '@/lib/copyToClipboard.js'
import { sumExamTotalPoints } from '@/lib/examPoints.js'
import { labelForFormType, uniqueQuestionTypeLabels } from '@/lib/questionTypes.js'
import UserAvatar from '@/components/admin/UserAvatar.jsx'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'
import {
  groupExamQuestionsBySet,
  mapExamToBuilderState,
} from '@/lib/mapExamToBuilder.js'
import { buildExamSectionsPayload } from '@/lib/examContentPayload.js'
import LazyExamQuestionAnswerPreview from '@/components/teacher/LazyExamQuestionAnswerPreview.jsx'
import '../../pages/teacher-ui/my_classes.css'

const ExamAnswerReviewModal = lazy(() => import('@/components/teacher/ExamAnswerReviewModal.jsx'))
const ExamQuestionsPresentDialog = lazy(() => import('@/components/teacher/ExamQuestionsPresentDialog.jsx'))
const ReleaseScoresDialog = lazy(() => import('@/components/teacher/ReleaseScoresDialog.jsx'))
const AssignExamStudentsDialog = lazy(() => import('@/components/teacher/AssignExamStudentsDialog.jsx'))
const RestartExamDialog = lazy(() => import('@/components/teacher/RestartExamDialog.jsx'))
const TeacherViolationLogModal = lazy(() => import('@/components/teacher/TeacherViolationLogModal.jsx'))

function normalizeTeacherViolationEntry(v) {
  const base = labelForCheatEvent(v.eventType) || v.eventType || 'event'
  const detail = v.details ? ` — ${v.details}` : ''
  const when = v.occurredAt ? new Date(v.occurredAt).toLocaleTimeString() : ''
  return {
    id: v.id,
    label: `${base}${detail}${when ? ` (${when})` : ''}`,
    dismissedAt: v.dismissedAt || null,
    eventType: v.eventType,
    details: v.details,
    occurredAt: v.occurredAt,
  }
}

const EXAM_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'results', label: 'Results' },
  { id: 'settings', label: 'Settings' },
]

const RESULTS_SORT_OPTIONS = [
  { id: 'Surname A-Z', label: 'Surname A–Z' },
  { id: 'Score rank', label: 'Score rank' },
  { id: 'Violations (highest to lowest)', label: 'Violations (high to low)' },
  { id: 'Submission time (Oldest to Newest)', label: 'Submission time (oldest first)' },
]

function sortSessionsBySurname(sessions) {
  return [...sessions].sort((a, b) => {
    const lastCmp = String(a.lastName || a.studentName || '').localeCompare(
      String(b.lastName || b.studentName || ''),
      undefined,
      { sensitivity: 'base' },
    )
    if (lastCmp !== 0) return lastCmp
    return String(a.firstName || '').localeCompare(String(b.firstName || ''), undefined, {
      sensitivity: 'base',
    })
  })
}

function SettingsForm({ hit, classId, examId, onSaved, onChanges }) {
  const [password, setPassword] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [isAutoPublish, setIsAutoPublish] = useState(false)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleChoices, setShuffleChoices] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [modalStart, setModalStart] = useState(null)
  const [modalEnd, setModalEnd] = useState(null)

  // Track original values to detect changes
  const [origScheduledStart, setOrigScheduledStart] = useState('')
  const [origScheduledEnd, setOrigScheduledEnd] = useState('')
  const [origIsAutoPublish, setOrigIsAutoPublish] = useState(false)
  const [origShuffleQuestions, setOrigShuffleQuestions] = useState(false)
  const [origShuffleChoices, setOrigShuffleChoices] = useState(false)

  useEffect(() => {
    if (hit) {
      const start = hit.scheduledStart || ''
      const end = hit.scheduledEnd || ''
      const autoPub = !!hit.isAutoPublish
      const shuffleQ = !!hit.shuffleQuestions
      const shuffleC = !!hit.shuffleChoices

      setPassword(hit.code || '')
      setScheduledStart(start)
      setScheduledEnd(end)
      setIsAutoPublish(autoPub)
      setShuffleQuestions(shuffleQ)
      setShuffleChoices(shuffleC)

      setOrigScheduledStart(start)
      setOrigScheduledEnd(end)
      setOrigIsAutoPublish(autoPub)
      setOrigShuffleQuestions(shuffleQ)
      setOrigShuffleChoices(shuffleC)
    }
  }, [hit])

  const hasChanges = 
    scheduledStart !== origScheduledStart ||
    scheduledEnd !== origScheduledEnd ||
    isAutoPublish !== origIsAutoPublish ||
    shuffleQuestions !== origShuffleQuestions ||
    shuffleChoices !== origShuffleChoices

  useEffect(() => {
    if (onChanges) {
      onChanges(hasChanges)
    }
  }, [hasChanges, onChanges])

  function openScheduleModal() {
    setModalStart(scheduledStart ? new Date(scheduledStart) : null)
    setModalEnd(scheduledEnd ? new Date(scheduledEnd) : null)
    setScheduleModalOpen(true)
  }

  function applySchedule() {
    setScheduledStart(modalStart ? modalStart.toISOString() : '')
    setScheduledEnd(modalEnd ? modalEnd.toISOString() : '')
    setScheduleModalOpen(false)
  }

  function clearSchedule() {
    setModalStart(null)
    setModalEnd(null)
    setScheduledStart('')
    setScheduledEnd('')
    setScheduleModalOpen(false)
  }

  function formatDateShort(iso) {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const startLabel = formatDateShort(scheduledStart)
  const endLabel = formatDateShort(scheduledEnd)

  async function handleSave(e) {
    e.preventDefault()
    if (!hasChanges) return
    setIsSaving(true)
    try {
      const mapped = mapExamToBuilderState(hit)
      const { sections } = mapped
      const payload = {
        title: hit.title || '',
        description: mapped.description || hit.description || '',
        password: password.trim(),
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
        isAutoPublish,
        shuffleQuestions,
        shuffleChoices,
        sections: buildExamSectionsPayload(sections),
      }

      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save settings.')
      }
      acsisToastSuccess('Exam settings saved.')
      if (onSaved) onSaved()
    } catch (err) {
      acsisToastError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <form id="exam-settings-form" onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Exam Scheduling</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }} className="pt-2">
            <button
              type="button"
              className="acsis-btn-ghost"
              title="Set or change exam schedule"
              style={{ padding: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              onClick={openScheduleModal}
            >
              <RotateCcw size={16} strokeWidth={2.5} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {startLabel || endLabel ? (
                <>
                  {startLabel && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                      <span style={{ fontWeight: 600 }}>Start:</span> {startLabel}
                    </span>
                  )}
                  {endLabel && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                      <span style={{ fontWeight: 600 }}>Deadline:</span> {endLabel}
                    </span>
                  )}
                </>
              ) : (
                <span
                  style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', cursor: 'pointer', textDecoration: 'underline dotted' }}
                  onClick={openScheduleModal}
                >
                  No schedule set — click to set dates
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary"
              checked={isAutoPublish}
              onChange={(e) => setIsAutoPublish(e.target.checked)}
            />
            <span className="text-sm">Auto-publish on start time</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
            />
            <span className="text-sm">Shuffle questions for each student</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary"
              checked={shuffleChoices}
              onChange={(e) => setShuffleChoices(e.target.checked)}
            />
            <span className="text-sm">Shuffle multiple-choice options</span>
          </label>
        </div>
      </form>

      {/* Schedule picker modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Exam Schedule</DialogTitle>
            <DialogDescription>
              Set the start and deadline for this exam. Leave blank for no fixed schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Start Time</label>
              <DateTimePicker
                value={modalStart}
                onChange={setModalStart}
                placeholder="No fixed start"
                disablePortal={true}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Exam deadline (optional)</label>
              <DateTimePicker
                value={modalEnd}
                onChange={setModalEnd}
                placeholder="No fixed deadline"
                disablePortal={true}
                minDateTime={modalStart}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="acsis-btn-ghost"
              onClick={clearSchedule}
              style={{ marginRight: 'auto' }}
            >
              Clear schedule
            </button>
            <button
              type="button"
              className="acsis-btn-ghost"
              onClick={() => setScheduleModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="acsis-mc-create-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={applySchedule}
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatSessionStatus(status) {
  if (status === 'submitted') return 'Submitted'
  if (status === 'on_hold') return 'On hold'
  if (status === 'in_progress') return 'In progress'
  if (!status) return '—'
  return String(status).replace(/_/g, ' ')
}

function formatSubmissionTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

function formatQuizDurationMs(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function resolveSessionQuizEndMs(session, exam) {
  const examSt = normalizeExamStatus(exam?.status)
  const examEndedMs =
    examSt === PG_EXAM_STATUS.CLOSED && exam?.updatedAt
      ? new Date(exam.updatedAt).getTime()
      : NaN

  if (session?.submittedAt) {
    return new Date(session.submittedAt).getTime()
  }

  const status = (session?.status || '').toLowerCase()

  if (status === 'on_hold' || (status === 'in_progress' && examSt === PG_EXAM_STATUS.CLOSED)) {
    if (Number.isFinite(examEndedMs)) return examEndedMs
    if (session?.lockedAt) return new Date(session.lockedAt).getTime()
    return NaN
  }

  if (status === 'in_progress' && examSt === PG_EXAM_STATUS.OPEN) {
    return Date.now()
  }

  if (session?.lockedAt) {
    return new Date(session.lockedAt).getTime()
  }

  return NaN
}

function formatSessionQuizDuration(session, exam) {
  const startMs = session?.startedAt ? new Date(session.startedAt).getTime() : NaN
  if (!Number.isFinite(startMs)) return '—'

  const endMs = resolveSessionQuizEndMs(session, exam)
  if (!Number.isFinite(endMs)) return '—'
  return formatQuizDurationMs(endMs - startMs)
}

function sessionStatusClass(status) {
  if (status === 'submitted') return 'acsis-exam-detail__session-status--submitted'
  if (status === 'on_hold') return 'acsis-exam-detail__session-status--hold'
  if (status === 'in_progress') return 'acsis-exam-detail__session-status--active'
  return ''
}

function scoreToneClass(percentage) {
  if (percentage == null) return ''
  return Number(percentage) >= 50
    ? 'acsis-exam-detail__score-pill--pass'
    : 'acsis-exam-detail__score-pill--fail'
}

function rankBadgeClass(rank) {
  if (rank === 1) return 'acsis-exam-detail__rank-badge acsis-exam-detail__rank-badge--top'
  if (rank != null && rank <= 3) return 'acsis-exam-detail__rank-badge acsis-exam-detail__rank-badge--podium'
  return 'acsis-exam-detail__rank-badge'
}

function statusBadgeClass(status) {
  const s = normalizeExamStatus(status)
  if (s === PG_EXAM_STATUS.DRAFT) return 'acsis-exam-detail__status-badge--draft'
  if (s === PG_EXAM_STATUS.WAITING) return 'acsis-exam-detail__status-badge--waiting'
  if (s === PG_EXAM_STATUS.OPEN) return 'acsis-exam-detail__status-badge--live'
  if (s === PG_EXAM_STATUS.CLOSED) return 'acsis-exam-detail__status-badge--closed'
  return ''
}

function displayStatusLabel(status) {
  const s = normalizeExamStatus(status)
  if (s === PG_EXAM_STATUS.DRAFT) return 'Draft'
  if (s === PG_EXAM_STATUS.WAITING) return 'Posted'
  return labelForPgExamStatus(status)
}

function computeDurationMinutes(exam) {
  const direct = Number(exam?.duration)
  if (direct > 0) return direct
  const start = exam?.scheduledStart ? new Date(exam.scheduledStart).getTime() : NaN
  const end = exam?.scheduledEnd ? new Date(exam.scheduledEnd).getTime() : NaN
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.max(1, Math.round((end - start) / 60000))
  }
  return 0
}

function overviewDescription(exam) {
  const examDesc = exam?.description?.trim()
  if (examDesc) return examDesc
  const sectionDesc = exam?.sections?.find((s) => s.description?.trim())?.description?.trim()
  if (sectionDesc) return sectionDesc
  const fromQuestion = exam?.questions?.find((q) => q.sectionDescription?.trim())?.sectionDescription?.trim()
  if (fromQuestion) return fromQuestion
  return 'No description added for this exam.'
}

export default function TeacherExamDetailPage() {
  const { classId, examId } = useParams()
  const navigate = useNavigate()

  const [hit, setHit] = useState(null)
  const [clsMeta, setClsMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [results, setResults] = useState(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsRefreshing, setResultsRefreshing] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewInitialSessionId, setReviewInitialSessionId] = useState(null)
  const [releasing, setReleasing] = useState(false)
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const [restartDialogOpen, setRestartDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [examCodeVisible, setExamCodeVisible] = useState(false)
  const [examCodeEditing, setExamCodeEditing] = useState(false)
  const [examCodeDraft, setExamCodeDraft] = useState('')
  const [examCodeSaving, setExamCodeSaving] = useState(false)
  const [lobbyModalOpen, setLobbyModalOpen] = useState(false)
  const [presentOpen, setPresentOpen] = useState(false)
  const [settingsHasChanges, setSettingsHasChanges] = useState(false)

  // Inline title editing
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)

  // Inline description editing
  const [descEditing, setDescEditing] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [descSaving, setDescSaving] = useState(false)
  
  // Results Tab States
  const [topScoreVisible, setTopScoreVisible] = useState(false)
  const [topScoreModalOpen, setTopScoreModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('Surname A-Z')
  const [statusFilter, setStatusFilter] = useState('all')
  const [violationModalSession, setViolationModalSession] = useState(null)
  const [violationModalViolations, setViolationModalViolations] = useState([])
  const [violationModalLoading, setViolationModalLoading] = useState(false)
  const [dismissingViolationLogId, setDismissingViolationLogId] = useState(null)
  const [violationDismissError, setViolationDismissError] = useState('')
  
  const { confirm, ConfirmDialog } = useAcsisConfirm()

  const loadExamQuestions = useCallback(async () => {
    if (!classId || !examId) return
    setQuestionsLoading(true)
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`)
      if (!res.ok) {
        throw new Error('Failed to load exam questions.')
      }
      const data = await res.json()
      setHit((prev) => (prev ? { ...prev, ...data, questions: data.questions || [] } : data))
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to load exam questions.')
    } finally {
      setQuestionsLoading(false)
    }
  }, [classId, examId])

  useEffect(() => {
    async function fetchExam() {
      if (!classId || !examId) return
      setLoading(true)
      try {
        const [examRes, classRes] = await Promise.all([
          apiFetch(`/api/teacher/classes/${classId}/exams/${examId}?includeQuestions=0`),
          apiFetch(`/api/teacher/classes/${classId}`),
        ])
        if (!examRes.ok) {
          throw new Error('Exam not found or you do not have permission.')
        }
        const summary = await examRes.json()
        setHit({ ...summary, questions: [] })
        if (classRes.ok) {
          const classPayload = await classRes.json()
          setClsMeta(classPayload)
        } else {
          setClsMeta(null)
        }
      } catch (err) {
        setError(err.message)
        setClsMeta(null)
      } finally {
        setLoading(false)
      }
    }
    fetchExam()
  }, [classId, examId, refreshTick])

  useEffect(() => {
    if (!classId || !examId || !hit || loading || tab !== 'overview') return undefined
    const questionCount = Number(hit.questionCount ?? 0)
    if (questionCount === 0) return undefined
    if (hit.questions?.length) return undefined
    void loadExamQuestions()
  }, [classId, examId, hit, loading, tab, refreshTick, loadExamQuestions])

  const breadcrumbTrail = useMemo(() => {
    if (!hit) return null
    const trail = []
    if (clsMeta) {
      trail.push({
        label: formatCourseBreadcrumbLabel(clsMeta),
        to: `/teacher/my-classes/${coerceRouteParam(classId)}`,
      })
    }
    trail.push({ label: coerceDisplayString(hit.title, 'Exam') })
    return trail
  }, [hit, clsMeta, classId])

  useTeacherShellBreadcrumbTrail(breadcrumbTrail)

  const examIsLive = useMemo(() => {
    const examStatus = normalizeExamStatus(hit?.status)
    return examStatus === PG_EXAM_STATUS.WAITING || examStatus === PG_EXAM_STATUS.OPEN
  }, [hit?.status])

  const reloadResults = useCallback(
    async ({ background = false } = {}) => {
      if (!classId || !examId) return
      if (background) {
        setResultsRefreshing(true)
      } else {
        setResultsLoading(true)
      }
      try {
        if (examIsLive) {
          const data = await fetchTeacherMonitoringSnapshot(classId, examId)
          setResults((prev) => ({
            ...data,
            topStudent: prev?.topStudent ?? null,
            questionStats: prev?.questionStats ?? [],
          }))
        } else {
          const data = await fetchTeacherExamResults(classId, examId)
          setResults(data)
        }
      } catch {
        if (!background) setResults(null)
      } finally {
        if (background) {
          setResultsRefreshing(false)
        } else {
          setResultsLoading(false)
        }
      }
    },
    [classId, examId, examIsLive],
  )

  useEffect(() => {
    if (!classId || !examId || !hit) return undefined
    if (tab === 'results') {
      reloadResults({ background: false })
      return undefined
    }
    if (tab === 'overview' && examIsLive) {
      reloadResults({ background: false })
    }
  }, [classId, examId, hit, refreshTick, tab, reloadResults, examIsLive])

  const filteredSessions = useMemo(() => {
    let list = [...(results?.sessions || [])]
    if (statusFilter === 'submitted') {
      list = list.filter((s) => s.status === 'submitted')
    } else if (statusFilter === 'in_progress') {
      list = list.filter((s) => s.status === 'in_progress')
    } else if (statusFilter === 'on_hold') {
      list = list.filter((s) => s.status === 'on_hold')
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          (s.studentName || '').toLowerCase().includes(q) ||
          (s.firstName || '').toLowerCase().includes(q) ||
          (s.lastName || '').toLowerCase().includes(q) ||
          (s.schoolId || '').toLowerCase().includes(q),
      )
    }

    if (filterMode === 'Surname A-Z') {
      list = sortSessionsBySurname(list)
    } else if (filterMode === 'Score rank') {
      list.sort((a, b) => {
        const rankA = a.rank != null ? a.rank : 999999
        const rankB = b.rank != null ? b.rank : 999999
        return rankA - rankB
      })
    } else if (filterMode === 'Violations (highest to lowest)') {
      list.sort((a, b) => (b.warningCount || 0) - (a.warningCount || 0))
    } else if (filterMode === 'Submission time (Oldest to Newest)') {
      list.sort((a, b) => {
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : Number.POSITIVE_INFINITY
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : Number.POSITIVE_INFINITY
        return timeA - timeB
      })
    }
    return list
  }, [results?.sessions, searchQuery, filterMode, statusFilter])

  const totalSessions = results?.sessions?.length ?? 0
  const resultsFiltersActive = Boolean(searchQuery.trim() || statusFilter !== 'all')

  const clearResultsFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  const falsePositiveCountBySession = useMemo(() => {
    const map = new Map()
    for (const v of results?.violations ?? []) {
      if (!v.dismissedAt || !v.sessionId) continue
      map.set(v.sessionId, (map.get(v.sessionId) ?? 0) + 1)
    }
    return map
  }, [results?.violations])

  const violationsBySession = useMemo(() => {
    const map = new Map()
    for (const v of results?.violations ?? []) {
      if (!v.sessionId) continue
      if (!map.has(v.sessionId)) map.set(v.sessionId, [])
      map.get(v.sessionId).push(normalizeTeacherViolationEntry(v))
    }
    return map
  }, [results?.violations])


  function canOpenViolationLog(session) {
    return Boolean(session?.sessionId) && Number(session.warningCount) > 0
  }

  function renderWarningCount(session) {
    if (canOpenViolationLog(session)) {
      return (
        <button
          type="button"
          className="acsis-exam-detail__warning-count acsis-exam-detail__warning-count--active acsis-exam-detail__warning-count--clickable"
          onClick={() => void openViolationModal(session)}
          title="View violation log"
          aria-label={`View ${session.warningCount} violation${Number(session.warningCount) === 1 ? '' : 's'} for ${session.studentName || 'student'}`}
        >
          {session.warningCount}
        </button>
      )
    }
    return (
      <span
        className={`acsis-exam-detail__warning-count${
          Number(session.warningCount) > 0 ? ' acsis-exam-detail__warning-count--active' : ''
        }`}
      >
        {session.warningCount}
      </span>
    )
  }

  async function openViolationModal(session) {
    if (!session?.sessionId) return
    setViolationDismissError('')
    setViolationModalSession(session)
    const cached = violationsBySession.get(session.sessionId) || []
    setViolationModalViolations(cached)
    if (cached.length > 0 || Number(session.warningCount) === 0) return

    setViolationModalLoading(true)
    try {
      const detail = await fetchTeacherExamSessionDetail(classId, examId, session.sessionId)
      const violations = (detail.violations || []).map(normalizeTeacherViolationEntry)
      setViolationModalViolations(violations)
      setViolationModalSession((prev) =>
        prev && prev.sessionId === session.sessionId
          ? {
              ...prev,
              warningCount: Number(detail.session?.warningCount ?? prev.warningCount ?? 0),
              status: detail.session?.status ?? prev.status,
            }
          : prev,
      )
    } catch (err) {
      setViolationDismissError(
        err instanceof Error ? err.message : 'Failed to load violation log.',
      )
    } finally {
      setViolationModalLoading(false)
    }
  }

  async function handleDismissViolation(violation) {
    if (!violation?.id || !violationModalSession?.sessionId) return
    if (violation.dismissedAt) return
    setViolationDismissError('')
    setDismissingViolationLogId(violation.id)
    try {
      const result = await dismissTeacherViolation(
        classId,
        examId,
        violationModalSession.sessionId,
        violation.id,
      )
      const strikes = Number(result.warningCount ?? 0)
      const nextViolations = violationModalViolations.map((v) =>
        v.id === violation.id ? { ...v, dismissedAt: new Date().toISOString() } : v,
      )
      setViolationModalViolations(nextViolations)
      setViolationModalSession((prev) =>
        prev ? { ...prev, warningCount: strikes } : prev,
      )
      const refreshedResults = examIsLive
        ? await fetchTeacherMonitoringSnapshot(classId, examId)
        : await fetchTeacherExamResults(classId, examId)
      if (examIsLive) {
        setResults((prev) => ({
          ...refreshedResults,
          topStudent: prev?.topStudent ?? null,
          questionStats: prev?.questionStats ?? [],
        }))
      } else {
        setResults(refreshedResults)
      }
      const refreshedSession = (refreshedResults.sessions || []).find(
        (row) => row.sessionId === violationModalSession.sessionId,
      )
      if (refreshedSession) {
        setViolationModalSession(refreshedSession)
      }
      const refreshedViolations = (refreshedResults.violations || [])
        .filter((v) => v.sessionId === violationModalSession.sessionId)
        .map(normalizeTeacherViolationEntry)
      if (refreshedViolations.length) {
        setViolationModalViolations(refreshedViolations)
      }
    } catch (err) {
      setViolationDismissError(err instanceof Error ? err.message : 'Could not mark as false positive.')
    } finally {
      setDismissingViolationLogId(null)
    }
  }

  const examTimingContext = useMemo(
    () => ({
      status: results?.exam?.status ?? hit?.status,
      updatedAt: results?.exam?.updatedAt ?? hit?.updatedAt ?? hit?.updated_at ?? null,
    }),
    [results?.exam, hit],
  )

  const questionSets = useMemo(
    () => (hit?.questions?.length ? groupExamQuestionsBySet(hit) : []),
    [hit],
  )

  const resultsTableColumns = useMemo(() => {
    const isSurname = filterMode === 'Surname A-Z'
    const isScoreRank = filterMode === 'Score rank'
    const isSubmissionTime = filterMode === 'Submission time (Oldest to Newest)'
    const isViolations = filterMode === 'Violations (highest to lowest)'
    return {
      rank: isScoreRank,
      score: isScoreRank,
      submissionTime: isSubmissionTime,
      timeTaken: isSubmissionTime,
      warnings: !isSubmissionTime,
      falsePositives: isViolations,
      actions: !isViolations,
    }
  }, [filterMode])

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <PageSpinner label="Loading exam details…" />
      </div>
    )
  }

  if (error || !hit) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <StreamBackLink to={`/teacher/my-classes/${classId}`}>
          Back to class
        </StreamBackLink>
        <p className="acsis-mc-sub" style={{ color: '#ef4444' }}>{error || 'This exam is not available.'}</p>
      </div>
    )
  }

  const exam = hit
  const active = normalizeExamStatus(exam.status) === PG_EXAM_STATUS.OPEN
  const draft = isExamDraft(exam.status)
  const waiting = normalizeExamStatus(exam.status) === PG_EXAM_STATUS.WAITING
  const closed = normalizeExamStatus(exam.status) === PG_EXAM_STATUS.CLOSED
  const hasSubmissions = (results?.sessions || []).some((s) => s.status === 'submitted')

  const subjectLabel = (clsMeta?.courseCode || clsMeta?.name || '').trim() || null
  const sectionLabel = clsMeta ? formatSectionTitle(clsMeta) : ''
  const classGroupParts = [
    sectionLabel && sectionLabel !== 'Section' ? sectionLabel : null,
    clsMeta ? formatTermPeriod(clsMeta) : null,
  ].filter(Boolean)
  const classGroupLabel =
    classGroupParts.length > 0 ? classGroupParts.join(' · ') : (clsMeta?.name || '').trim() || null

  const streamHref = `/teacher/my-classes/${coerceRouteParam(classId)}`
  const questionCount = exam.questions ? exam.questions.length : exam.questionCount || 0
  const durationMins = computeDurationMinutes(exam)
  const totalPoints = sumExamTotalPoints(exam.questions)
  const typeLabels = uniqueQuestionTypeLabels(exam.questions)
  const overviewDesc = overviewDescription(exam)
  const stats = results?.stats
  const lobbyStudents = waiting
    ? (results?.sessions || []).filter((s) => s.status === 'in_progress')
    : []
  const lobbyCount = lobbyStudents.length
  const monitoringHref = `/teacher/detections?classId=${coerceRouteParam(classId)}&examId=${coerceRouteParam(examId)}`
  const reportsHref = `/teacher/reports?examId=${coerceRouteParam(examId)}`

  async function publish() {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, {
        method: 'PUT',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish exam.')
      }
      if (data.code) {
        acsisToastSuccess(`Exam published. Share this code with students: ${data.code}`)
      } else {
        acsisToastSuccess('Exam published.')
      }
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function endExam() {
    const ok = await confirm({
      title: 'End this exam?',
      description: 'Unsubmitted students will be placed on hold and can still submit their answers.',
      confirmLabel: 'Close exam',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/close`, {
        method: 'PUT',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to end exam.')
      }
      acsisToastSuccess('Exam ended.')
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function handleOpenPresentDialog() {
    if (!exam.questions?.length && Number(hit?.questionCount ?? 0) > 0) {
      await loadExamQuestions()
    }
    setPresentOpen(true)
    if (results?.questionStats?.length) return
    try {
      const data = await fetchTeacherExamResults(classId, examId, { includeQuestionStats: true })
      setResults((prev) => ({
        ...(prev || {}),
        questionStats: data.questionStats ?? [],
        stats: data.stats ?? prev?.stats,
      }))
    } catch {
      /* Present still works without per-question stats */
    }
  }

  async function handleReleaseScores({ sendEmail, includeAnswerKey, sessionIds }) {
    setReleasing(true)
    try {
      const data = await releaseExamScores(classId, examId, {
        sendEmail,
        includeAnswerKey,
        sessionIds,
      })
      const count = data.releasedCount ?? sessionIds?.length ?? 'all'
      const topMsg = data.topStudent ? ` Top 1: ${data.topStudent.studentName}.` : ''
      acsisToastSuccess(`Released ${count} score(s). Emails sent: ${data.emailsSent ?? 0}.${topMsg}`)
      setReleaseDialogOpen(false)
      const refreshed = await fetchTeacherExamResults(classId, examId)
      setResults(refreshed)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to release scores.')
    } finally {
      setReleasing(false)
    }
  }

  async function handleReleaseOneStudent(sessionId) {
    setReleasing(true)
    try {
      const data = await releaseExamScores(classId, examId, {
        sendEmail: false,
        sessionIds: [sessionId],
      })
      acsisToastSuccess(`Score released for 1 student.${data.emailsSent ? ` Email sent.` : ''}`)
      const refreshed = await fetchTeacherExamResults(classId, examId)
      setResults(refreshed)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to release score.')
    } finally {
      setReleasing(false)
    }
  }

  async function startExam(payload = {}) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/start`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start exam.')
      }
      acsisToastSuccess('Exam is now live.')
      setRestartDialogOpen(false)
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function saveExamCode() {
    const next = examCodeDraft.trim().toUpperCase()
    if (!next) {
      acsisToastError('Exam code cannot be empty.')
      return
    }
    if (next === String(exam?.code || '').toUpperCase()) {
      setExamCodeEditing(false)
      return
    }
    setExamCodeSaving(true)
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg =
          typeof err.error === 'string'
            ? err.error
            : 'Failed to update exam code.'
        throw new Error(msg)
      }
      const data = await res.json()
      const savedCode = typeof data.code === 'string' ? data.code : next
      setHit((prev) => (prev ? { ...prev, code: savedCode } : prev))
      setExamCodeEditing(false)
      acsisToastSuccess('Exam code updated.')
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to update exam code.')
    } finally {
      setExamCodeSaving(false)
    }
  }

  function cancelExamCodeEdit() {
    setExamCodeEditing(false)
    setExamCodeDraft('')
  }

  function beginExamCodeEdit() {
    if (!exam?.code || examCodeSaving) return
    setExamCodeDraft(exam.code)
    setExamCodeEditing(true)
  }

  async function saveTitleEdit() {
    const next = titleDraft.trim()
    if (!next) { acsisToastError('Title cannot be empty.'); return }
    if (next === (exam?.title || '').trim()) { setTitleEditing(false); return }
    setTitleSaving(true)
    try {
      const mapped = mapExamToBuilderState(hit)
      const payload = {
        title: next,
        description: mapped.description || hit.description || '',
        password: hit.code || '',
        scheduledStart: hit.scheduledStart ? new Date(hit.scheduledStart).toISOString() : null,
        scheduledEnd: hit.scheduledEnd ? new Date(hit.scheduledEnd).toISOString() : null,
        isAutoPublish: !!hit.isAutoPublish,
        shuffleQuestions: !!hit.shuffleQuestions,
        shuffleChoices: !!hit.shuffleChoices,
        sections: buildExamSectionsPayload(mapped.sections),
      }
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save title.')
      }
      setHit((prev) => prev ? { ...prev, title: next } : prev)
      setTitleEditing(false)
      acsisToastSuccess('Exam title updated.')
    } catch (err) {
      acsisToastError(err.message)
    } finally {
      setTitleSaving(false)
    }
  }

  async function saveDescEdit() {
    const next = descDraft.trim()
    setDescSaving(true)
    try {
      const mapped = mapExamToBuilderState(hit)
      const payload = {
        title: hit.title || '',
        description: next,
        password: hit.code || '',
        scheduledStart: hit.scheduledStart ? new Date(hit.scheduledStart).toISOString() : null,
        scheduledEnd: hit.scheduledEnd ? new Date(hit.scheduledEnd).toISOString() : null,
        isAutoPublish: !!hit.isAutoPublish,
        shuffleQuestions: !!hit.shuffleQuestions,
        shuffleChoices: !!hit.shuffleChoices,
        sections: buildExamSectionsPayload(mapped.sections),
      }
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save description.')
      }
      setHit((prev) => prev ? { ...prev, description: next } : prev)
      setDescEditing(false)
      acsisToastSuccess('Exam description updated.')
    } catch (err) {
      acsisToastError(err.message)
    } finally {
      setDescSaving(false)
    }
  }

  async function restartExam(payload = {}) {
    const body = {
      newScheduledStart: payload.newScheduledStart
        ? new Date(payload.newScheduledStart).toISOString()
        : null,
      newScheduledEnd: payload.newScheduledEnd ? new Date(payload.newScheduledEnd).toISOString() : null,
    }
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/restart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to restart exam.')
      }
      acsisToastSuccess('Exam restarted and is now in the lobby.')
      setRestartDialogOpen(false)
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete “${exam.title || 'this exam'}”?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete exam',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete exam.')
      }
      acsisToastSuccess('Exam deleted.')
      navigate(streamHref)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  async function handleKick(sessionId) {
    const ok = await confirm({
      title: 'Remove student from lobby?',
      description: 'They will be kicked out of the exam session. They can rejoin with the exam code if needed.',
      confirmLabel: 'Remove student',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to remove student from lobby.')
      }
      acsisToastSuccess('Student removed from lobby.')
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
    }
  }

  const qs = new URLSearchParams({ classId })
  const createHref = `/teacher/create-exam?${qs.toString()}`
  const copyHref = `/teacher/create-exam?classId=${coerceRouteParam(classId)}&copyFrom=${coerceRouteParam(examId)}`
  const editHref = `/teacher/create-exam?classId=${coerceRouteParam(classId)}&examId=${coerceRouteParam(examId)}`

  const classHint = clsMeta
    ? [clsMeta.name || clsMeta.courseCode, formatTermPeriod(clsMeta)].filter(Boolean).join(' · ')
    : undefined


  return (
    <div className="acsis-mc-view acsis-view acsis-exam-detail">
      <StreamBackLink to={streamHref}>
        Back to Class
      </StreamBackLink>

      <header className="acsis-exam-detail__hero">
        <div className="acsis-exam-detail__hero-main">
          <div className="acsis-exam-detail__hero-title-row">
            {titleEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="acsis-exam-detail__inline-input"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void saveTitleEdit() }
                    if (e.key === 'Escape') { setTitleEditing(false) }
                  }}
                  disabled={titleSaving}
                  autoFocus
                  aria-label="Edit exam title"
                  style={{ width: '400px', maxWidth: '100%', fontSize: '1.35rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}
                />
                <button
                  type="button"
                  className="acsis-btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={() => void saveTitleEdit()}
                  disabled={titleSaving}
                >
                  {titleSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="acsis-btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={() => setTitleEditing(false)}
                  disabled={titleSaving}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="acsis-exam-detail__hero-title">{exam.title || 'Untitled exam'}</h1>
                <button
                  type="button"
                  className="acsis-exam-detail__inline-edit-btn"
                  aria-label="Edit exam title"
                  title="Edit title"
                  onClick={() => { setTitleDraft(exam.title || ''); setTitleEditing(true) }}
                >
                  <Pencil size={15} strokeWidth={2} />
                </button>
              </>
            )}
            <span className={`acsis-exam-detail__status-badge ${statusBadgeClass(exam.status)}`}>
              {displayStatusLabel(exam.status)}
            </span>
          </div>
          {classHint ? <p className="acsis-exam-detail__hero-sub">{classHint}</p> : null}
        </div>
        <div className="acsis-exam-detail__hero-tools">
          {exam.code ? (
            <div className="acsis-exam-detail__code-wrap acsis-exam-detail__code-wrap--desktop-only">
              <span className="acsis-exam-detail__code-label">Exam password</span>
              <div className="acsis-exam-detail__code-pill">
                {examCodeEditing ? (
                  <input
                    type="text"
                    className="acsis-exam-detail__code-input"
                    value={examCodeDraft}
                    onChange={(e) => setExamCodeDraft(e.target.value.toUpperCase())}
                    onBlur={() => void saveExamCode()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void saveExamCode()
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelExamCodeEdit()
                      }
                    }}
                    maxLength={12}
                    autoFocus
                    disabled={examCodeSaving}
                    aria-label="Edit exam password"
                  />
                ) : (
                  <code
                    role="button"
                    tabIndex={0}
                    title="Double-click to change exam password"
                    onDoubleClick={beginExamCodeEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') beginExamCodeEdit()
                    }}
                  >
                    {examCodeVisible ? exam.code : '••••••'}
                  </code>
                )}
                <button
                  type="button"
                  className="acsis-exam-detail__code-toggle"
                  aria-label={examCodeVisible ? 'Hide exam password' : 'Show exam password'}
                  aria-pressed={examCodeVisible}
                  onClick={() => setExamCodeVisible((v) => !v)}
                >
                  {examCodeVisible ? (
                    <EyeOff size={16} strokeWidth={2} aria-hidden />
                  ) : (
                    <Eye size={16} strokeWidth={2} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className="acsis-exam-detail__code-copy"
                  aria-label="Copy exam password"
                  onClick={() => void copyToClipboard(exam.code, { successMessage: 'Exam password copied.' })}
                >
                  <Copy size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="acsis-class-card__menu-btn" aria-label="Exam options">
                <MoreVertical size={18} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[13.5rem] p-1.5">
              {draft || waiting || active || (closed && !draft) ? (
                <>
                  <DropdownMenuLabel className="acsis-exam-detail__menu-label">Session</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {draft ? (
                      <DropdownMenuActionItem icon={Send} variant="success" onSelect={publish}>
                        Publish exam
                      </DropdownMenuActionItem>
                    ) : null}
                    {waiting ? (
                      <DropdownMenuActionItem icon={Play} variant="success" onSelect={() => startExam({})}>
                        Start session
                      </DropdownMenuActionItem>
                    ) : null}
                    {active ? (
                      <DropdownMenuActionItem icon={StopCircle} variant="warning" onSelect={() => void endExam()}>
                        Close exam
                      </DropdownMenuActionItem>
                    ) : null}
                    {closed && !draft ? (
                      <DropdownMenuActionItem icon={RotateCcw} onSelect={() => setRestartDialogOpen(true)}>
                        Restart exam
                      </DropdownMenuActionItem>
                    ) : null}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}

              <DropdownMenuLabel className="acsis-exam-detail__menu-label">Students</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuActionItem icon={UsersRound} onSelect={() => setAssignDialogOpen(true)}>
                  Assign students
                </DropdownMenuActionItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="acsis-exam-detail__menu-label">Copies</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuActionItem icon={Copy} onSelect={() => navigate(copyHref)}>
                  Create a copy
                </DropdownMenuActionItem>
                <DropdownMenuActionItem icon={Plus} onSelect={() => navigate(createHref)}>
                  New exam in this class
                </DropdownMenuActionItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuActionItem icon={Trash2} variant="destructive" onSelect={() => void remove()}>
                Delete exam
              </DropdownMenuActionItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="acsis-exam-detail__tabs-row">
        <div className="acsis-exam-detail__tabs-wrap">
          <TeacherMcTabs
            aria-label="Exam sections"
            value={tab}
            onChange={setTab}
            tabs={EXAM_TABS}
          />
        </div>
        {(draft || waiting || active || closed) ? (
          <div className="acsis-exam-detail__tabs-tools">
            <div className="acsis-exam-detail__session-toolbar">
              {draft ? (
                <>
                  <span className="acsis-mc-sub acsis-exam-detail__session-hint">
                    Students cannot join until you publish.
                  </span>
                  <button
                    type="button"
                    className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                    onClick={publish}
                  >
                    <Send size={16} strokeWidth={2} aria-hidden />
                    Publish exam
                  </button>
                </>
              ) : null}
              {waiting ? (
                <>
                  {lobbyCount > 0 ? (
                    <button
                      type="button"
                      className="acsis-exam-detail__lobby-link acsis-exam-detail__session-hint"
                      onClick={() => setLobbyModalOpen(true)}
                    >
                      {lobbyCount} student{lobbyCount === 1 ? '' : 's'} in lobby
                    </button>
                  ) : (
                    <span className="acsis-mc-sub acsis-exam-detail__session-hint">
                      Students can join with the exam code
                    </span>
                  )}
                  <button
                    type="button"
                    className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                    onClick={() => startExam({})}
                  >
                    <Play size={16} strokeWidth={2} fill="currentColor" aria-hidden />
                    Start session
                  </button>
                </>
              ) : null}
              {active ? (
                <>
                  <span className="acsis-mc-sub acsis-exam-detail__session-hint">
                    {stats
                      ? `${stats.joined} joined · ${stats.submitted} submitted`
                      : 'Live'}
                  </span>
                  <button
                    type="button"
                    className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                    onClick={() => void endExam()}
                    title="Close exam"
                    aria-label="Close exam"
                  >
                    <StopCircle size={16} strokeWidth={2.5} aria-hidden />
                  </button>
                </>
              ) : null}
              {closed ? (
                <button
                  type="button"
                  className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                  onClick={() => setRestartDialogOpen(true)}
                >
                  <RotateCcw size={16} strokeWidth={2.5} aria-hidden />
                  Restart exam
                </button>
              ) : null}
            </div>
            {(waiting || active) ? (
              <Link to={monitoringHref} className="acsis-exam-detail__monitoring-btn">
                <span className="acsis-live-pulse-dot" aria-hidden />
                <Radio size={16} strokeWidth={2} aria-hidden />
                Live monitoring
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="acsis-exam-detail__panel">
        {tab === 'overview' ? (
          <div className="acsis-exam-detail__overview-merge">
            <section
              className="acsis-exam-detail__overview-merge-questions"
              aria-labelledby="exam-overview-questions-title"
            >
              <div className="acsis-exam-detail__questions-head acsis-exam-detail__overview-questions-head">
                <div>
                  <h2 id="exam-overview-questions-title" className="acsis-exam-detail__section-title">
                    Questions
                  </h2>
                </div>
                <div className="acsis-exam-detail__questions-actions">
                  {questionCount > 0 ? (
                    <button
                      type="button"
                      className="acsis-exam-detail__present-btn"
                      onClick={() => void handleOpenPresentDialog()}
                    >
                      <Presentation size={16} strokeWidth={2} aria-hidden />
                      Present
                    </button>
                  ) : null}
                  <Link
                    to={editHref}
                    className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                    style={{ textDecoration: 'none' }}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden />
                    Edit questions
                  </Link>
                </div>
              </div>
              {questionsLoading ? (
                <div className="acsis-exam-detail__empty-questions">
                  <PageSpinner label="Loading questions…" />
                </div>
              ) : !exam.questions?.length ? (
                <div className="acsis-exam-detail__empty-questions">
                  <p className="acsis-mc-sub">No questions loaded for this exam.</p>
                  <Link to={editHref} className="acsis-mc-create-btn" style={{ border: 'none', textDecoration: 'none' }}>
                    Add questions
                  </Link>
                </div>
              ) : (
                <div className="acsis-exam-detail__question-sets">
                  {questionSets.map((sec, secIndex) => {
                    let qOffset = 0
                    for (let i = 0; i < secIndex; i++) qOffset += questionSets[i].questions.length
                    const typeLabel = labelForFormType(sec.questionType)
                    const customTitle = sec.title?.trim()
                    const setTitle = customTitle || typeLabel || `Set ${secIndex + 1}`

                    return (
                      <section
                        key={sec.id}
                        className="acsis-exam-detail__question-set"
                        aria-labelledby={`exam-set-${sec.id}-title`}
                      >
                        <header className="acsis-exam-detail__question-set-head">
                          <div className="acsis-exam-detail__question-set-head-row">
                            <div className="acsis-exam-detail__question-set-identity">
                              {questionSets.length > 1 ? (
                                <span
                                  className="acsis-exam-detail__question-set-index"
                                  aria-hidden
                                >
                                  {secIndex + 1}
                                </span>
                              ) : null}
                              <span className="acsis-exam-detail__question-set-icon" aria-hidden>
                                <QuestionTypeIcon formType={sec.questionType} size={18} />
                              </span>
                              <div className="acsis-exam-detail__question-set-titles">
                                <h3
                                  id={`exam-set-${sec.id}-title`}
                                  className="acsis-exam-detail__question-set-title"
                                >
                                  {setTitle}
                                </h3>
                                {questionSets.length > 1 ? (
                                  <p className="acsis-exam-detail__question-set-meta">
                                    Section {secIndex + 1} of {questionSets.length}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <span className="acsis-exam-detail__question-set-count">
                              {sec.questions.length}{' '}
                              {sec.questions.length === 1 ? 'question' : 'questions'}
                            </span>
                          </div>
                          {sec.description?.trim() ? (
                            <p className="acsis-exam-detail__question-set-desc">{sec.description}</p>
                          ) : null}
                        </header>
                        <ol className="acsis-exam-detail__question-list">
                          {sec.questions.map((q, index) => (
                            <li key={q.id || `${sec.id}-${index}`} className="acsis-exam-detail__question-item">
                              <span className="acsis-exam-detail__question-num" aria-hidden>
                                {qOffset + index + 1}
                              </span>
                              <div className="acsis-exam-detail__question-body">
                                <div className="acsis-exam-detail__question-line">
                                  <p className="acsis-exam-detail__question-text">
                                    {q.question || q.question_text || 'Untitled question'}
                                  </p>
                                  <span className="acsis-exam-detail__question-points">
                                    {Number(q.points || 0)} pts
                                  </span>
                                </div>
                                <LazyExamQuestionAnswerPreview question={q} />
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    )
                  })}
                </div>
              )}
            </section>

            <aside className="acsis-exam-detail__overview-merge-meta">
              <div className="acsis-exam-detail__overview-merge-meta-inner">
              <h2 className="acsis-exam-detail__section-title acsis-exam-detail__overview-meta-title">
                Overview
              </h2>

              <section className="acsis-exam-detail__panel-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span className="acsis-exam-detail__section-heading" style={{ margin: 0 }}>Description</span>
                  {!descEditing && (
                    <button
                      type="button"
                      className="acsis-exam-detail__inline-edit-btn"
                      aria-label="Edit exam description"
                      title="Edit description"
                      onClick={() => { setDescDraft(exam.description || ''); setDescEditing(true) }}
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
                {descEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea
                      className="acsis-exam-detail__inline-textarea"
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      disabled={descSaving}
                      autoFocus
                      rows={4}
                      aria-label="Edit exam description"
                      style={{ width: '100%', resize: 'vertical', borderRadius: 6, padding: '8px 10px', fontFamily: 'inherit', fontSize: '0.95rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="acsis-btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        onClick={() => void saveDescEdit()}
                        disabled={descSaving}
                      >
                        {descSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="acsis-btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        onClick={() => setDescEditing(false)}
                        disabled={descSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`acsis-exam-detail__desc${
                      overviewDesc === 'No description added for this exam.'
                        ? ' acsis-exam-detail__desc--empty'
                        : ''
                    }`}
                    style={{ margin: 0 }}
                  >
                    {overviewDesc}
                  </p>
                )}
              </section>

              <section className="acsis-exam-detail__panel-section">
                <div
                  className={`acsis-summary-stats acsis-exam-detail__stats acsis-exam-detail__overview-sidebar-stats${
                    1 + (waiting ? 1 : 0) + 2 >= 4
                      ? ' acsis-summary-stats--4'
                      : ''
                  }`}
                >
                  <div className="acsis-summary-stat acsis-card-surface">
                    <div className="acsis-summary-stat__body">
                      <span className="acsis-summary-stat__label">Total points</span>
                      <span className="acsis-summary-stat__value">{totalPoints}</span>
                    </div>
                  </div>
                  <div className="acsis-summary-stat acsis-card-surface">
                    <div className="acsis-summary-stat__body">
                      <span className="acsis-summary-stat__label">Items</span>
                      <span className="acsis-summary-stat__value">{questionCount}</span>
                    </div>
                  </div>
                  <div className="acsis-summary-stat acsis-card-surface">
                    <div className="acsis-summary-stat__body">
                      <span className="acsis-summary-stat__label">Duration</span>
                      <span className="acsis-summary-stat__value">
                        {durationMins}
                        <span className="acsis-exam-detail__stat-unit">min</span>
                      </span>
                    </div>
                  </div>
                  {waiting ? (
                    <div className="acsis-summary-stat acsis-card-surface">
                      <div className="acsis-summary-stat__body">
                        <span className="acsis-summary-stat__label">In lobby</span>
                        <span className="acsis-exam-detail__stat-text">
                          {lobbyCount > 0 ? (
                            <button
                              type="button"
                              className="acsis-exam-detail__lobby-link"
                              onClick={() => setLobbyModalOpen(true)}
                            >
                              {lobbyCount} waiting
                            </button>
                          ) : (
                            '0 waiting'
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="acsis-exam-detail__panel-section acsis-exam-detail__panel-section--last">
                <div className="acsis-exam-detail__types-card">
                  <span className="acsis-exam-detail__section-heading">Question types</span>
                  {typeLabels.length ? (
                    <div className="acsis-exam-detail__type-badges">
                      {typeLabels.map((label) => (
                        <span key={label} className="acsis-exam-detail__type-badge" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <QuestionTypeIcon label={label} size={14} style={{ marginRight: '4px' }} />
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="acsis-exam-detail__types-empty">—</span>
                  )}
                </div>
              </section>
              </div>
            </aside>
          </div>
        ) : null}

        {tab === 'results' ? (
          <>
            <div className="acsis-exam-detail__questions-head acsis-exam-detail__results-head">
              <div>
                <h2 className="acsis-exam-detail__section-title">Results</h2>
                {closed ? (
                  <p className="acsis-mc-sub acsis-exam-detail__questions-sub">
                    Exam closed. Release scores when you are ready.
                  </p>
                ) : (
                  <p className="acsis-mc-sub acsis-exam-detail__questions-sub">
                    Track submissions, scores, and per-student actions. Refresh to see the latest updates.
                  </p>
                )}
              </div>
              <div className="acsis-exam-detail__questions-actions">
                <button
                  type="button"
                  className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                  onClick={() => void reloadResults({ background: true })}
                  disabled={resultsRefreshing || resultsLoading}
                  aria-busy={resultsRefreshing}
                >
                  <RotateCcw
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                    className={resultsRefreshing ? 'acsis-exam-detail__refresh-spin' : undefined}
                  />
                  {resultsRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
                <Link
                  to={reportsHref}
                  className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                >
                  <BarChart3 size={16} strokeWidth={2} aria-hidden />
                  View report
                </Link>
                {(closed || hasSubmissions) && !draft ? (
                  <button
                    type="button"
                    className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                    onClick={() => setReleaseDialogOpen(true)}
                    disabled={releasing}
                  >
                    <Send size={16} strokeWidth={2} aria-hidden />
                    Release scores
                  </button>
                ) : null}
              </div>
            </div>

            {stats ? (
              <div
                className={`acsis-summary-stats acsis-exam-detail__stats acsis-exam-detail__results-stats${
                  results?.topStudent ? ' acsis-summary-stats--4' : ''
                }`}
              >
                <div className="acsis-summary-stat acsis-card-surface">
                  <div className="acsis-summary-stat__body">
                    <span className="acsis-summary-stat__label">Enrolled</span>
                    <span className="acsis-summary-stat__value">{stats.enrolled}</span>
                  </div>
                </div>
                <div className="acsis-summary-stat acsis-card-surface">
                  <div className="acsis-summary-stat__body">
                    <span className="acsis-summary-stat__label">Submitted</span>
                    <span className="acsis-summary-stat__value">{stats.submitted}</span>
                  </div>
                </div>
                <div className="acsis-summary-stat acsis-card-surface">
                  <div className="acsis-summary-stat__body">
                    <span className="acsis-summary-stat__label">Still answering</span>
                    <span className="acsis-summary-stat__value">{Math.max(0, stats.joined - stats.submitted)}</span>
                  </div>
                </div>
                {results?.topStudent ? (
                  <div className="acsis-summary-stat acsis-card-surface acsis-exam-detail__top-score-card">
                    <button
                      type="button"
                      className="acsis-exam-detail__top-score-reveal"
                      onClick={() => {
                        void import('canvas-confetti').then(({ default: confetti }) => {
                          confetti({
                            particleCount: 150,
                            spread: 90,
                            origin: { x: 0.5, y: 0.5 },
                            zIndex: 9999,
                          })
                        })
                        setTopScoreModalOpen(true)
                      }}
                      aria-label="Reveal top score"
                      title="Reveal top score"
                    >
                      <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <div className="acsis-summary-stat__body">
                      <span className="acsis-summary-stat__label">Top score</span>
                      <span className="acsis-summary-stat__value">
                        {results.topStudent.rawScore != null && results.topStudent.totalPoints != null
                          ? `${results.topStudent.rawScore}/${results.topStudent.totalPoints}`
                          : results.topStudent.percentage != null
                          ? `${results.topStudent.percentage}%`
                          : '—'}
                        {results.topStudent.percentage != null &&
                        results.topStudent.rawScore != null &&
                        results.topStudent.totalPoints != null ? (
                          <span className="acsis-exam-detail__stat-unit">
                            {results.topStudent.percentage}%
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {resultsLoading && !results ? (
              <PageSpinner label="Loading submissions…" />
            ) : null}

            {!resultsLoading && (!results?.sessions || results.sessions.length === 0) ? (
              <div className="acsis-exam-detail__results-empty">
                <ClipboardList className="acsis-exam-detail__results-empty-icon" aria-hidden="true" />
                <p className="acsis-exam-detail__results-empty-title">No submissions yet</p>
                <p className="acsis-mc-sub">Students will appear here once they join or submit the exam.</p>
              </div>
            ) : (
              <div className="acsis-exam-detail__results-panel">
                <div className="acsis-exam-detail__results-toolbar">
                  <div className="acsis-exam-detail__results-toolbar-head">
                    <h3 className="acsis-exam-detail__results-toolbar-title">Student list</h3>
                    <p className="acsis-exam-detail__results-count" aria-live="polite">
                      {filteredSessions.length === totalSessions
                        ? `${totalSessions} student${totalSessions === 1 ? '' : 's'}`
                        : `${filteredSessions.length} of ${totalSessions} students`}
                    </p>
                  </div>

                  <div className="acsis-exam-detail__results-filters">
                    <div className="acsis-exam-detail__results-search">
                      <Search size={16} className="acsis-exam-detail__results-search-icon" aria-hidden="true" />
                      <input
                        type="search"
                        placeholder="Search by name or school ID…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="acsis-exam-detail__results-search-input"
                        aria-label="Search students"
                      />
                    </div>

                    <div className="acsis-exam-detail__results-controls">
                      <select
                        className="acsis-exam-detail__results-select"
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                        aria-label="Sort students"
                      >
                        {RESULTS_SORT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <select
                        className="acsis-exam-detail__results-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter by status"
                      >
                        <option value="all">All statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="in_progress">In progress</option>
                        <option value="on_hold">On hold</option>
                      </select>

                      {resultsFiltersActive ? (
                        <button
                          type="button"
                          className="acsis-exam-detail__results-clear"
                          onClick={clearResultsFilters}
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="acsis-exam-detail__table-wrap acsis-exam-detail__results-table-wrap">
                  {filteredSessions.length === 0 && totalSessions > 0 ? (
                    <div className="acsis-exam-detail__results-filter-empty">
                      <p className="acsis-exam-detail__results-filter-empty-title">No students match your filters</p>
                      <p className="acsis-mc-sub">Try a different search or show all statuses.</p>
                      <button
                        type="button"
                        className="acsis-btn-ghost acsis-exam-detail__questions-edit"
                        onClick={clearResultsFilters}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                  <table className="acsis-exam-detail__table">
                    <thead>
                      <tr>
                        {resultsTableColumns.rank ? (
                          <th className="acsis-exam-detail__table-col-rank">Rank</th>
                        ) : null}
                        <th>Student</th>
                        <th>Status</th>
                        {resultsTableColumns.submissionTime ? (
                          <th>Submitted</th>
                        ) : null}
                        {resultsTableColumns.timeTaken ? (
                          <th className="acsis-exam-detail__table-col-num">Time taken</th>
                        ) : null}
                        {resultsTableColumns.score ? (
                          <th className="acsis-exam-detail__table-col-num">Score</th>
                        ) : null}
                        {resultsTableColumns.warnings ? (
                          <th className="acsis-exam-detail__table-col-num">Warnings</th>
                        ) : null}
                        {resultsTableColumns.falsePositives ? (
                          <th className="acsis-exam-detail__table-col-num">False positives</th>
                        ) : null}
                        {resultsTableColumns.actions ? (
                          <th className="acsis-exam-detail__table-col-action">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((s) => (
                        <tr key={s.sessionId}>
                          {resultsTableColumns.rank ? (
                            <td className="acsis-exam-detail__table-col-rank">
                              {s.rank != null ? (
                                <span className={rankBadgeClass(s.rank)}>#{s.rank}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                          ) : null}
                          <td>
                            <div className="acsis-exam-detail__table-student">
                              <UserAvatar user={{ name: s.studentName, avatarUrl: s.avatarUrl }} />
                              <div className="acsis-exam-detail__table-student-text">
                                <span className="acsis-exam-detail__table-student-name">
                                  {[s.lastName, s.firstName].filter(Boolean).join(', ') || s.studentName}
                                </span>
                                {s.schoolId ? (
                                  <span className="acsis-exam-detail__table-student-id">{s.schoolId}</span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            {s.status ? (
                              <span className={`acsis-exam-detail__session-status ${sessionStatusClass(s.status)}`}>
                                {formatSessionStatus(s.status)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          {resultsTableColumns.submissionTime ? (
                            <td className="acsis-exam-detail__table-submission-time">
                              {formatSubmissionTime(s.submittedAt)}
                            </td>
                          ) : null}
                          {resultsTableColumns.timeTaken ? (
                            <td className="acsis-exam-detail__table-col-num acsis-exam-detail__table-time-taken">
                              {formatSessionQuizDuration(s, examTimingContext)}
                            </td>
                          ) : null}
                          {resultsTableColumns.score ? (
                            <td className="acsis-exam-detail__table-col-num">
                              {s.status === 'submitted' && s.percentage != null ? (
                                <span className={`acsis-exam-detail__score-pill ${scoreToneClass(s.percentage)}`}>
                                  <span className="acsis-exam-detail__score-pill-main">
                                    {s.rawScore}/{s.totalPoints}
                                  </span>
                                  <span className="acsis-exam-detail__score-pill-pct">{s.percentage}%</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          ) : null}
                          {resultsTableColumns.warnings ? (
                            <td className="acsis-exam-detail__table-col-num">
                              {renderWarningCount(s)}
                            </td>
                          ) : null}
                          {resultsTableColumns.falsePositives ? (
                            <td className="acsis-exam-detail__table-col-num">
                              {falsePositiveCountBySession.get(s.sessionId) ?? 0}
                            </td>
                          ) : null}
                          {resultsTableColumns.actions ? (
                            <td className="acsis-exam-detail__table-col-action">
                              {(s.status === 'submitted' || s.status === 'on_hold') && s.sessionId ? (
                                <div className="acsis-exam-detail__row-actions">
                                  <button
                                    type="button"
                                    className="acsis-exam-detail__review-btn"
                                    onClick={() => {
                                      setReviewInitialSessionId(s.sessionId)
                                      setReviewOpen(true)
                                    }}
                                  >
                                    <FileText size={14} strokeWidth={2} aria-hidden="true" />
                                    Review
                                  </button>
                                  {s.status === 'submitted' ? (
                                    s.scoreReleased ? (
                                      <span className="acsis-exam-detail__released-yes acsis-exam-detail__released-pill">
                                        Released
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="acsis-exam-detail__release-btn"
                                        disabled={releasing}
                                        onClick={() => void handleReleaseOneStudent(s.sessionId)}
                                      >
                                        Release
                                      </button>
                                    )
                                  ) : null}
                                </div>
                              ) : null}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}

        {tab === 'settings' ? (
          <>
            <div className="acsis-exam-detail__settings-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="acsis-exam-detail__section-title" style={{ margin: 0 }}>Exam settings</h2>
              <button
                type="submit"
                form="exam-settings-form"
                className="acsis-btn-primary"
                disabled={!settingsHasChanges}
              >
                Save settings
              </button>
            </div>

            <section className="acsis-exam-detail__panel-section acsis-exam-detail__panel-section--last">
              <SettingsForm hit={hit} classId={classId} examId={examId} onSaved={() => setRefreshTick(t => t + 1)} onChanges={setSettingsHasChanges} />
            </section>
          </>
        ) : null}
      </div>

      {presentOpen && exam.questions?.length ? (
        <Suspense fallback={null}>
          <ExamQuestionsPresentDialog
            open={presentOpen}
            onClose={() => setPresentOpen(false)}
            examTitle={hit?.title || 'Exam'}
            questions={exam.questions}
            questionStats={results?.questionStats}
            submittedCount={results?.stats?.submitted ?? 0}
          />
        </Suspense>
      ) : null}

      {reviewOpen && results?.sessions ? (
        <Suspense fallback={null}>
          <ExamAnswerReviewModal
            classId={classId}
            examId={examId}
            examTitle={hit?.title || 'Exam'}
            submittedSessions={results.sessions.filter(
              (s) => s.status === 'submitted' || s.status === 'on_hold',
            )}
            initialSessionId={reviewInitialSessionId}
            onClose={() => {
              setReviewOpen(false)
              setReviewInitialSessionId(null)
            }}
            onUpdated={async () => {
              const data = await fetchTeacherExamResults(classId, examId)
              setResults(data)
            }}
          />
        </Suspense>
      ) : null}

      {releaseDialogOpen ? (
        <Suspense fallback={null}>
          <ReleaseScoresDialog
            open={releaseDialogOpen}
            onOpenChange={setReleaseDialogOpen}
            students={results?.sessions || []}
            releasing={releasing}
            onRelease={(opts) => void handleReleaseScores(opts)}
          />
        </Suspense>
      ) : null}

      {violationModalSession ? (
        <Suspense fallback={null}>
          <TeacherViolationLogModal
            open={Boolean(violationModalSession)}
            onClose={() => {
              setViolationModalSession(null)
              setViolationModalViolations([])
              setViolationDismissError('')
            }}
            student={violationModalSession}
            violations={violationModalViolations}
            onDismissViolation={(v) => void handleDismissViolation(v)}
            dismissingLogId={dismissingViolationLogId}
            dismissError={violationDismissError}
            loading={violationModalLoading}
          />
        </Suspense>
      ) : null}

      <Dialog open={topScoreModalOpen} onOpenChange={setTopScoreModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ textAlign: 'center' }}>Top Score Revealed!</DialogTitle>
          </DialogHeader>
          {results?.topStudent ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏆</div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                {results.topStudent.studentName}
              </h3>
              <p style={{ fontSize: '1.25rem', color: '#16a34a', fontWeight: 600, margin: 0 }}>
                {results.topStudent.rawScore != null && results.topStudent.totalPoints != null
                  ? `${results.topStudent.rawScore} / ${results.topStudent.totalPoints} pts`
                  : results.topStudent.percentage != null
                  ? `${results.topStudent.percentage}%`
                  : ''}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={lobbyModalOpen} onOpenChange={setLobbyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Students in lobby</DialogTitle>
            <DialogDescription>
              Joined with the exam code and waiting for you to start the session.
            </DialogDescription>
          </DialogHeader>
          {lobbyStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students in the lobby yet.</p>
          ) : (
            <ul className="acsis-exam-detail__lobby-list">
              {lobbyStudents.map((s) => (
                <li key={s.sessionId} className="acsis-exam-detail__lobby-item">
                  <div className="acsis-exam-detail__lobby-student-info">
                    <UserAvatar
                      user={{
                        name: s.studentName,
                        avatarUrl: s.avatarUrl,
                      }}
                      size="md"
                    />
                    <div className="acsis-exam-detail__lobby-student-text">
                      <span className="acsis-exam-detail__lobby-name">
                        {[s.lastName, s.firstName].filter(Boolean).join(', ') || s.studentName}
                      </span>
                      {s.schoolId ? (
                        <span className="acsis-exam-detail__lobby-id">{s.schoolId}</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="acsis-btn-ghost acsis-exam-detail__lobby-kick"
                    onClick={() => void handleKick(s.sessionId)}
                    title="Remove from lobby"
                  >
                    Kick
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
      {restartDialogOpen ? (
        <Suspense fallback={null}>
          <RestartExamDialog
            open={restartDialogOpen}
            onOpenChange={setRestartDialogOpen}
            onRestart={restartExam}
            defaultStart={exam.scheduledStart}
            defaultEnd={exam.scheduledEnd}
          />
        </Suspense>
      ) : null}

      {assignDialogOpen ? (
        <Suspense fallback={null}>
          <AssignExamStudentsDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            classId={classId}
            examId={examId}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
