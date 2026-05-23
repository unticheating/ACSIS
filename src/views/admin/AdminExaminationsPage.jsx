import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { examStatusBadgeClass, examStatusLabel, fetchAdminClasses } from '@/lib/adminClassesApi.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import '../../pages/admin-ui/style.css'

const EXAM_ARCHIVE_KEY = 'acsis_admin_archived_exams'

function readArchivedExamIds() {
  try {
    return JSON.parse(localStorage.getItem(EXAM_ARCHIVE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeArchivedExamIds(ids) {
  localStorage.setItem(EXAM_ARCHIVE_KEY, JSON.stringify(ids))
}

function ExamRow({ exam, delay = 0, archived = false, onRequestArchive, onRequestUnarchive }) {
  const [open, setOpen] = useState(false)
  const title = exam.title || 'Untitled exam'

  return (
    <FadeIn delay={delay} className={`admin-exam-row${open ? ' admin-exam-row--open' : ''}${archived ? ' admin-exam-row--archived' : ''}`}>
      <button
        type="button"
        className="admin-exam-row__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-exam-row__title">{title}</span>
        <ChevronDown className="admin-exam-row__chevron" aria-hidden />
      </button>
      {open ? (
        <div className="admin-exam-row__detail-wrap">
          <dl className="admin-exam-row__detail">
            <div>
              <dt>Exam code</dt>
              <dd className="font-mono text-xs">{exam.code || '—'}</dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>{Number(exam.questionCount || 0)}</dd>
            </div>
            <div>
              <dt>Time limit</dt>
              <dd>{Number(exam.duration || 0)} min</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                {Number(exam.submittedCount || 0)} / {Number(exam.joinedCount || 0)} joined
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {archived ? (
                  <span className="exam-status-badge status-archived">Archived</span>
                ) : (
                  <span className={`exam-status-badge status-${examStatusBadgeClass(exam.status)}`}>
                    {examStatusLabel(exam.status)}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <div className="admin-exam-row__actions">
            {archived ? (
              <button
                type="button"
                className="exam-archive-btn exam-archive-btn--ghost"
                onClick={() => onRequestUnarchive(exam)}
              >
                Unarchive
              </button>
            ) : (
              <button
                type="button"
                className="exam-archive-btn exam-archive-btn--primary"
                onClick={() => onRequestArchive(exam)}
              >
                Archive
              </button>
            )}
          </div>
        </div>
      ) : null}
    </FadeIn>
  )
}

function ExamCard({ exam, onRequestArchive, onRequestUnarchive }) {
  const archived = exam._archived
  const progress =
    exam.total > 0 ? Math.round((Number(exam.submittedCount || 0) / Number(exam.joinedCount || 1)) * 100) : 0
  const statusClass = archived ? 'archived' : examStatusBadgeClass(exam.status)
  const statusLabel = archived ? 'Archived' : examStatusLabel(exam.status)

  return (
    <div className={`exam-card${archived ? ' exam-card--archived' : ''}`}>
      <div className="exam-card-header">
        <div className="exam-card-title-group">
          <h3 className="exam-card-title">{exam.title}</h3>
          <p className="exam-card-meta">
            {exam.className} · by {exam.professorName}
          </p>
        </div>
        <span className={`exam-status-badge status-${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="exam-card-footer">
        <span className="exam-done-label">
          {Number(exam.submittedCount || 0)} / {Number(exam.joinedCount || 0)} joined
        </span>
        <div className="exam-card-actions">
          {archived ? (
            <button
              type="button"
              className="exam-archive-btn exam-archive-btn--ghost"
              onClick={() => onRequestUnarchive(exam)}
            >
              Unarchive
            </button>
          ) : (
            <button
              type="button"
              className="exam-archive-btn exam-archive-btn--primary"
              onClick={() => onRequestArchive(exam)}
            >
              Archive
            </button>
          )}
        </div>
      </div>
      <div className="exam-progress-bar">
        <div className={`exam-progress-fill status-${statusClass}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  )
}

function ClassRow({ classItem, delay = 0, archivedExamIds, onRequestArchive, onRequestUnarchive }) {
  const [open, setOpen] = useState(false)
  const exams = (classItem.exams || []).filter((ex) => !archivedExamIds.includes(ex.id))
  const examCount = exams.length

  return (
    <FadeIn delay={delay} className={`admin-class-row${open ? ' admin-class-row--open' : ''}`}>
      <button
        type="button"
        className="admin-class-row__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-class-row__title">{classItem.name}</span>
        <span className="admin-class-row__meta">
          <span className="admin-class-row__count">
            {examCount} exam{examCount === 1 ? '' : 's'}
          </span>
          <ChevronDown className="admin-class-row__chevron" aria-hidden />
        </span>
      </button>
      {open ? (
        <div className="admin-class-row__body">
          <div className="admin-class-row__badges">
            <Badge variant="secondary">{classItem.academicYear}</Badge>
            <Badge variant="outline">{classItem.semester}</Badge>
            <Badge variant="outline">Prof. {classItem.professorName}</Badge>
            {classItem.accessCode ? (
              <Badge variant="outline" className="font-mono text-xs">
                Class code {classItem.accessCode}
              </Badge>
            ) : null}
          </div>
          {examCount === 0 ? (
            <p className="text-sm text-muted-foreground">No active exams in this class.</p>
          ) : (
            <div className="admin-exam-list">
              {exams.map((ex, index) => (
                <ExamRow
                  key={ex.id}
                  exam={ex}
                  delay={index * 0.05}
                  onRequestArchive={onRequestArchive}
                  onRequestUnarchive={onRequestUnarchive}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </FadeIn>
  )
}

export default function AdminExaminationsPage({ pageTitle = 'Classes' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const examView = searchParams.get('view') === 'archived' ? 'archived' : 'active'

  const [classes, setClasses] = useState([])
  const [archivedExamIds, setArchivedExamIds] = useState(() => readArchivedExamIds())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [pendingExam, setPendingExam] = useState(null)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminClasses()
      setClasses(data)
    } catch (err) {
      setClasses([])
      const msg = err instanceof Error ? err.message : 'Failed to load classes.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const flatExams = useMemo(() => {
    const list = []
    for (const c of classes) {
      for (const ex of c.exams || []) {
        list.push({
          ...ex,
          className: c.name,
          professorName: c.professorName,
          _archived: archivedExamIds.includes(ex.id),
        })
      }
    }
    return list
  }, [classes, archivedExamIds])

  const gridExams = useMemo(
    () => flatExams.filter((ex) => (examView === 'archived' ? ex._archived : !ex._archived)),
    [flatExams, examView],
  )

  function setExamView(view) {
    setSearchParams(view === 'archived' ? { view: 'archived' } : {})
  }

  function requestArchive(exam) {
    setPendingExam({ ...exam, _action: 'archive' })
    setArchiveDialogOpen(true)
  }

  function requestUnarchive(exam) {
    setPendingExam({ ...exam, _action: 'unarchive' })
    setArchiveDialogOpen(true)
  }

  function confirmExamArchiveAction() {
    if (!pendingExam) return
    const id = pendingExam.id
    if (pendingExam._action === 'unarchive') {
      const next = archivedExamIds.filter((x) => x !== id)
      setArchivedExamIds(next)
      writeArchivedExamIds(next)
      acsisToastSuccess('Exam unarchived (demo).')
    } else {
      const next = archivedExamIds.includes(id) ? archivedExamIds : [...archivedExamIds, id]
      setArchivedExamIds(next)
      writeArchivedExamIds(next)
      // UPDATE exams SET is_archived = TRUE WHERE exam_id = ?
      acsisToastSuccess('Exam archived (demo).')
    }
    setArchiveDialogOpen(false)
    setPendingExam(null)
  }

  function closeArchiveDialog(open) {
    setArchiveDialogOpen(open)
    if (!open) setPendingExam(null)
  }

  const pendingIsUnarchive = pendingExam?._action === 'unarchive'
  const pendingTitle = pendingExam?.title || 'this exam'

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{pageTitle}</span>
        </div>
      </div>

      <div className="content-body">
        <div className="um-topbar exam-filter-bar">
          <div className="um-tabs" role="tablist" aria-label="Exam archive filter">
            <button
              type="button"
              className={`um-tab${examView === 'active' ? ' active' : ''}`}
              onClick={() => setExamView('active')}
            >
              Active Exams
            </button>
            <button
              type="button"
              className={`um-tab${examView === 'archived' ? ' active' : ''}`}
              onClick={() => setExamView('archived')}
            >
              Archived Exams
            </button>
          </div>
        </div>

        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground mb-4">Loading…</p>
        ) : (
          <div className="exam-card-grid mb-6">
            {gridExams.length === 0 ? (
              <p className="admin-placeholder-lead" style={{ gridColumn: '1 / -1' }}>
                {examView === 'archived'
                  ? 'No archived examinations.'
                  : 'No active examinations. Archive state is stored locally until the API is wired.'}
              </p>
            ) : (
              gridExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onRequestArchive={requestArchive}
                  onRequestUnarchive={requestUnarchive}
                />
              ))
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4 w-full">
          View-only: expand a class to see active exams (archived exams are hidden from the list below).
        </p>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Classes &amp; exams</CardTitle>
            <CardDescription>Tap a row to see class info and exam details.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes yet. Faculty can create classes from My Classes.
              </p>
            ) : (
              <div className="admin-class-list">
                {classes.map((c, index) => (
                  <ClassRow
                    key={c.id}
                    classItem={c}
                    delay={index * 0.05}
                    archivedExamIds={archivedExamIds}
                    onRequestArchive={requestArchive}
                    onRequestUnarchive={requestUnarchive}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={archiveDialogOpen} onOpenChange={closeArchiveDialog}>
        <DialogContent className="admin-dialog-content" aria-describedby={undefined}>
          <div className="admin-dialog-header">
            <DialogTitle className="admin-dialog-title">
              {pendingIsUnarchive ? 'Unarchive examination?' : 'Archive examination?'}
            </DialogTitle>
            <DialogDescription className="admin-dialog-desc">
              {pendingIsUnarchive
                ? `"${pendingTitle}" will return to the active exam list and class accordion.`
                : `"${pendingTitle}" will be hidden from active lists and moved to Archived Exams.`}
            </DialogDescription>
          </div>
          <div className="admin-dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={() => closeArchiveDialog(false)}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={confirmExamArchiveAction}>
              {pendingIsUnarchive ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
