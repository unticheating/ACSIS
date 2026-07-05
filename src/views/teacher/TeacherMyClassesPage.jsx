import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Archive, ArchiveRestore, ChevronDown, MoreVertical, Plus, Trash2, Pencil } from 'lucide-react'
import AnimatedHoverIcon from '@/components/icons/AnimatedHoverIcon.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { UserPlusIcon } from '@/components/icons/hoverIcons.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.jsx'
import TeacherCourseCard from '@/components/teacher/TeacherCourseCard.jsx'
import TeacherAddCourseDialog from '@/components/teacher/TeacherAddCourseDialog.jsx'
import { formatSectionTitle, formatTermPeriod } from '@/lib/sectionLabel.js'
import { countFolderCourses, groupSectionGroupsByTermFolder } from '@/lib/termFolders.js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
import '../../pages/teacher-ui/my_classes.css'
import '../../styles/class-card-patterns.css'
import '../../styles/scrollbars.css'
import '../../pages/student-ui/enrolled_classes.css'

/**
 * @param {{
 *   group: { term: object, courses: object[], isOrphan?: boolean },
 *   isOpen: boolean,
 *   onToggle: () => void,
 *   onAddCourse: (term: object) => void,
 *   onEdit?: (term: object) => void,
 *   onArchive?: (id: string|number) => void,
 *   onRestore?: (id: string|number) => void,
 *   onDelete?: (term: object) => void,
 *   dimmed?: boolean,
 * }} props
 */
function SectionCardItem({ group, isOpen, onToggle, onAddCourse, onEdit, onArchive, onRestore, onDelete, dimmed = false, delay = 0, provided, isDragging }) {
  const { term, courses, isOrphan } = group
  const title = isOrphan ? 'Other courses' : formatSectionTitle(term)
  const period = isOrphan ? 'Not linked to a section' : formatTermPeriod(term)
  const count = courses.length
  const panelId = `section-panel-${term.id}`
  const canManage = !isOrphan
  const [dropMounted, setDropMounted] = useState(false)

  useLayoutEffect(() => {
    if (isOpen) setDropMounted(true)
  }, [isOpen])

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      style={{
        ...provided?.draggableProps.style,
        ...(isDragging ? { zIndex: 100 } : {})
      }}
      className={isDragging ? 'opacity-90 scale-[1.02] shadow-2xl z-50' : ''}
    >
      <FadeIn as="article" delay={delay}
        className={`acsis-section-card${isOpen ? ' acsis-section-card--open' : ''}${term.isArchived || dimmed ? ' acsis-section-card--archived' : ''}${dimmed ? ' acsis-section-card--dimmed' : ''}`}
      >
        <div
          className="acsis-section-card__surface"
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls={panelId}
          id={`section-trigger-${term.id}`}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggle()
            }
          }}
          {...provided?.dragHandleProps}
        >
        {canManage ? (
          <div className="acsis-section-card__menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="acsis-class-card__menu-btn"
                  aria-label={`Options for ${title}`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={18} strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[11rem]" onClick={(e) => e.stopPropagation()}>
                {!term.isArchived ? (
                  <DropdownMenuActionItem icon={Plus} onSelect={() => onAddCourse(term)}>
                    Add course
                  </DropdownMenuActionItem>
                ) : null}
                {!term.isArchived ? (
                  <DropdownMenuActionItem icon={Pencil} onSelect={() => onEdit?.(term)}>
                    Edit section
                  </DropdownMenuActionItem>
                ) : null}
                {!term.isArchived ? <DropdownMenuSeparator /> : null}
                {term.isArchived ? (
                  <DropdownMenuActionItem
                    icon={ArchiveRestore}
                    variant="success"
                    onSelect={() => onRestore?.(term.id)}
                  >
                    Restore section
                  </DropdownMenuActionItem>
                ) : (
                  <DropdownMenuActionItem icon={Archive} variant="warning" onSelect={() => onArchive?.(term.id)}>
                    Archive section
                  </DropdownMenuActionItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuActionItem
                  icon={Trash2}
                  variant="destructive"
                  onSelect={() => onDelete?.(term)}
                >
                  Delete section
                </DropdownMenuActionItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
        <div className="acsis-section-card__copy">
          {!isOrphan && period ? <p className="acsis-section-card__eyebrow">{period}</p> : null}
          <h2 className="acsis-section-card__title">{title}</h2>
          <div className="acsis-section-card__trail">
            <span className="acsis-section-card__stat">
              {count} {count === 1 ? 'course' : 'courses'}
            </span>
            <span className={`acsis-section-card__chev-wrap${isOpen ? ' acsis-section-card__chev-wrap--open' : ''}`}>
              <ChevronDown className="acsis-section-card__chev" size={18} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`section-trigger-${term.id}`}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`acsis-section-card__drop acsis-scroll-y${isOpen ? ' acsis-section-card__drop--open' : ''}`}
      >
        <div className="acsis-section-card__drop-inner">
          {dropMounted ? (
          count === 0 ? (
            <p className="acsis-section-card__empty">
              No courses yet.
              {canManage && !term.isArchived ? (
                <>
                  {' '}
                  <button type="button" className="acsis-section-card__empty-link" onClick={() => onAddCourse(term)}>
                    Add course
                  </button>
                </>
              ) : null}
            </p>
          ) : (
            <>
              <h3 className="acsis-section-card__courses-title">Courses</h3>
              <ul className="acsis-mc-course-grid acsis-mc-course-grid--stack">
                {courses.map((c) => (
                  <TeacherCourseCard key={c.id} course={c} dimmed={dimmed} />
                ))}
              </ul>
            </>
          )
          ) : null}
        </div>
      </div>
    </FadeIn>
    </div>
  )
}

/**
 * @param {{
 *   folder: { key: string, label: string, sections: object[] },
 *   isOpen: boolean,
 *   onToggle: () => void,
 *   dimmed?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
function TermFolder({ folder, isOpen, onToggle, dimmed = false, children }) {
  const sectionCount = folder.sections.length
  const courseCount = countFolderCourses(folder)
  const panelId = `term-folder-${folder.key}`

  return (
    <section
      className={`acsis-term-folder${isOpen ? ' acsis-term-folder--open' : ''}${dimmed ? ' acsis-term-folder--dimmed' : ''}`}
    >
      <button
        type="button"
        className="acsis-term-folder__header"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="acsis-term-folder__copy">
          <span className="acsis-section-card__eyebrow">Archived term</span>
          <span className="acsis-section-card__title acsis-term-folder__title">{folder.label}</span>
          <span className="acsis-section-card__trail">
            <span className="acsis-section-card__stat">
              {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
              {' · '}
              {courseCount} {courseCount === 1 ? 'course' : 'courses'}
            </span>
            <span className={`acsis-section-card__chev-wrap${isOpen ? ' acsis-section-card__chev-wrap--open' : ''}`}>
              <ChevronDown className="acsis-section-card__chev" size={18} strokeWidth={2} aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
      <div
        id={panelId}
        className={`acsis-term-folder__body${isOpen ? ' acsis-term-folder__body--open' : ''}`}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
      >
        {isOpen ? children : null}
      </div>
    </section>
  )
}

function AddSectionButton({ onClick, className = 'acsis-mc-create-btn' }) {
  const iconRef = useRef(null)
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
      aria-label="Add section"
    >
      <AnimatedHoverIcon
        ref={iconRef}
        icon={UserPlusIcon}
        size={18}
        strokeWidth={2}
        className="acsis-mc-create-btn__icon"
      />
      Add section
    </button>
  )
}

export default function TeacherMyClassesPage() {
  const location = useLocation()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  const listRef = useRef(null)
  const archivedListRef = useRef(null)
  const [sections, setSections] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [openSectionId, setOpenSectionId] = useState(/** @type {string|null} */ (null))
  const [openArchivedSectionId, setOpenArchivedSectionId] = useState(/** @type {string|null} */ (null))
  const [createOpen, setCreateOpen] = useState(false)
  const [addCourseTerm, setAddCourseTerm] = useState(null)
  const [createProgram, setCreateProgram] = useState('BSIT')
  const [createSectionCode, setCreateSectionCode] = useState('3D')
  const [createAy, setCreateAy] = useState('2025-2026')
  const [createSem, setCreateSem] = useState('1st')
  const [creating, setCreating] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [openArchivedFolderKeys, setOpenArchivedFolderKeys] = useState(/** @type {Set<string>|null} */ (null))

  const [editTerm, setEditTerm] = useState(null)
  const [editProgram, setEditProgram] = useState('')
  const [editSectionCode, setEditSectionCode] = useState('')
  const [editAy, setEditAy] = useState('')
  const [editSem, setEditSem] = useState('')
  const [editing, setEditing] = useState(false)

  function handleOpenEdit(term) {
    setEditProgram(term.programCode || '')
    setEditSectionCode(term.sectionCode || '')
    setEditAy(term.academicYear || '')
    setEditSem(term.semester || '')
    setEditTerm(term)
  }

  async function handleEditSection(e) {
    e.preventDefault()
    if (!editTerm) return
    setEditing(true)
    try {
      const success = await patchSection(editTerm.id, {
        programCode: editProgram.trim(),
        sectionCode: editSectionCode.trim(),
        academicYear: editAy.trim(),
        semester: editSem.trim()
      })
      if (success) {
        acsisToastSuccess('Section updated.')
        setEditTerm(null)
      }
    } finally {
      setEditing(false)
    }
  }

  const fetchAll = useCallback(async () => {
    try {
      const [termsRes, classesRes] = await Promise.all([
        apiFetch('/api/teacher/terms?archived=true'),
        apiFetch('/api/teacher/classes'),
      ])
      if (termsRes.ok) setSections(await termsRes.json())
      if (classesRes.ok) setCourses(await classesRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!openSectionId && !openArchivedSectionId) return undefined
    function onPointerDown(e) {
      if (listRef.current?.contains(e.target)) return
      if (archivedListRef.current?.contains(e.target)) return
      setOpenSectionId(null)
      setOpenArchivedSectionId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openSectionId, openArchivedSectionId])

  const termById = useMemo(() => {
    const map = new Map()
    for (const t of sections) map.set(String(t.id), t)
    return map
  }, [sections])

  const coursesByTermId = useMemo(() => {
    const byTerm = new Map()
    const orphans = []

    for (const c of courses) {
      if (!c.termId) {
        orphans.push(c)
        continue
      }
      const key = String(c.termId)
      if (!byTerm.has(key)) byTerm.set(key, [])
      byTerm.get(key).push(c)
    }

    for (const [, list] of byTerm) {
      list.sort((a, b) =>
        (a.courseCode || a.name || '').localeCompare(b.courseCode || b.name || '', undefined, {
          sensitivity: 'base',
        }),
      )
    }

    orphans.sort((a, b) =>
      (a.courseCode || a.name || '').localeCompare(b.courseCode || b.name || '', undefined, { sensitivity: 'base' }),
    )

    return { byTerm, orphans }
  }, [courses])

  const activeSectionGroups = useMemo(() => {
    const groups = []
    const seen = new Set()

    for (const term of sections.filter((s) => !s.isArchived)) {
      const key = String(term.id)
      seen.add(key)
      groups.push({
        term,
        courses: coursesByTermId.byTerm.get(key) || [],
      })
    }

    for (const [termId, list] of coursesByTermId.byTerm) {
      if (seen.has(termId)) continue
      const term = termById.get(termId)
      if (!term || term.isArchived) continue
      groups.push({ term, courses: list })
      seen.add(termId)
    }

    if (coursesByTermId.orphans.length > 0) {
      groups.push({
        term: { id: '_other', programCode: '', sectionCode: 'Other', academicYear: '', semester: '' },
        courses: coursesByTermId.orphans,
        isOrphan: true,
      })
    }

    return groups
  }, [sections, coursesByTermId, termById])

  const archivedSectionGroups = useMemo(() => {
    const groups = sections
      .filter((s) => s.isArchived)
      .map((term) => ({
        term,
        courses: coursesByTermId.byTerm.get(String(term.id)) || [],
      }))
    return groups
  }, [sections, coursesByTermId])

  const archivedFolderGroups = useMemo(
    () => groupSectionGroupsByTermFolder(archivedSectionGroups),
    [archivedSectionGroups],
  )

  const activeSections = sections.filter((s) => !s.isArchived)
  const archivedSections = sections.filter((s) => s.isArchived)

  useEffect(() => {
    if (loading) return
    const expandId = location.state?.expandSectionId
    if (expandId != null) {
      setOpenSectionId(String(expandId))
    }
  }, [loading, location.state?.expandSectionId])

  useEffect(() => {
    if (loading || archivedFolderGroups.length === 0) return
    setOpenArchivedFolderKeys((prev) => prev ?? new Set(archivedFolderGroups.map((f) => f.key)))
  }, [loading, archivedFolderGroups])

  function toggleSection(id) {
    const key = String(id)
    setOpenSectionId((prev) => (prev === key ? null : key))
  }

  function toggleArchivedSection(id) {
    const key = String(id)
    setOpenArchivedSectionId((prev) => (prev === key ? null : key))
  }

  function toggleArchivedFolder(key) {
    setOpenArchivedFolderKeys((prev) => {
      const next = new Set(prev || [])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleDragEnd(result) {
    setDraggingId(null)
    if (!result.destination) return

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) return

    const activeTerms = activeSectionGroups.map((g) => g.term)
    const [reorderedItem] = activeTerms.splice(sourceIndex, 1)
    activeTerms.splice(destinationIndex, 0, reorderedItem)

    const newSections = []
    const activeIds = new Set(activeTerms.map(t => String(t.id)))
    for (const t of activeTerms) {
      if (t.id !== '_other') newSections.push(t)
    }
    for (const t of sections) {
      if (!activeIds.has(String(t.id))) newSections.push(t)
    }
    setSections(newSections)

    try {
      const termIds = activeTerms.filter(t => t.id !== '_other').map(t => t.id)
      await apiFetch('/api/teacher/terms/sort', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termIds })
      })
    } catch (err) {
      console.error('Failed to save sort order:', err)
      acsisToastError('Failed to save section order.')
    }
  }

  async function patchSection(id, body) {
    const res = await apiFetch(`/api/teacher/terms/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      acsisToastError(data.error || 'Could not update section.')
      return false
    }
    await fetchAll()
    return true
  }

  async function handleArchiveSection(id) {
    const ok = await confirm({
      title: 'Archive this section?',
      description: 'You can restore it from Archived.',
      confirmLabel: 'Archive',
    })
    if (!ok) return
    const success = await patchSection(id, { isArchived: true })
    if (success) acsisToastSuccess('Section archived.')
    if (String(id) === openSectionId) setOpenSectionId(null)
  }

  async function handleRestoreSection(id) {
    const success = await patchSection(id, { isArchived: false })
    if (success) acsisToastSuccess('Section restored.')
  }

  async function handleDeleteSection(section) {
    const title = formatSectionTitle(section)
    const count = section.classCount ?? coursesByTermId.byTerm.get(String(section.id))?.length ?? 0
    const detail =
      count > 0
        ? `This will permanently delete ${title} and all ${count} course(s) with their exams.`
        : `This will permanently delete ${title}.`
    const ok = await confirm({
      title: 'Delete this section?',
      description: `${detail} This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      const res = await apiFetch(`/api/teacher/terms/${encodeURIComponent(section.id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        acsisToastError(data.error || 'Could not delete section.')
        return
      }
      if (String(section.id) === openSectionId) setOpenSectionId(null)
      acsisToastSuccess('Section deleted.')
      await fetchAll()
    } catch {
      acsisToastError('Network error. Please try again.')
    }
  }

  async function handleCreateSection(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await apiFetch('/api/teacher/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programCode: createProgram.trim(),
          sectionCode: createSectionCode.trim(),
          academicYear: createAy.trim(),
          semester: createSem.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        acsisToastError(data.error || 'Failed to add section.')
        return
      }
      const codeMsg = data.accessCode ? ` Access code: ${data.accessCode}.` : ''
      acsisToastSuccess(`Section created.${codeMsg}`)
      setCreateOpen(false)
      if (data.id != null) {
        setOpenSectionId(String(data.id))
      }
      await fetchAll()
    } catch {
      acsisToastError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const headerMeta = loading ? undefined : `${activeSections.length} sections`

  return (
    <div className="acsis-mc-view acsis-view">
      <TeacherPageHeader
        title="My Classes"
        meta={headerMeta}
        actions={<AddSectionButton onClick={() => setCreateOpen(true)} />}
      />

      <div className="acsis-mc-content">
        {loading ? (
          <PageSpinner label="Loading sections and courses…" />
        ) : activeSectionGroups.length === 0 ? (
          <div className="acsis-mc-empty">
            <h2 className="acsis-mc-empty__title">No sections yet</h2>
            <p className="acsis-mc-empty__text">Add a section, open it, and add courses from the menu.</p>
            <AddSectionButton onClick={() => setCreateOpen(true)} />
          </div>
        ) : (
          <>
            <DragDropContext
              onDragStart={(start) => setDraggingId(start.draggableId)}
              onDragEnd={handleDragEnd}
            >
              <Droppable droppableId="teacher-sections">
                {(provided) => (
                  <div
                    ref={(node) => {
                      provided.innerRef(node)
                      listRef.current = node
                    }}
                    {...provided.droppableProps}
                    className="acsis-section-card-list"
                  >
                    {activeSectionGroups.map((group, index) => (
                      <Draggable
                        key={group.term.id}
                        draggableId={String(group.term.id)}
                        index={index}
                        isDragDisabled={group.isOrphan}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <SectionCardItem
                            group={group}
                            isOpen={openSectionId === String(group.term.id)}
                            onToggle={() => toggleSection(group.term.id)}
                            onAddCourse={(term) => setAddCourseTerm(term)}
                            onEdit={handleOpenEdit}
                            onArchive={handleArchiveSection}
                            onRestore={handleRestoreSection}
                            onDelete={handleDeleteSection}
                            delay={index * 0.05}
                            provided={dragProvided}
                            isDragging={dragSnapshot.isDragging}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {archivedSections.length > 0 ? (
              <div className="acsis-archived-reveal">
                <button
                  type="button"
                  className="acsis-archived-reveal__toggle"
                  aria-expanded={archivedOpen}
                  onClick={() => {
                    setArchivedOpen((prev) => {
                      if (prev) setOpenArchivedSectionId(null)
                      return !prev
                    })
                  }}
                >
                  <span>
                    {archivedOpen
                      ? 'Hide archived sections'
                      : `Archived sections (${archivedSections.length})`}
                  </span>
                  <ChevronDown
                    className={`acsis-archived-reveal__chevron${archivedOpen ? ' acsis-archived-reveal__chevron--open' : ''}`}
                    aria-hidden
                  />
                </button>

                {archivedOpen ? (
                  <div ref={archivedListRef} className="acsis-term-folder-list acsis-term-folder-list--archived">
                    {archivedFolderGroups.map((folder) => (
                      <TermFolder
                        key={folder.key}
                        folder={folder}
                        dimmed
                        isOpen={openArchivedFolderKeys?.has(folder.key) ?? true}
                        onToggle={() => toggleArchivedFolder(folder.key)}
                      >
                        <div className="acsis-section-card-list acsis-section-card-list--in-folder acsis-section-card-list--archived">
                          {folder.sections.map((group, index) => (
                            <SectionCardItem
                              key={group.term.id}
                              group={group}
                              dimmed
                              isOpen={openArchivedSectionId === String(group.term.id)}
                              onToggle={() => toggleArchivedSection(group.term.id)}
                              onAddCourse={(term) => setAddCourseTerm(term)}
                              onEdit={handleOpenEdit}
                              onArchive={handleArchiveSection}
                              onRestore={handleRestoreSection}
                              onDelete={handleDeleteSection}
                              delay={index * 0.05}
                            />
                          ))}
                        </div>
                      </TermFolder>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <TeacherAddCourseDialog
        open={Boolean(addCourseTerm)}
        onOpenChange={(open) => {
          if (!open) setAddCourseTerm(null)
        }}
        term={addCourseTerm}
        existingCourses={courses}
        onCreated={() => fetchAll()}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSection}>
            <DialogHeader>
              <DialogTitle>Add section</DialogTitle>
              <DialogDescription>Program, section code, academic year, and term.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="sec-program">Program</Label>
                  <Input
                    id="sec-program"
                    value={createProgram}
                    onChange={(e) => setCreateProgram(e.target.value)}
                    placeholder="BSIT"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sec-code">Section</Label>
                  <Input
                    id="sec-code"
                    value={createSectionCode}
                    onChange={(e) => setCreateSectionCode(e.target.value)}
                    placeholder="3D"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="sec-ay">Academic year</Label>
                  <Input
                    id="sec-ay"
                    value={createAy}
                    onChange={(e) => setCreateAy(e.target.value)}
                    placeholder="2025-2026"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sec-sem">Term</Label>
                  <Input
                    id="sec-sem"
                    value={createSem}
                    onChange={(e) => setCreateSem(e.target.value)}
                    placeholder="1st"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <button type="button" className="acsis-btn-ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </button>
              <button type="submit" className="acsis-mc-create-btn" disabled={creating} style={{ border: 'none' }}>
                {creating ? 'Saving…' : 'Add section'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTerm)} onOpenChange={(open) => !open && setEditTerm(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSection}>
            <DialogHeader>
              <DialogTitle>Edit section</DialogTitle>
              <DialogDescription>Update program, section code, academic year, and term.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-sec-program">Program</Label>
                  <Input
                    id="edit-sec-program"
                    value={editProgram}
                    onChange={(e) => setEditProgram(e.target.value)}
                    placeholder="BSIT"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sec-code">Section</Label>
                  <Input
                    id="edit-sec-code"
                    value={editSectionCode}
                    onChange={(e) => setEditSectionCode(e.target.value)}
                    placeholder="3D"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-sec-ay">Academic year</Label>
                  <Input
                    id="edit-sec-ay"
                    value={editAy}
                    onChange={(e) => setEditAy(e.target.value)}
                    placeholder="2025-2026"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sec-sem">Term</Label>
                  <Input
                    id="edit-sec-sem"
                    value={editSem}
                    onChange={(e) => setEditSem(e.target.value)}
                    placeholder="1st"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <button type="button" className="acsis-btn-ghost" onClick={() => setEditTerm(null)} disabled={editing}>
                Cancel
              </button>
              <button type="submit" className="acsis-mc-create-btn" disabled={editing} style={{ border: 'none' }}>
                {editing ? 'Saving…' : 'Save changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  )
}
