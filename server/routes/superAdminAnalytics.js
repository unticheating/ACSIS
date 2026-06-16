import { Router } from 'express'
import { getPool } from '../db.js'
import { createInstitutionUser } from '../lib/institutionUsers.js'
import {
  getSuperAdminOverviewQuery,
  listInstitutionAdminsQuery,
  listInstitutionViolationComparisonQuery,
  listInstitutionOnboardingTrendsQuery,
  listInstitutionViolationTrendsQuery,
} from '../lib/superAdminAnalytics.js'
import { requireAuth, requireSuperAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireSuperAdmin)

router.get('/', async (_req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }
  try {
    const [overview, institutions, trends, onboardingTrends] = await Promise.all([
      getSuperAdminOverviewQuery(pool),
      listInstitutionViolationComparisonQuery(pool),
      listInstitutionViolationTrendsQuery(pool),
      listInstitutionOnboardingTrendsQuery(pool),
    ])
    return res.json({ overview, institutions, trends, onboardingTrends })
  } catch (err) {
    console.error('[super-admin/analytics]', err)
    return res.status(500).json({ error: 'Failed to load analytics.' })
  }
})

router.get('/institutions/:institutionId/admins', async (req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }
  const institutionId = Number(req.params.institutionId)
  if (!Number.isInteger(institutionId) || institutionId < 1) {
    return res.status(400).json({ error: 'Invalid institution.' })
  }
  try {
    const admins = await listInstitutionAdminsQuery(pool, institutionId)
    return res.json({ admins })
  } catch (err) {
    console.error('[super-admin/admins GET]', err)
    return res.status(500).json({ error: 'Failed to load admins.' })
  }
})

router.post('/institutions/:institutionId/admins', async (req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }
  const institutionId = Number(req.params.institutionId)
  if (!Number.isInteger(institutionId) || institutionId < 1) {
    return res.status(400).json({ error: 'Invalid institution.' })
  }
  const instCheck = await pool.query(
    `SELECT institution_id FROM institutions WHERE institution_id = $1`,
    [institutionId],
  )
  if (!instCheck.rows[0]) {
    return res.status(404).json({ error: 'Institution not found.' })
  }
  try {
    const result = await createInstitutionUser(pool, institutionId, {
      ...req.body,
      role: 'admin',
    })
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error })
    }
    return res.status(201).json({ ok: true, user: result.user })
  } catch (err) {
    console.error('[super-admin/admins POST]', err)
    return res.status(500).json({ error: 'Failed to create institution admin.' })
  }
})

export default router
