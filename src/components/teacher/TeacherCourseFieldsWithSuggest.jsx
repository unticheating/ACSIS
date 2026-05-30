import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch.js'
import {
  buildTeacherCourseCatalog,
  filterTeacherCourseCatalog,
} from '@/lib/teacherCourseCatalog.js'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'

/**
 * Subject code + course name with autocomplete from the teacher's other classes.
 * @param {{
 *   idPrefix: string,
 *   courseCode: string,
 *   courseName: string,
 *   onCourseCodeChange: (value: string) => void,
 *   onCourseNameChange: (value: string) => void,
 *   active?: boolean,
 *   existingCourses?: Array<{ id?: number, courseCode?: string, course_code?: string, name?: string }>,
 *   excludeClassId?: number | string | null,
 *   codeRequired?: boolean,
 *   nameRequired?: boolean,
 *   codePlaceholder?: string,
 *   namePlaceholder?: string,
 *   autoFocusCode?: boolean,
 * }} props
 */
export default function TeacherCourseFieldsWithSuggest({
  idPrefix,
  courseCode,
  courseName,
  onCourseCodeChange,
  onCourseNameChange,
  active = true,
  existingCourses = [],
  excludeClassId = null,
  codeRequired = true,
  nameRequired = true,
  codePlaceholder = 'IT 108',
  namePlaceholder = 'Integrative Programming',
  autoFocusCode = false,
}) {
  const [catalogSource, setCatalogSource] = useState(existingCourses)
  const [focusField, setFocusField] = useState(/** @type {'code' | 'name' | null} */ (null))
  const [suggestOpen, setSuggestOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    setCatalogSource(existingCourses)
  }, [existingCourses])

  useEffect(() => {
    if (!active) {
      setFocusField(null)
      setSuggestOpen(false)
      return
    }
    if (existingCourses.length > 0) return
    let cancelled = false
    apiFetch('/api/teacher/classes')
      .then((res) => res.json().catch(() => []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setCatalogSource(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active, existingCourses.length])

  const catalog = useMemo(
    () => buildTeacherCourseCatalog(catalogSource, { excludeClassId }),
    [catalogSource, excludeClassId],
  )

  const suggestions = useMemo(() => {
    if (!suggestOpen || !focusField || catalog.length === 0) return []
    return filterTeacherCourseCatalog(
      catalog,
      { code: courseCode, name: courseName, focus: focusField },
      8,
    )
  }, [catalog, courseCode, courseName, focusField, suggestOpen])

  const showSuggestList = suggestOpen && focusField && suggestions.length > 0
  const codeId = `${idPrefix}-course-code`
  const nameId = `${idPrefix}-course-name`
  const codeListId = `${idPrefix}-course-suggest`
  const nameListId = `${idPrefix}-course-name-suggest`

  function pickSuggestion(item) {
    onCourseCodeChange(item.courseCode)
    onCourseNameChange(item.name)
    setSuggestOpen(false)
    setFocusField(null)
  }

  function openSuggest(field) {
    setFocusField(field)
    setSuggestOpen(true)
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setSuggestOpen(false)
      }
    }, 120)
  }

  return (
    <div className="grid gap-4" ref={rootRef}>
      <div className="acsis-course-suggest">
        <Label htmlFor={codeId}>Subject code</Label>
        <div className="acsis-course-suggest__wrap">
          <Input
            id={codeId}
            value={courseCode}
            onChange={(e) => {
              onCourseCodeChange(e.target.value)
              openSuggest('code')
            }}
            onFocus={() => openSuggest('code')}
            onBlur={handleBlur}
            placeholder={codePlaceholder}
            required={codeRequired}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestList && focusField === 'code'}
            aria-controls={showSuggestList && focusField === 'code' ? codeListId : undefined}
            autoFocus={autoFocusCode}
          />
          {showSuggestList && focusField === 'code' ? (
            <ul id={codeListId} className="acsis-course-suggest__list" role="listbox">
              {suggestions.map((item) => (
                <li key={`${item.courseCode}|${item.name}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    className="acsis-course-suggest__option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(item)}
                  >
                    <span className="acsis-course-suggest__code">{item.courseCode}</span>
                    {item.name ? (
                      <span className="acsis-course-suggest__name">{item.name}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="acsis-course-suggest">
        <Label htmlFor={nameId}>Course name</Label>
        <div className="acsis-course-suggest__wrap">
          <Input
            id={nameId}
            value={courseName}
            onChange={(e) => {
              onCourseNameChange(e.target.value)
              openSuggest('name')
            }}
            onFocus={() => openSuggest('name')}
            onBlur={handleBlur}
            placeholder={namePlaceholder}
            required={nameRequired}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestList && focusField === 'name'}
            aria-controls={showSuggestList && focusField === 'name' ? nameListId : undefined}
          />
          {showSuggestList && focusField === 'name' ? (
            <ul id={nameListId} className="acsis-course-suggest__list" role="listbox">
              {suggestions.map((item) => (
                <li key={`${item.courseCode}|${item.name}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    className="acsis-course-suggest__option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(item)}
                  >
                    <span className="acsis-course-suggest__code">{item.courseCode}</span>
                    {item.name ? (
                      <span className="acsis-course-suggest__name">{item.name}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** @param {Array<{ id?: number, courseCode?: string, course_code?: string, name?: string }>} courses @param {{ excludeClassId?: number | string | null }} [opts] */
export function useTeacherCourseCatalogHint(courses, opts = {}) {
  const catalog = useMemo(
    () => buildTeacherCourseCatalog(courses, opts),
    [courses, opts.excludeClassId],
  )
  return catalog.length > 0 ? (
    <span className="acsis-course-suggest__hint"> Start typing to pick from your existing courses.</span>
  ) : null
}
