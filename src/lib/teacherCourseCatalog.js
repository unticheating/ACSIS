/**
 * Dedupe teacher classes into a catalog for "add course" autocomplete.
 * @param {Array<{ id?: number, courseCode?: string, course_code?: string, name?: string }>} courses
 * @param {{ excludeClassId?: number | string | null }} [opts]
 * @returns {{ courseCode: string, name: string }[]}
 */
export function buildTeacherCourseCatalog(courses, opts = {}) {
  if (!Array.isArray(courses)) return []
  const exclude =
    opts.excludeClassId != null && opts.excludeClassId !== '' ? String(opts.excludeClassId) : null
  const seen = new Map()
  for (const row of courses) {
    if (exclude != null && String(row.id ?? '') === exclude) continue
    const courseCode = String(row.courseCode ?? row.course_code ?? '').trim()
    const name = String(row.name ?? '').trim()
    if (!courseCode && !name) continue
    const key = `${courseCode.toLowerCase()}|${name.toLowerCase()}`
    if (!seen.has(key)) {
      seen.set(key, { courseCode, name })
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    (a.courseCode || a.name).localeCompare(b.courseCode || b.name, undefined, {
      sensitivity: 'base',
    }),
  )
}

/**
 * @param {{ courseCode: string, name: string }[]} catalog
 * @param {{ code: string, name: string, focus: 'code' | 'name' }} query
 * @param {number} [limit]
 */
export function filterTeacherCourseCatalog(catalog, { code, name, focus }, limit = 8) {
  const c = code.trim().toLowerCase()
  const n = name.trim().toLowerCase()

  let list = catalog
  if (c || n) {
    list = catalog.filter((item) => {
      const ic = item.courseCode.toLowerCase()
      const iname = item.name.toLowerCase()
      if (focus === 'code' && c) {
        return ic.includes(c) || iname.includes(c)
      }
      if (focus === 'name' && n) {
        return iname.includes(n) || ic.includes(n)
      }
      return true
    })
  }

  return list.slice(0, limit)
}
