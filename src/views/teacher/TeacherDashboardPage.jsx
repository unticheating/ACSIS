import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { BookOpen, Activity, Users, MoreVertical, Copy, Send, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/apiFetch.js'
import { copyToClipboard } from '@/lib/copyToClipboard.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import PageSpinner from '@/components/ui/page-spinner.jsx'
import { formatSectionTitle } from '@/lib/sectionLabel.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  normalizeExamStatus,
  PG_EXAM_STATUS,
} from '@/lib/examFlowUi.js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Label } from '@/components/ui/label.jsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { DropdownMenuActionItem } from '@/components/ui/dropdown-menu-action-item.jsx'
import '../../pages/teacher-ui/my_classes.css'

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeExams: 0,
    totalStudents: 0
  })
  const [exams, setExams] = useState([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [classes, setClasses] = useState([])
  const [terms, setTerms] = useState([])
  const navigate = useNavigate()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedSections, setSelectedSections] = useState([])

  const resetCreateExamModal = () => {
    setSelectedClassIds([])
    setSelectedCourse('')
    setSelectedSections([])
  }

  useEffect(() => {
    apiFetch('/api/teacher/classes/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data)
        }
      })
      .catch(console.error)
  }, [])

  const fetchExams = async () => {
    setLoadingExams(true)
    try {
      const res = await apiFetch('/api/teacher/classes/exams')
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data) && data.length > 0) {
        setExams(data)
        return
      }

      const classesRes = await apiFetch('/api/teacher/classes')
      const classesData = await classesRes.json().catch(() => [])
      if (!classesRes.ok || !Array.isArray(classesData) || classesData.length === 0) {
        setExams([])
        return
      }

      const nested = await Promise.all(
        classesData.map(async (course) => {
          if (course.isArchived) return []
          const classId = course.id ?? course.classId
          if (classId == null) return []
          try {
            const classRes = await apiFetch(`/api/teacher/classes/${encodeURIComponent(classId)}/exams`)
            if (!classRes.ok) return []
            const classData = await classRes.json().catch(() => null)
            const list = Array.isArray(classData?.exams) ? classData.exams : []
            return list.map((exam) => ({
              ...exam,
              classId: exam.classId ?? classId,
              name: exam.name ?? course.name ?? '',
              courseCode: exam.courseCode ?? course.courseCode ?? course.course_code ?? '',
            }))
          } catch (err) {
            console.error('[TeacherDashboardPage] fetch class exams', classId, err)
            return []
          }
        }),
      )

      const merged = nested.flat().filter(Boolean)
      const deduped = Array.from(
        new Map(merged.map((exam) => [`${exam.classId ?? 'x'}:${exam.id ?? exam.exam_id ?? ''}`, exam])).values(),
      )
      setExams(deduped)
    } catch (err) {
      console.error('[TeacherDashboardPage] fetch exams', err)
      setExams([])
    } finally {
      setLoadingExams(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [])

  useEffect(() => {
    apiFetch('/api/teacher/classes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data)
          if (!selectedCourse) {
            const firstCourse = data.find((c) => c.course_code || c.courseCode)
            if (firstCourse) setSelectedCourse(firstCourse.course_code || firstCourse.courseCode)
          }
        }
      })
      .catch(err => console.error('[TeacherDashboardPage] fetch classes', err))
  }, [])

  useEffect(() => {
    apiFetch('/api/teacher/terms?archived=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTerms(data)
        }
      })
      .catch(err => console.error('[TeacherDashboardPage] fetch terms', err))
  }, [])

  const { totalClasses, activeExams, totalStudents } = stats
  const termById = new Map(terms.map((term) => [String(term.id), term]))
  const classById = new Map(classes.map((course) => [String(course.id), course]))
  const classesByTermId = new Map()
  for (const course of classes) {
    if (course.termId == null) continue
    const key = String(course.termId)
    if (!classesByTermId.has(key)) classesByTermId.set(key, [])
    classesByTermId.get(key).push(course)
  }
  const selectableTerms = terms.filter((term) => !term.isArchived && (classesByTermId.get(String(term.id)) || []).length > 0)
  const selectedTermIds = new Set(selectedSections.map((termId) => String(termId)))
  const selectedTermIdList = Array.from(selectedTermIds)
  const normalizeCourseText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
  const selectedSectionCourses = selectedTermIdList
    .map((termId) => (classesByTermId.get(termId) || []).map((course) => ({
      id: String(course.id),
      courseCode: String(course.courseCode || course.course_code || '').trim(),
      courseName: String(course.name || '').trim(),
    })))
    .filter((courseList) => courseList.length > 0)

  const buildCourseKey = (courseCode, courseName) => {
    const normalizedName = normalizeCourseText(courseName)
    const normalizedCode = normalizeCourseText(courseCode)
    return normalizedName || normalizedCode
  }

  const multiSectionCourseOptions = selectedSectionCourses.length > 0
    ? Array.from(
        selectedSectionCourses.reduce((shared, courseList) => {
          courseList.forEach((course) => {
            shared.add(buildCourseKey(course.courseCode, course.courseName))
          })
          return shared
        }, new Set()),
      )
        .map((key) => {
          const matchedCourse = selectedSectionCourses
            .flat()
            .find((course) => buildCourseKey(course.courseCode, course.courseName) === key)
          const courseCode = matchedCourse?.courseCode || ''
          const courseName = matchedCourse?.courseName || ''
          return {
            key,
            label: courseName || courseCode || 'Course',
            courseCode,
            courseName,
            matchedCourse,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    : []
  const canContinue = selectedClassIds.length > 0
  const visibleExams = exams

  useEffect(() => {
    if (multiSectionCourseOptions.length === 0) {
      if (selectedCourse) setSelectedCourse('')
      if (selectedClassIds.length) setSelectedClassIds([])
      return
    }
    const currentExists = multiSectionCourseOptions.some((course) => course.key === selectedCourse)
    if (!currentExists) {
      if (selectedCourse) setSelectedCourse('')
      if (selectedClassIds.length) setSelectedClassIds([])
      return
    }
    const ids = selectedSections.flatMap((sid) => classesByTermId.get(String(sid)) || [])
      .filter((c) => buildCourseKey(String(c.courseCode || c.course_code || '').trim(), String(c.name || '').trim()) === selectedCourse)
      .map((c) => String(c.id))
    if (ids.join(',') !== selectedClassIds.join(',')) {
      setSelectedClassIds(ids)
    }
  }, [selectedClassIds, classes, selectedSections, selectedCourse, multiSectionCourseOptions])

  return (
    <div className="acsis-view">
      <SummaryStatGrid className="teacher-dash-stats">
        <SummaryStatCard
          label="My Classes"
          value={totalClasses}
          hint="Total sections taught"
          icon={<BookOpen className="h-10 w-10 text-blue-500" strokeWidth={2} />}
          delay={0.05}
        />
        <SummaryStatCard
          label="Active Exams"
          value={activeExams}
          hint="Exams currently ongoing"
          icon={<Activity className="h-10 w-10 text-emerald-500" strokeWidth={2} />}
          delay={0.1}
        />
        <SummaryStatCard
          label="Total Students"
          value={totalStudents}
          hint="Enrolled across all classes"
          icon={<Users className="h-10 w-10 text-purple-500" strokeWidth={2} />}
          delay={0.15}
        />
      </SummaryStatGrid>
      {/* Exams strip */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">My Exams</h3>
            <Link to="/teacher/my-classes" className="panel-view-all sm:hidden">
              {visibleExams.length > 8 ? `View All (${visibleExams.length})` : 'View All'}
            </Link>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link to="/teacher/my-classes" className="panel-view-all hidden sm:block">
              {visibleExams.length > 8 ? `View All (${visibleExams.length})` : 'View All'}
            </Link>
            <button
              type="button"
              className="acsis-mc-create-btn w-full sm:w-auto justify-center"
              onClick={() => {
                resetCreateExamModal()
                setCreateModalOpen(true)
              }}
            >
              Create Exam
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loadingExams && (
            <div className="col-span-full py-8">
              <PageSpinner label="Loading exams…" />
            </div>
          )}
          {!loadingExams && visibleExams.length === 0 && (
            <div className="col-span-full border border-dashed border-border rounded-xl p-10 text-center flex flex-col items-center justify-center bg-muted/30">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-4" strokeWidth={1.5} />
              <p className="text-[14px] text-muted-foreground font-medium">No exams yet. Create one to get started.</p>
            </div>
          )}
          {visibleExams.slice(0, 8).map((ex) => {
            const title = ex.title || ex.name || 'Untitled Exam'
            const questions = ex.questionCount ?? ex.questions_count ?? ex.question_count ?? 0
            const classMeta = ex.classId != null ? classById.get(String(ex.classId)) : null
            const sectionMeta = classMeta?.termId != null ? termById.get(String(classMeta.termId)) : classMeta
            const sectionLabel = sectionMeta ? formatSectionTitle(sectionMeta) : ''
            const courseCode = classMeta?.courseCode || classMeta?.course_code || ''
            const courseName = classMeta?.name || ''
            const courseLabel = [courseCode, courseName].filter(Boolean).join(' - ') || 'Course'
            const displaySubtitle = [sectionLabel, courseLabel].filter(Boolean).join(' • ')
            const displayTitle = title
            const lastEdited = ex.updated_at || ex.last_edited_at || ex.created_at || null
            const status = normalizeExamStatus(ex.status)
            const draft = isExamDraft(status)
            const live = isExamOngoing(status)
            const statusLabel = labelForPgExamStatus(status)
            const statusClass = draft ? 'text-muted-foreground' : live ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
            const detailPath = ex.classId != null && ex.id != null
              ? `/teacher/my-classes/${encodeURIComponent(ex.classId)}/exams/${encodeURIComponent(ex.id)}`
              : null
            return (
              <FadeIn as="div" key={ex.id || ex.exam_id} delay={0.05}>
                <Card
                  className="relative h-full flex flex-col cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group"
                  onClick={() => {
                    if (detailPath) {
                      navigate(detailPath)
                    }
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && detailPath) {
                      e.preventDefault()
                      navigate(detailPath)
                    }
                  }}
                >
                  <CardHeader className="pb-3 pr-10">
                    <CardTitle className="text-lg leading-tight line-clamp-2">{displayTitle}</CardTitle>
                    <CardDescription className="line-clamp-1 mt-1.5">{displaySubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    <p className="text-sm text-muted-foreground">
                      {questions} {questions === 1 ? 'question' : 'questions'}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 border-t border-border mt-auto px-6 py-3 bg-muted/20">
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm ${statusClass}`}>{statusLabel || 'Draft'}</span>
                    </div>
                  </CardFooter>

                  <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="acsis-class-card__menu-btn opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          aria-label="Exam options"
                        >
                          <MoreVertical size={18} strokeWidth={2} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[11rem]">
                        {isExamDraft(status) && (
                          <DropdownMenuActionItem
                            icon={Send}
                            variant="success"
                            onSelect={async () => {
                              try {
                                await apiFetch(`/api/teacher/classes/${ex.classId}/exams/${ex.id}`, { method: 'PUT' })
                                fetchExams()
                              } catch (error) {
                                console.error(error)
                              }
                            }}
                          >
                            Publish exam (share code)
                          </DropdownMenuActionItem>
                        )}
                        <DropdownMenuActionItem
                          icon={Copy}
                          onSelect={() =>
                            void copyToClipboard(ex.code || ex.password || '', { successMessage: 'Exam code copied.' })
                          }
                        >
                          Copy exam code
                        </DropdownMenuActionItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuActionItem
                          icon={Trash2}
                          variant="destructive"
                          onSelect={async (e) => {
                            e.preventDefault()
                            const ok = await confirm({
                              title: 'Delete exam?',
                              description: 'This action cannot be undone.',
                              confirmLabel: 'Delete',
                              destructive: true,
                            })
                            if (!ok) return
                            try {
                              await apiFetch(`/api/teacher/classes/${ex.classId}/exams/${ex.id}`, { method: 'DELETE' })
                              fetchExams()
                            } catch (error) {
                              console.error(error)
                            }
                          }}
                        >
                          Delete exam
                        </DropdownMenuActionItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </FadeIn>
            )
          })}
        </div>
      </div>

      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateExamModal()
          setCreateModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create exam — select classes</DialogTitle>
            <DialogDescription>
              Select one or more sections, then choose the course to create this exam in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto py-1 pr-1">
            <div className="grid gap-2">
              <Label>Sections</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectableTerms.map((term) => {
                  const id = String(term.id)
                  const checked = selectedSections.includes(id)
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 p-2 border border-border rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...selectedSections, id]))
                            : selectedSections.filter((s) => s !== id)
                          setSelectedSections(next)
                          setSelectedCourse('')
                          setSelectedClassIds([])
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm font-medium">{formatSectionTitle(term)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-exam-course">Course</Label>
              {(() => {
                const available = selectedSections.flatMap((sid) => classesByTermId.get(String(sid)) || [])
                
                if (selectedSections.length === 0) {
                  return (
                    <select
                      id="create-exam-course"
                      disabled
                      className="acsis-class-toolbar__select w-full text-muted-foreground"
                    >
                      <option>Select section(s) first</option>
                    </select>
                  )
                }

                if (multiSectionCourseOptions.length === 0) {
                  return (
                    <select
                      id="create-exam-course"
                      disabled
                      className="acsis-class-toolbar__select w-full text-muted-foreground"
                    >
                      <option>No courses available for selected section(s)</option>
                    </select>
                  )
                }

                return (
                  <select
                    id="create-exam-course"
                    value={selectedCourse || ''}
                    onChange={(e) => {
                      const key = e.target.value
                      setSelectedCourse(key)
                      const ids = available
                        .filter(
                          (c) =>
                            buildCourseKey(
                              String(c.courseCode || c.course_code || '').trim(),
                              String(c.name || '').trim(),
                            ) === key,
                        )
                        .map((c) => String(c.id))
                      setSelectedClassIds(ids)
                    }}
                    className="acsis-class-toolbar__select w-full"
                  >
                    <option value="" disabled hidden>
                      Select course
                    </option>
                    {multiSectionCourseOptions.map((course) => (
                      <option key={course.key} value={course.key}>
                        {course.label}
                      </option>
                    ))}
                  </select>
                )
              })()}
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="acsis-btn-ghost"
              onClick={() => {
                resetCreateExamModal()
                setCreateModalOpen(false)
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="acsis-mc-create-btn"
              style={{ border: 'none' }}
              disabled={!canContinue}
              onClick={() => {
                if (!canContinue) return
                const q = new URLSearchParams()
                q.set('classes', selectedClassIds.join(','))
                if (selectedCourse) q.set('course', selectedCourse)
                setCreateModalOpen(false)
                navigate(`/teacher/create-exam?${q.toString()}`)
              }}
            >
              Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  )
}