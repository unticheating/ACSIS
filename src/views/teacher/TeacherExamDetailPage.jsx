import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Play,
  Presentation,
  Radio,
  RotateCcw,
  Search,
  Send,
  StopCircle,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { useTeacherShellBreadcrumbTrail } from '@/context/TeacherShellBreadcrumbContext.jsx'
import TeacherMcTabs from '@/components/teacher/TeacherMcTabs.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { fetchTeacherExamResults } from '@/lib/teacherExamResultsApi.js'
import { releaseExamScores } from '@/lib/teacherExamGradingApi.js'
import ExamAnswerReviewModal from '@/components/teacher/ExamAnswerReviewModal.jsx'
import ReleaseScoresDialog from '@/components/teacher/ReleaseScoresDialog.jsx'
import AssignExamStudentsDialog from '@/components/teacher/AssignExamStudentsDialog.jsx'
import RestartExamDialog from '@/components/teacher/RestartExamDialog.jsx'
import CopyExamDialog from '@/components/teacher/CopyExamDialog.jsx'
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
import { labelForQuestionType, summarizeQuestionTypes, uniqueQuestionTypeLabels } from '@/lib/questionTypes.js'
import ExamQuestionAnswerPresentation from '@/components/teacher/ExamQuestionAnswerPresentation.jsx'
import ExamQuestionsPresentDialog from '@/components/teacher/ExamQuestionsPresentDialog.jsx'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Input } from '@/components/ui/input.jsx'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'
import { mapExamToBuilderState } from '@/lib/mapExamToBuilder.js'
import { buildExamSectionsPayload } from '@/lib/examContentPayload.js'
import confetti from 'canvas-confetti'
import '../../pages/teacher-ui/my_classes.css'

const EXAM_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'questions', label: 'Questions' },
  { id: 'results', label: 'Results' },
  { id: 'settings', label: 'Settings' },
]

function SettingsForm({ hit, classId, examId, onSaved, onChanges }) {
  const [password, setPassword] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [isAutoPublish, setIsAutoPublish] = useState(false)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleChoices, setShuffleChoices] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
    <form id="exam-settings-form" onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Exam Scheduling</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }} className="pt-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Start Time</Label>
            <DateTimePicker
              value={scheduledStart ? new Date(scheduledStart) : undefined}
              onChange={(d) => setScheduledStart(d ? d.toISOString() : null)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">End Time</Label>
            <DateTimePicker
              value={scheduledEnd ? new Date(scheduledEnd) : undefined}
              onChange={(d) => setScheduledEnd(d ? d.toISOString() : null)}
            />
          </div>
          <button
            type="button"
            className="acsis-btn-ghost"
            title="Reset scheduling"
            style={{ padding: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setScheduledStart(''); setScheduledEnd(''); }}
          >
            <RotateCcw size={16} strokeWidth={2.5} />
          </button>
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
  )
}

function formatSessionStatus(status) {
  if (status === 'submitted') return 'Submitted'
  if (status === 'in_progress') return 'In progress'
  if (!status) return '—'
  return String(status).replace(/_/g, ' ')
}

function sessionStatusClass(status) {
  if (status === 'submitted') return 'acsis-exam-detail__session-status--submitted'
  if (status === 'in_progress') return 'acsis-exam-detail__session-status--active'
  return ''
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
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [results, setResults] = useState(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewInitialSessionId, setReviewInitialSessionId] = useState(null)
  const [releasing, setReleasing] = useState(false)
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const [restartDialogOpen, setRestartDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [examCodeVisible, setExamCodeVisible] = useState(false)
  const [examCodeEditing, setExamCodeEditing] = useState(false)
  const [examCodeDraft, setExamCodeDraft] = useState('')
  const [examCodeSaving, setExamCodeSaving] = useState(false)
  const [lobbyModalOpen, setLobbyModalOpen] = useState(false)
  const [presentOpen, setPresentOpen] = useState(false)
  const [questionsExpanded, setQuestionsExpanded] = useState(false)
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('Surname A-Z')
  
  const { confirm, ConfirmDialog } = useAcsisConfirm()

  useEffect(() => {
    async function fetchExam() {
      if (!classId || !examId) return
      setLoading(true)
      try {
        const [examRes, classRes] = await Promise.all([
          apiFetch(`/api/teacher/classes/${classId}/exams/${examId}`),
          apiFetch(`/api/teacher/classes/${classId}/exams`),
        ])
        if (!examRes.ok) {
          throw new Error('Exam not found or you do not have permission.')
        }
        setHit(await examRes.json())
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

  useEffect(() => {
    if (!classId || !examId) return undefined
    let cancelled = false
    async function loadResults() {
      setResultsLoading(true)
      try {
        const data = await fetchTeacherExamResults(classId, examId)
        if (!cancelled) setResults(data)
      } catch {
        if (!cancelled) setResults(null)
      } finally {
        if (!cancelled) setResultsLoading(false)
      }
    }
    loadResults()
    const interval = window.setInterval(loadResults, 6000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [classId, examId, refreshTick])

  const filteredSessions = useMemo(() => {
    let list = [...(results?.sessions || [])]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          (s.studentName || '').toLowerCase().includes(q) ||
          (s.schoolId || '').toLowerCase().includes(q)
      )
    }
    
    if (filterMode === 'Surname A-Z') {
      list.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''))
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
        const timeA = a.endTime ? new Date(a.endTime).getTime() : a.updatedAt ? new Date(a.updatedAt).getTime() : 9999999999999
        const timeB = b.endTime ? new Date(b.endTime).getTime() : b.updatedAt ? new Date(b.updatedAt).getTime() : 9999999999999
        return timeA - timeB
      })
    }
    return list
  }, [results?.sessions, searchQuery, filterMode])

  if (loading) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <div className="acsis-mc-loading">Loading exam details…</div>
      </div>
    )
  }

  if (error || !hit) {
    return (
      <div className="acsis-mc-view acsis-view acsis-exam-detail">
        <Link to={`/teacher/my-classes/${classId}`} className="acsis-stream-back">
          ← Back to class
        </Link>
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
  const typeSummary = summarizeQuestionTypes(exam.questions)
  const typeLabels = uniqueQuestionTypeLabels(exam.questions)
  const overviewDesc = overviewDescription(exam)
  const stats = results?.stats
  const lobbyStudents = waiting
    ? (results?.sessions || []).filter((s) => s.status === 'in_progress')
    : []
  const lobbyCount = lobbyStudents.length
  const monitoringHref = `/teacher/detections?classId=${coerceRouteParam(classId)}&examId=${coerceRouteParam(examId)}`

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
      description: 'Students will no longer be able to enter or submit.',
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
      if (data.topStudent) {
        acsisToastSuccess(
          `Exam ended. Top 1: ${data.topStudent.studentName} (${data.topStudent.percentage}%).`,
        )
      } else {
        acsisToastSuccess('Exam ended. Ranks computed.')
      }
      setRefreshTick((t) => t + 1)
    } catch (err) {
      acsisToastError(err.message)
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

  async function copyExam(payload) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetClassId: payload.targetClassId,
          scheduledStart: payload.newScheduledStart
            ? new Date(payload.newScheduledStart).toISOString()
            : null,
          scheduledEnd: payload.newScheduledEnd
            ? new Date(payload.newScheduledEnd).toISOString()
            : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to copy exam.')
      }
      const data = await res.json()
      acsisToastSuccess('Exam copied successfully.')
      setCopyDialogOpen(false)
    } catch (err) {
      acsisToastError(err.message)
      throw err
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

  const qs = new URLSearchParams({ classId })
  const createHref = `/teacher/create-exam?${qs.toString()}`
  const editHref = `/teacher/create-exam?classId=${coerceRouteParam(classId)}&examId=${coerceRouteParam(examId)}`

  const classHint = clsMeta
    ? [clsMeta.name || clsMeta.courseCode, formatTermPeriod(clsMeta)].filter(Boolean).join(' · ')
    : undefined


  return (
    <div className="acsis-mc-view acsis-view acsis-exam-detail">
      <Link to={streamHref} className="acsis-stream-back">
        ← Back to Class
      </Link>

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
            <div className="acsis-exam-detail__code-wrap">
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
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuActionItem
                icon={Copy}
                onSelect={() => void copyToClipboard(exam.code, { successMessage: 'Exam password copied.' })}
              >
                Copy exam password
              </DropdownMenuActionItem>
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
              <DropdownMenuSeparator />
              <DropdownMenuActionItem icon={UsersRound} onSelect={() => setAssignDialogOpen(true)}>
                Assign students
              </DropdownMenuActionItem>
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
              <DropdownMenuSeparator />
              <DropdownMenuActionItem onSelect={() => setCopyDialogOpen(true)}>Copy to another section</DropdownMenuActionItem>
              <DropdownMenuActionItem onSelect={() => navigate(createHref)}>New exam in this class</DropdownMenuActionItem>
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
        {(waiting || active) && (
          <Link to={monitoringHref} className="acsis-exam-detail__monitoring-btn">
            <span className="acsis-live-pulse-dot" aria-hidden />
            <Radio size={16} strokeWidth={2} aria-hidden />
            Live monitoring
          </Link>
        )}
      </div>

      <FadeIn className="acsis-exam-detail__panel">
        {tab === 'overview' ? (
          <>
            <div className="acsis-exam-detail__questions-head">
              <div>
                <h2 className="acsis-exam-detail__section-title">Overview</h2>
              </div>
              <div className="acsis-exam-detail__questions-actions">
                {draft ? (
                  <>
                    <span className="acsis-mc-sub" style={{ whiteSpace: 'nowrap' }}>Students cannot join until you publish.</span>
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
                        className="acsis-exam-detail__lobby-link"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => setLobbyModalOpen(true)}
                      >
                        {lobbyCount} student{lobbyCount === 1 ? '' : 's'} in lobby
                      </button>
                    ) : (
                      <span className="acsis-mc-sub" style={{ whiteSpace: 'nowrap' }}>Students can join with the exam code</span>
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
                    <span className="acsis-mc-sub" style={{ whiteSpace: 'nowrap' }}>
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
            </div>
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
                className={`acsis-summary-stats acsis-exam-detail__stats${
                  (subjectLabel ? 1 : 0) + (waiting ? 1 : 0) + 2 >= 4
                    ? ' acsis-summary-stats--4'
                    : ''
                }`}
              >
                {subjectLabel ? (
                  <div className="acsis-summary-stat acsis-card-surface">
                    <div className="acsis-summary-stat__body">
                      <span className="acsis-summary-stat__label">Subject</span>
                      <span className="acsis-exam-detail__stat-text">{subjectLabel}</span>
                    </div>
                  </div>
                ) : null}
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
                      <span key={label} className="acsis-exam-detail__type-badge">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="acsis-exam-detail__types-empty">—</span>
                )}
              </div>
            </section>
          </>
        ) : null}

        {tab === 'questions' ? (
          <>
            <div className="acsis-exam-detail__questions-head">
              <div>
                <h2 className="acsis-exam-detail__section-title">Questions</h2>
                <p className="acsis-mc-sub acsis-exam-detail__questions-sub">
                  {questionCount} {questionCount === 1 ? 'item' : 'items'}
                  {typeSummary !== '—' ? ` · ${typeSummary}` : ''}
                </p>
              </div>
              <div className="acsis-exam-detail__questions-actions">
                {exam.questions?.length ? (
                  <button
                    type="button"
                    className="acsis-exam-detail__present-btn"
                    onClick={() => setPresentOpen(true)}
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
            {!exam.questions?.length ? (
              <div className="acsis-exam-detail__empty-questions">
                <p className="acsis-mc-sub">No questions loaded for this exam.</p>
                <Link to={editHref} className="acsis-mc-create-btn" style={{ border: 'none', textDecoration: 'none' }}>
                  Add questions
                </Link>
              </div>
            ) : !questionsExpanded ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <button
                  type="button"
                  className="acsis-btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setQuestionsExpanded(true)}
                >
                  <ChevronDown size={16} strokeWidth={2} />
                  View questions
                </button>
              </div>
            ) : (
              <>
                <ol className="acsis-exam-detail__question-list">
                  {exam.questions.map((q, index) => (
                    <li key={q.id || index} className="acsis-exam-detail__question-item">
                      <span className="acsis-exam-detail__question-num" aria-hidden>
                        {index + 1}
                      </span>
                      <div className="acsis-exam-detail__question-body">
                        <div className="acsis-exam-detail__question-meta">
                          <span className="acsis-exam-detail__type-badge">
                            {labelForQuestionType(q.type)}
                          </span>
                          <span className="acsis-exam-detail__question-points">
                            {Number(q.points || 0)} pts
                          </span>
                        </div>
                        <p className="acsis-exam-detail__question-text">
                          {q.question || q.question_text || 'Untitled question'}
                        </p>
                        <ExamQuestionAnswerPresentation question={q} />
                      </div>
                    </li>
                  ))}
                </ol>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0 2rem 0' }}>
                  <button
                    type="button"
                    className="acsis-btn-ghost"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setQuestionsExpanded(false)}
                  >
                    <ChevronUp size={16} strokeWidth={2} />
                    Hide questions
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}

        {tab === 'results' ? (
          <>
            <div className="acsis-exam-detail__questions-head">
              <div>
                <h2 className="acsis-exam-detail__section-title">Results</h2>
                {closed ? (
                  <p className="acsis-mc-sub acsis-exam-detail__questions-sub">Exam closed. Release scores when you are ready.</p>
                ) : null}
              </div>
              <div className="acsis-exam-detail__questions-actions">
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
              <div className="acsis-summary-stats acsis-exam-detail__results-stats">
                <div className="acsis-summary-stat acsis-card-surface">
                  <div className="acsis-summary-stat__body">
                    <span className="acsis-summary-stat__label">Submitted</span>
                    <span className="acsis-summary-stat__value">{stats.submitted}</span>
                  </div>
                </div>
                <div className="acsis-summary-stat acsis-card-surface">
                  <div className="acsis-summary-stat__body">
                    <span className="acsis-summary-stat__label">Joined and still answering</span>
                    <span className="acsis-summary-stat__value">{stats.joined}</span>
                  </div>
                </div>
                {results?.topStudent ? (
                  <div className="acsis-summary-stat acsis-card-surface">
                    <div className="acsis-summary-stat__body">
                      <span className="acsis-summary-stat__label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Top score
                        <button
                          type="button"
                          style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', color: 'inherit' }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const x = (rect.left + rect.width / 2) / window.innerWidth
                            const y = (rect.top + rect.height / 2) / window.innerHeight
                            setTopScoreVisible((v) => {
                              const next = !v
                              if (next) {
                                confetti({ particleCount: 100, spread: 70, origin: { x, y }, zIndex: 9999 })
                              }
                              return next
                            })
                          }}
                          aria-label={topScoreVisible ? 'Hide top score' : 'Show top score'}
                        >
                          {topScoreVisible ? (
                            <EyeOff size={14} strokeWidth={2} aria-hidden />
                          ) : (
                            <Eye size={14} strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      </span>
                      <span className="acsis-exam-detail__stat-text">
                        {topScoreVisible ? (
                          <>
                            {results.topStudent.studentName}
                            {results.topStudent.rawScore != null && results.topStudent.totalPoints != null ? (
                              <span className="acsis-exam-detail__top-score-pct">
                                {' '}
                                · {results.topStudent.rawScore}/{results.topStudent.totalPoints}
                              </span>
                            ) : results.topStudent.percentage != null ? (
                              <span className="acsis-exam-detail__top-score-pct">
                                {' '}
                                · {results.topStudent.percentage}%
                              </span>
                            ) : null}
                          </>
                        ) : (
                          '?'
                        )}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {resultsLoading && !results ? (
              <p className="acsis-mc-sub acsis-exam-detail__results-loading">Loading submissions…</p>
            ) : null}
            {!resultsLoading && (!results?.sessions || results.sessions.length === 0) ? (
              <div className="acsis-exam-detail__results-empty">
                <p className="acsis-mc-sub">No students have joined or submitted yet.</p>
              </div>
            ) : (
              <>
                <div className="acsis-exam-detail__filter-row">
                  <div className="acsis-exam-detail__search-wrap">
                    <Search size={16} className="acsis-exam-detail__search-icon" />
                    <input
                      type="search"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="acsis-mc-input acsis-exam-detail__search-input"
                    />
                  </div>
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="acsis-mc-input acsis-exam-detail__filter-select"
                  >
                    <option value="Surname A-Z">Surname A-Z</option>
                    <option value="Score rank">Score rank</option>
                    <option value="Violations (highest to lowest)">Violations (highest to lowest)</option>
                    <option value="Submission time (Oldest to Newest)">Submission time (Oldest to Newest)</option>
                  </select>
                </div>
                <div className="acsis-exam-detail__table-wrap">
                  <table className="acsis-exam-detail__table">
                    <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Review</th>
                      {filterMode !== 'Surname A-Z' ? (
                        <th className="acsis-exam-detail__table-col-num">Score</th>
                      ) : null}
                      {filterMode === 'Score rank' ? (
                        <th className="acsis-exam-detail__table-col-num">Score rank</th>
                      ) : null}
                      <th>Released</th>
                      <th className="acsis-exam-detail__table-col-num">Warnings</th>
                      <th className="acsis-exam-detail__table-col-action" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s) => (
                      <tr key={s.sessionId}>
                        <td>
                          <span className="acsis-exam-detail__table-student-name">
                            {[s.lastName, s.firstName].filter(Boolean).join(', ') || s.studentName}
                          </span>
                          {s.schoolId ? (
                            <span className="acsis-exam-detail__table-student-id">{s.schoolId}</span>
                          ) : null}
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
                        <td className="acsis-exam-detail__table-review">
                          {s.status === 'submitted'
                            ? s.reviewComplete
                              ? 'Reviewed'
                              : (s.uncheckedCount ?? 0) > 0
                                ? `Optional (${s.uncheckedCount})`
                                : 'Auto-graded'
                            : '—'}
                        </td>
                        {filterMode !== 'Surname A-Z' ? (
                          <td className="acsis-exam-detail__table-col-num acsis-exam-detail__table-score">
                            {s.status === 'submitted' && s.percentage != null
                              ? `${s.percentage}% (${s.rawScore}/${s.totalPoints})`
                              : '—'}
                          </td>
                        ) : null}
                        {filterMode === 'Score rank' ? (
                          <td className="acsis-exam-detail__table-col-num">
                            {s.rank != null ? `#${s.rank}` : '—'}
                          </td>
                        ) : null}
                        <td>
                          {s.status === 'submitted' ? (
                            s.scoreReleased ? (
                              <span className="acsis-exam-detail__released-yes">Released</span>
                            ) : (
                              <button
                                type="button"
                                className="acsis-exam-detail__table-action"
                                disabled={releasing}
                                onClick={() => void handleReleaseOneStudent(s.sessionId)}
                              >
                                Release
                              </button>
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="acsis-exam-detail__table-col-num acsis-exam-detail__table-warnings">
                          {s.warningCount}
                        </td>
                        <td className="acsis-exam-detail__table-col-action">
                          {s.status === 'submitted' && s.sessionId ? (
                            <button
                              type="button"
                              className="acsis-exam-detail__table-action"
                              onClick={() => {
                                setReviewInitialSessionId(s.sessionId)
                                setReviewOpen(true)
                              }}
                            >
                              Review
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
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
      </FadeIn>

      {presentOpen && exam.questions?.length ? (
        <ExamQuestionsPresentDialog
          open={presentOpen}
          onClose={() => setPresentOpen(false)}
          examTitle={hit?.title || 'Exam'}
          questions={exam.questions}
        />
      ) : null}

      {reviewOpen && results?.sessions ? (
        <ExamAnswerReviewModal
          classId={classId}
          examId={examId}
          examTitle={hit?.title || 'Exam'}
          submittedSessions={results.sessions.filter((s) => s.status === 'submitted')}
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
      ) : null}

      <ReleaseScoresDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        students={results?.sessions || []}
        releasing={releasing}
        onRelease={(opts) => void handleReleaseScores(opts)}
      />

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
                <li key={s.sessionId}>
                  <span className="acsis-exam-detail__lobby-name">
                    {[s.lastName, s.firstName].filter(Boolean).join(', ') || s.studentName}
                  </span>
                  {s.schoolId ? (
                    <span className="acsis-exam-detail__lobby-id">{s.schoolId}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
      {restartDialogOpen ? (
        <RestartExamDialog
          open={restartDialogOpen}
          onOpenChange={setRestartDialogOpen}
          onRestart={restartExam}
          defaultStart={exam.scheduledStart}
          defaultEnd={exam.scheduledEnd}
        />
      ) : null}

      {copyDialogOpen ? (
        <CopyExamDialog
          open={copyDialogOpen}
          onOpenChange={setCopyDialogOpen}
          currentClassId={classId}
          onCopy={copyExam}
          defaultStart={exam.scheduledStart}
          defaultEnd={exam.scheduledEnd}
        />
      ) : null}

      <AssignExamStudentsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        classId={classId}
        examId={examId}
      />
    </div>
  )
}
