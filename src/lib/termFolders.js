import { formatTermPeriod } from '@/lib/sectionLabel.js'

const SEMESTER_SORT_DESC = { '2nd': 0, '1st': 1, Summer: 2 }

/**
 * @param {{ id?: string|number, academicYear?: string, semester?: string, isOrphan?: boolean }} term
 */
export function termFolderKey(term) {
  if (!term || term.id === '_other') return '_other'
  const ay = String(term.academicYear || '').trim()
  const sem = String(term.semester || '').trim()
  if (!ay && !sem) return '_other'
  return `${ay}::${sem}`
}

/**
 * @param {{ term: object, courses: object[], isOrphan?: boolean }[]} groups
 */
export function groupSectionGroupsByTermFolder(groups) {
  /** @type {Map<string, { key: string, label: string, sections: typeof groups }>} */
  const map = new Map()

  for (const group of groups) {
    const key = group.isOrphan ? '_other' : termFolderKey(group.term)
    if (!map.has(key)) {
      const label =
        key === '_other'
          ? 'Other courses'
          : formatTermPeriod(group.term) || 'Unassigned'
      map.set(key, { key, label, sections: [] })
    }
    map.get(key).sections.push(group)
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.key === '_other') return 1
    if (b.key === '_other') return -1

    const termA = a.sections[0]?.term || {}
    const termB = b.sections[0]?.term || {}
    const ayCmp = String(termB.academicYear || '').localeCompare(String(termA.academicYear || ''))
    if (ayCmp !== 0) return ayCmp

    const semA = SEMESTER_SORT_DESC[String(termA.semester || '').trim()] ?? 99
    const semB = SEMESTER_SORT_DESC[String(termB.semester || '').trim()] ?? 99
    return semA - semB
  })
}

/**
 * @param {{ sections: { courses?: object[] }[] }} folder
 */
export function countFolderCourses(folder) {
  return folder.sections.reduce((total, group) => total + (group.courses?.length || 0), 0)
}
