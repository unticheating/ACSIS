import {
  createTeachingTermQuery,
  deleteTeachingTermQuery,
  getTeachingTermQuery,
  listClassesByTermQuery,
  listTeachingTermsQuery,
  updateTeachingTermQuery,
  updateTermSortOrderQuery,
} from '../repositories/teachingTermRepository.js'

const SEMESTERS = new Set(['1st', '2nd', 'Summer'])

export async function listTeachingTermsService(memberId, { archived = false } = {}) {
  try {
    const terms = await listTeachingTermsQuery(memberId, { includeArchived: archived })
    return { ok: true, terms }
  } catch (err) {
    console.error('[teachingTermService.list]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function getTeachingTermDetailService(termId, memberId) {
  try {
    const term = await getTeachingTermQuery(termId, memberId)
    if (!term) return { ok: false, status: 404, error: 'Section not found.' }
    const classes = await listClassesByTermQuery(termId, memberId)
    return { ok: true, term, classes }
  } catch (err) {
    console.error('[teachingTermService.detail]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function createTeachingTermService(institutionId, memberId, body) {
  const programCode = String(body.programCode || '').trim()
  const sectionCode = String(body.sectionCode || '').trim()
  const schoolYear = String(body.academicYear || body.schoolYear || '').trim()
  const semester = String(body.semester || '').trim()

  if (!programCode || !sectionCode || !schoolYear || !semester) {
    return { ok: false, status: 400, error: 'Program, section, academic year, and semester are required.' }
  }
  if (!SEMESTERS.has(semester)) {
    return { ok: false, status: 400, error: 'Semester must be 1st, 2nd, or Summer.' }
  }

  try {
    const term = await createTeachingTermQuery(
      institutionId,
      memberId,
      programCode,
      sectionCode,
      schoolYear,
      semester,
    )
    return { ok: true, term }
  } catch (err) {
    if (err.code === '23505') {
      return { ok: false, status: 409, error: 'This section already exists for that term.' }
    }
    console.error('[teachingTermService.create]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function updateTeachingTermService(termId, memberId, body) {
  if (
    body.isArchived === undefined &&
    body.programCode === undefined &&
    body.sectionCode === undefined &&
    body.academicYear === undefined &&
    body.semester === undefined
  ) {
    return { ok: false, status: 400, error: 'Nothing to update.' }
  }

  if (body.semester !== undefined && !SEMESTERS.has(body.semester)) {
    return { ok: false, status: 400, error: 'Semester must be 1st, 2nd, or Summer.' }
  }

  try {
    const term = await updateTeachingTermQuery(termId, memberId, {
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : undefined,
      programCode: body.programCode !== undefined ? String(body.programCode).trim() : undefined,
      sectionCode: body.sectionCode !== undefined ? String(body.sectionCode).trim() : undefined,
      academicYear: body.academicYear !== undefined ? String(body.academicYear).trim() : undefined,
      semester: body.semester !== undefined ? String(body.semester).trim() : undefined,
    })
    if (!term) return { ok: false, status: 404, error: 'Section not found.' }
    return { ok: true, term }
  } catch (err) {
    if (err.code === '23505') {
      return { ok: false, status: 409, error: 'This section already exists for that term.' }
    }
    console.error('[teachingTermService.update]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function deleteTeachingTermService(termId, memberId) {
  try {
    const deleted = await deleteTeachingTermQuery(termId, memberId)
    if (!deleted) return { ok: false, status: 404, error: 'Section not found.' }
    return { ok: true }
  } catch (err) {
    console.error('[teachingTermService.delete]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function updateTeachingTermsSortOrderService(memberId, termIds) {
  try {
    await updateTermSortOrderQuery(memberId, termIds)
    return { ok: true }
  } catch (err) {
    console.error('[teachingTermService.updateSortOrder]', err)
    return { ok: false, error: 'Database error.' }
  }
}
