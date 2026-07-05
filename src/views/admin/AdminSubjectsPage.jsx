import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Box, PenLine, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { fetchAdminClasses } from '@/lib/adminClassesApi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import { formatSemesterLabel } from '@/lib/sectionLabel.js'
import '../../pages/admin-ui/style.css'

const ARCHIVE_KEY = 'acsis_admin_archived_classes'

const emptyForm = { title: '', code: '', year: '', section: '' }

function readArchivedIds() {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeArchivedIds(ids) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(ids))
}

function mapClassToSubject(c) {
  return {
    id: c.id,
    title: c.name || 'Untitled class',
    code: c.courseCode || '—',
    year: c.academicYear || '—',
    section: formatSemesterLabel(c.semester) || '—',
    professor: c.professorName || '—',
  }
}

function SubjectFormFields({ form, onChange, idPrefix = 'sub' }) {
  return (
    <>
      <div className="admin-modal-field">
        <label htmlFor={`${idPrefix}-title`}>Course title</label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="e.g. Information Security"
        />
      </div>
      <div className="admin-modal-field">
        <label htmlFor={`${idPrefix}-code`}>Subject code</label>
        <input
          id={`${idPrefix}-code`}
          type="text"
          value={form.code}
          onChange={(e) => onChange({ ...form, code: e.target.value })}
          placeholder="e.g. IT 108"
        />
      </div>
      <div className="admin-modal-field">
        <label htmlFor={`${idPrefix}-year`}>School year</label>
        <input
          id={`${idPrefix}-year`}
          type="text"
          value={form.year}
          onChange={(e) => onChange({ ...form, year: e.target.value })}
          placeholder="e.g. 2025–2026"
        />
      </div>
      <div className="admin-modal-field">
        <label htmlFor={`${idPrefix}-section`}>Term / section</label>
        <input
          id={`${idPrefix}-section`}
          type="text"
          value={form.section}
          onChange={(e) => onChange({ ...form, section: e.target.value })}
          placeholder="e.g. 1st"
        />
      </div>
    </>
  )
}

export default function AdminSubjectsPage() {
  const { acronym } = useInstitutionTheme()
  const [subjects, setSubjects] = useState([])
  const [archivedIds, setArchivedIds] = useState(() => readArchivedIds())
  const [filterYear, setFilterYear] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [activeSubject, setActiveSubject] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const classes = await fetchAdminClasses()
      setSubjects((classes || []).map(mapClassToSubject))
    } catch (err) {
      setSubjects([])
      const msg = err instanceof Error ? err.message : 'Failed to load subjects.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const years = useMemo(() => [...new Set(subjects.map((s) => s.year).filter(Boolean))], [subjects])
  const sections = useMemo(
    () => [...new Set(subjects.map((s) => s.section).filter(Boolean))],
    [subjects],
  )

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const isArchived = archivedIds.includes(s.id)
      if (!showArchived && isArchived) return false
      if (showArchived && !isArchived) return false
      if (filterYear && s.year !== filterYear) return false
      if (filterSection && s.section !== filterSection) return false
      return true
    })
  }, [subjects, archivedIds, showArchived, filterYear, filterSection])

  function openAdd() {
    setEditOpen(false)
    setActiveSubject(null)
    setForm({ ...emptyForm })
    setAddOpen(true)
  }

  function openEdit(sub) {
    setAddOpen(false)
    setActiveSubject(sub)
    setForm({
      title: sub.title,
      code: sub.code,
      year: sub.year,
      section: sub.section,
    })
    setEditOpen(true)
  }

  function closeAddDialog(open) {
    setAddOpen(open)
    if (!open) {
      setForm({ ...emptyForm })
      setActiveSubject(null)
    }
  }

  function closeEditDialog(open) {
    setEditOpen(open)
    if (!open) {
      setActiveSubject(null)
      setForm({ ...emptyForm })
    }
  }

  function openArchiveConfirm(sub) {
    setActiveSubject(sub)
    setArchiveOpen(true)
  }

  function confirmArchive() {
    if (!activeSubject) return
    const isArchived = archivedIds.includes(activeSubject.id)
    const next = isArchived
      ? archivedIds.filter((x) => x !== activeSubject.id)
      : [...archivedIds, activeSubject.id]
    setArchivedIds(next)
    writeArchivedIds(next)
    acsisToastSuccess(isArchived ? 'Class unarchived (demo).' : 'Class archived (demo).')
    setArchiveOpen(false)
    setActiveSubject(null)
  }

  function saveAdd() {
    acsisToastSuccess('Subject added (demo — connect API to persist).')
    setAddOpen(false)
    setForm(emptyForm)
  }

  function saveEdit() {
    if (!activeSubject) return
    setSubjects((list) =>
      list.map((s) =>
        s.id === activeSubject.id
          ? { ...s, title: form.title, code: form.code, year: form.year, section: form.section }
          : s,
      ),
    )
    acsisToastSuccess('Subject updated (demo — connect API to persist).')
    setEditOpen(false)
    setActiveSubject(null)
  }

  const archiveIsUnarchive = activeSubject && archivedIds.includes(activeSubject.id)

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Subjects</span>
        </div>
      </div>

      <div className="content-body">
        <div className="section-header">
          <h2>Subject management</h2>
          <button type="button" className="btn" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Subject
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
          Each card is a <strong>class instance</strong> (course + school year + term). Filters apply to
          the list below; archive hides instances from the default view.
        </p>

        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="subject-toolbar">
          <label className="subject-filter">
            <span className="subject-filter__label">Year</span>
            <select
              className="subject-filter__select"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="subject-filter">
            <span className="subject-filter__label">Section</span>
            <select
              className="subject-filter__select"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="subject-filter subject-filter--checkbox">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span>Show archived only</span>
          </label>
        </div>

        {loading ? (
          <p className="um-loading">Loading subjects…</p>
        ) : filtered.length === 0 ? (
          <p className="subject-empty-msg">No subjects match the current filters.</p>
        ) : (
          <div className="subject-grid">
            {filtered.map((sub, index) => {
              const isArchived = archivedIds.includes(sub.id)
              return (
                <FadeIn
                  key={sub.id}
                  delay={index * 0.04}
                  className={`subject-card${isArchived ? ' subject-card--archived' : ''}`}
                >
                  <div className="subject-card-header">
                    <div>
                      <h3 className="subject-title">{sub.title}</h3>
                      <p className="subject-code">{sub.code}</p>
                    </div>
                    <div className="subject-actions">
                      {isArchived ? <span className="tag tag--archived">Archived</span> : null}
                      <button
                        type="button"
                        className="action-btn edit-btn"
                        title="Edit"
                        onClick={() => openEdit(sub)}
                      >
                        <PenLine className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="action-btn archive-btn"
                        title={isArchived ? 'Unarchive' : 'Archive'}
                        onClick={() => openArchiveConfirm(sub)}
                      >
                        {isArchived ? (
                          <Box className="h-4 w-4" aria-hidden />
                        ) : (
                          <Archive className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="subject-tags">
                    <span className="tag green">{sub.year}</span>
                    <span className="tag blue">{sub.section}</span>
                  </div>
                  <p className="subject-instance-faculty">Prof. {sub.professor}</p>
                </FadeIn>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={closeAddDialog}>
        <DialogContent className="admin-dialog-content" aria-describedby={undefined}>
          <div className="admin-dialog-header">
            <DialogTitle className="admin-dialog-title">Add subject</DialogTitle>
            <DialogDescription className="admin-dialog-desc">
              Create a new class instance (course + year + term). Saved locally until the API is connected.
            </DialogDescription>
          </div>
          <div className="admin-dialog-body">
            <SubjectFormFields form={form} onChange={setForm} idPrefix="add-sub" />
          </div>
          <div className="admin-dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={() => closeAddDialog(false)}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={saveAdd}>
              Save subject
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={closeEditDialog}>
        <DialogContent className="admin-dialog-content" aria-describedby={undefined}>
          <div className="admin-dialog-header">
            <DialogTitle className="admin-dialog-title">Edit subject</DialogTitle>
            <DialogDescription className="admin-dialog-desc">
              Update this class instance. Changes are demo-only until the admin API is wired.
            </DialogDescription>
          </div>
          <div className="admin-dialog-body">
            <SubjectFormFields form={form} onChange={setForm} idPrefix="edit-sub" />
          </div>
          <div className="admin-dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={() => closeEditDialog(false)}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={saveEdit}>
              Save changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="admin-dialog-content" aria-describedby={undefined}>
          <div className="admin-dialog-header">
            <DialogTitle className="admin-dialog-title">
              {archiveIsUnarchive ? 'Unarchive subject?' : 'Archive subject?'}
            </DialogTitle>
            <DialogDescription className="admin-dialog-desc">
              {archiveIsUnarchive
                ? `Restore "${activeSubject?.title}" to the active catalog.`
                : `Archive "${activeSubject?.title}"? It will be hidden unless you filter archived items.`}
            </DialogDescription>
          </div>
          <div className="admin-dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={() => setArchiveOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={confirmArchive}>
              {archiveIsUnarchive ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
