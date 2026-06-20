import { getPool } from '../db.js'
import {
  createTeachingTermService,
  deleteTeachingTermService,
  getTeachingTermDetailService,
  listTeachingTermsService,
  updateTeachingTermService,
  updateTeachingTermsSortOrderService,
} from '../services/teachingTermService.js'

async function resolveInstitutionId(memberId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT institution_id FROM institution_members
     WHERE member_id = $1 AND is_active = TRUE
     LIMIT 1`,
    [memberId],
  )
  return rows[0]?.institution_id ?? null
}

export async function listTeacherTerms(req, res) {
  const archived = req.query.archived === 'true'
  const result = await listTeachingTermsService(req.memberId, { archived })
  if (!result.ok) return res.status(500).json({ error: result.error })
  return res.json(result.terms)
}

export async function getTeacherTerm(req, res) {
  const termId = Number(req.params.termId)
  if (!Number.isFinite(termId)) return res.status(400).json({ error: 'Invalid section id.' })
  const result = await getTeachingTermDetailService(termId, req.memberId)
  if (!result.ok) return res.status(result.status || 500).json({ error: result.error })
  return res.json(result)
}

export async function createTeacherTerm(req, res) {
  const institutionId = await resolveInstitutionId(req.memberId)
  if (!institutionId) return res.status(403).json({ error: 'Teacher membership not found.' })
  const result = await createTeachingTermService(institutionId, req.memberId, req.body)
  if (!result.ok) return res.status(result.status || 500).json({ error: result.error })
  return res.status(201).json(result.term)
}

export async function patchTeacherTerm(req, res) {
  const termId = Number(req.params.termId)
  if (!Number.isFinite(termId)) return res.status(400).json({ error: 'Invalid section id.' })
  const result = await updateTeachingTermService(termId, req.memberId, req.body)
  if (!result.ok) return res.status(result.status || 500).json({ error: result.error })
  return res.json(result.term)
}

export async function deleteTeacherTerm(req, res) {
  const termId = Number(req.params.termId)
  if (!Number.isFinite(termId)) return res.status(400).json({ error: 'Invalid section id.' })
  const result = await deleteTeachingTermService(termId, req.memberId)
  if (!result.ok) return res.status(result.status || 500).json({ error: result.error })
  return res.json({ ok: true })
}

export async function updateTeacherTermsSort(req, res) {
  const { termIds } = req.body
  if (!termIds || !Array.isArray(termIds)) {
    return res.status(400).json({ error: 'termIds array is required.' })
  }
  const result = await updateTeachingTermsSortOrderService(req.memberId, termIds)
  if (!result.ok) return res.status(500).json({ error: result.error })
  return res.json({ ok: true })
}
