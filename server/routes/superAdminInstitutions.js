import { Router } from 'express'
import { getPool } from '../db.js'
import { listInstitutionsForSuperAdmin } from '../lib/superAdminInstitutions.js'
import { requireAuth, requireSuperAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireSuperAdmin)

router.get('/', async (_req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }
  try {
    const institutions = await listInstitutionsForSuperAdmin(pool)
    return res.json({ institutions })
  } catch (err) {
    console.error('[super-admin/institutions]', err)
    return res.status(500).json({ error: 'Failed to load institutions.' })
  }
})

export default router
