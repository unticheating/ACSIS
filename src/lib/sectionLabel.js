/**
 * @param {{ programCode?: string, sectionCode?: string, program?: string, section?: string }} section
 */
export function formatSectionTitle(section) {
  const program = String(section?.programCode || section?.program || '').trim()
  const code = String(section?.sectionCode || section?.section || '').trim()
  if (program && code) return `${program} ${code}`
  return program || code || 'Section'
}

/** @param {{ academicYear?: string, schoolYear?: string, semester?: string }} term */
export function formatTermPeriod(term) {
  const ay = String(term?.academicYear || term?.schoolYear || '').trim()
  const sem = String(term?.semester || '').trim()
  if (!ay && !sem) return ''
  const semLabel = sem === 'Summer' ? 'Summer Semester' : sem ? `${sem} Semester` : ''
  if (ay && semLabel) return `AY ${ay} ${semLabel}`
  if (ay) return `AY ${ay}`
  return semLabel
}

/**
 * Breadcrumb label for a course: "BSIT 3D - IT 103"
 * @param {{ programCode?: string, sectionCode?: string, program?: string, section?: string, courseCode?: string, name?: string, termId?: string|number }} course
 */
/**
 * Primary/secondary labels for course cards and banners.
 * @param {{ courseCode?: string, name?: string }} course
 */
export function formatCourseDisplayLabels(course) {
  const courseCode = String(course?.courseCode || '').trim()
  const courseName = String(course?.name || '').trim()
  const primary = courseCode || courseName || 'Course'
  const secondary = courseCode && courseName && courseName !== courseCode ? courseName : null
  return { primary, secondary, courseCode, courseName }
}

export function formatCourseBreadcrumbLabel(course) {
  const code = String(course?.courseCode || '').trim()
  const sectionTitle = formatSectionTitle(course)
  const hasSection =
    course?.termId != null ||
    Boolean(course?.programCode || course?.sectionCode || course?.program || course?.section)

  if (hasSection && sectionTitle !== 'Section' && code) {
    return `${sectionTitle} - ${code}`
  }
  if (code) return code
  const name = String(course?.name || '').trim()
  return name || 'Course'
}
