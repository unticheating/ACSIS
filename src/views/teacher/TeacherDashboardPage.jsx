import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import AnimatedHoverIcon from '@/components/icons/AnimatedHoverIcon.jsx'
import { BookIcon, ChartBarIcon, UsersIcon } from '@/components/icons/hoverIcons.js'
import { apiFetch } from '@/lib/apiFetch.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { formatSectionTitle } from '@/lib/sectionLabel.js'
import {
  isExamDraft,
  isExamOngoing,
  labelForPgExamStatus,
  normalizeExamStatus,
  PG_EXAM_STATUS,
} from '@/lib/examFlowUi.js'

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
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')

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
      const res = await apiFetch('/api/teacher/exams')
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
  const classesByTermId = new Map()
  for (const course of classes) {
    if (course.termId == null) continue
    const key = String(course.termId)
    if (!classesByTermId.has(key)) classesByTermId.set(key, [])
    classesByTermId.get(key).push(course)
  }
  const selectableTerms = terms.filter((term) => (classesByTermId.get(String(term.id)) || []).length > 0)
  const selectedTermIds = new Set(
    selectedClassIds
      .map((classId) => classes.find((course) => String(course.id) === String(classId))?.termId)
      .filter((termId) => termId != null)
      .map((termId) => String(termId)),
  )
  const selectedTermIdList = Array.from(selectedTermIds)
  const selectedSectionCourseSets = selectedTermIdList
    .map((termId) => {
      const termClasses = classesByTermId.get(termId) || []
      return new Set(
        termClasses
          .map((course) => course.course_code || course.courseCode)
          .filter(Boolean),
      )
    })
    .filter((courseSet) => courseSet.size > 0)

  const courseOptions = selectedSectionCourseSets.length > 0
    ? Array.from(selectedSectionCourseSets.slice(1).reduce(
        (shared, courseSet) => new Set([...shared].filter((code) => courseSet.has(code))),
        selectedSectionCourseSets[0],
      )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    : []
  const canContinue = selectedClassIds.length > 0 && courseOptions.length > 0 && selectedCourse.trim() !== ''
  const visibleExams = exams.filter((exam) => normalizeExamStatus(exam.status) !== PG_EXAM_STATUS.CLOSED)

  useEffect(() => {
    if (courseOptions.length === 0) {
      if (selectedCourse) setSelectedCourse('')
      return
    }
    const currentExists = courseOptions.includes(selectedCourse)
    if (!currentExists) {
      setSelectedCourse(courseOptions[0])
    }
  }, [selectedClassIds, classes])

  return (
    <div className="acsis-view">
      <SummaryStatGrid>
        <SummaryStatCard
          label="My Classes"
          value={totalClasses}
          tone="success"
          icon={<AnimatedHoverIcon icon={BookIcon} size={28} strokeWidth={1.5} />}
          delay={0.1}
        />
        <SummaryStatCard
          label="Active Exams"
          value={activeExams}
          tone="success"
          icon={<AnimatedHoverIcon icon={ChartBarIcon} size={28} strokeWidth={1.5} />}
          delay={0.2}
        />
        <SummaryStatCard
          label="Total Students"
          value={totalStudents}
          tone="success"
          icon={<AnimatedHoverIcon icon={UsersIcon} size={28} strokeWidth={1.5} />}
          delay={0.3}
        />
      </SummaryStatGrid>
      {/* Exams strip */}
      <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">My Exams</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded border border-acsis-brand/30 bg-acsis-brand text-white shadow-sm hover:bg-acsis-brand/90 focus:outline-none focus:ring-2 focus:ring-acsis-brand/30"
            >
              Create Exam
            </button>
          </div>
        </div>
        <ul className="acsis-mc-course-grid acsis-mc-course-grid--top py-2">
          {loadingExams && (
            <li className="text-sm text-gray-600 dark:text-gray-400 px-4">Loading exams…</li>
          )}
          {!loadingExams && visibleExams.length === 0 && (
            <li className="text-sm text-gray-600 dark:text-gray-400 px-4">No exams yet. Create one to get started.</li>
          )}
          {visibleExams.map((ex) => {
            const title = ex.title || ex.name || 'Untitled Exam'
            const questions = ex.questionCount ?? ex.questions_count ?? ex.question_count ?? 0
            const className = ex.name || ex.courseCode || ex.course_code || ''
            const lastEdited = ex.updated_at || ex.last_edited_at || ex.created_at || null
            const status = normalizeExamStatus(ex.status)
            const draft = isExamDraft(status)
            const live = isExamOngoing(status)
            const statusLabel = labelForPgExamStatus(status)
            const statusClass = draft ? 'text-gray-600 dark:text-gray-300' : live ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'
            const detailPath = ex.classId != null && ex.id != null
              ? `/teacher/my-classes/${encodeURIComponent(ex.classId)}/exams/${encodeURIComponent(ex.id)}`
              : null
            return (
              <FadeIn as="li" key={ex.id || ex.exam_id} delay={0.05}>
                <article
                  className="acsis-course-card acsis-card-surface min-h-[150px] relative"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (detailPath) {
                      navigate(detailPath)
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && detailPath) {
                      e.preventDefault()
                      navigate(detailPath)
                    }
                  }}
                >
                  <div className="acsis-course-card__accent" aria-hidden />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenuId(activeMenuId === ex.id ? null : ex.id)
                    }}
                    className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center text-gray-500"
                    aria-label="exam actions"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                    </svg>
                  </button>
                  {activeMenuId === ex.id && (
                    <div className="absolute right-3 top-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-20 w-40">
                      {!isExamOngoing(status) && !isExamDraft(status) ? null : isExamDraft(status) ? (
                        <button
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await apiFetch(`/api/teacher/classes/${ex.classId}/exams/${ex.id}`, { method: 'PUT' })
                              fetchExams()
                            } catch (error) { console.error(error) }
                            setActiveMenuId(null)
                          }}
                        >
                          Publish Exam
                        </button>
                      ) : null}
                      <button
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const code = ex.code || ex.password || ''
                            await navigator.clipboard.writeText(code)
                          } catch (e) { console.error(e) }
                          setActiveMenuId(null)
                        }}
                      >
                        Copy Exam Code
                      </button>
                      <button
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={async (e) => {
                          e.stopPropagation()
                          const ok = window.confirm('Delete this exam? This action cannot be undone.')
                          if (!ok) return
                          try {
                            await apiFetch(`/api/teacher/classes/${ex.classId}/exams/${ex.id}`, { method: 'DELETE' })
                            fetchExams()
                          } catch (e) { console.error(e) }
                          setActiveMenuId(null)
                        }}
                      >
                        Delete Exam
                      </button>
                    </div>
                  )}
                  <div className="acsis-course-card__body">
                    <h3 className="acsis-course-card__code">{title}</h3>
                    {className ? <p className="acsis-course-card__name">{className}</p> : null}
                    <p className="acsis-course-card__period">{questions} questions · Last edited {lastEdited ? new Date(lastEdited).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="acsis-course-card__footer">
                    <span className="acsis-course-card__stat">{questions} {questions === 1 ? 'question' : 'questions'}</span>
                    <span className={`acsis-course-card__status ${statusClass}`}>{statusLabel || 'Draft'}</span>
                  </div>
                </article>
              </FadeIn>
            )
          })}
        </ul>
        <div className="text-center mt-4">
          <Link to="/teacher/my-classes" className="text-sm text-gray-500 dark:text-gray-300">View All</Link>
        </div>
      </div>
      {/* Create exam modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Exam — Select classes</h4>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-600 dark:text-gray-300">Select one or more classes to create this exam in.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectableTerms.map((term) => {
                  const termClasses = classesByTermId.get(String(term.id)) || []
                  const shortLabel = formatSectionTitle(term)
                  return (
                    <label key={term.id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={termClasses.every((course) => selectedClassIds.includes(String(course.id)))}
                        onChange={(e) => {
                          const termCourseIds = termClasses.map((course) => String(course.id))
                          setSelectedClassIds((prev) => {
                            if (e.target.checked) {
                              return Array.from(new Set([...prev, ...termCourseIds]))
                            }
                            return prev.filter((id) => !termCourseIds.includes(id))
                          })
                        }}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{shortLabel}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{termClasses.length} {termClasses.length === 1 ? 'class' : 'classes'}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Course</label>
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {courseOptions.length === 0 ? (
                    <option value="">There is no same course in this section</option>
                  ) : (
                    <>
                      <option value="" disabled>Select course</option>
                      {courseOptions.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button className="px-4 py-2 rounded border" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button
                className={`px-4 py-2 rounded text-white ${canContinue ? 'bg-acsis-brand' : 'bg-gray-400 cursor-not-allowed dark:bg-gray-600'}`}
                disabled={!canContinue}
                onClick={() => {
                  if (!canContinue) {
                    alert('Please select at least one class.')
                    return
                  }
                  // navigate to create-exam passing classes and course
                  const q = new URLSearchParams()
                  q.set('classes', selectedClassIds.join(','))
                  if (selectedCourse) q.set('course', selectedCourse)
                  setCreateModalOpen(false)
                  navigate(`/teacher/create-exam?${q.toString()}`)
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
