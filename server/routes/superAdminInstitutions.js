import { Router } from 'express'
import { getPool } from '../db.js'
import { listThemes } from '../lib/institutionTheme.js'
import {
  createInstitutionForSuperAdmin,
  listInstitutionsForSuperAdmin,
} from '../lib/superAdminInstitutions.js'
import { requireAuth, requireSuperAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireSuperAdmin)

router.get('/themes', async (_req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }
  try {
    const themes = await listThemes(pool)
    return res.json({ themes })
  } catch (err) {
    console.error('[super-admin/institutions/themes]', err)
    return res.status(500).json({ error: 'Failed to load themes.' })
  }
})

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

router.post('/', async (req, res) => {
  const pool = getPool()
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' })
  }
  const uid = req.authSession?.uid
  if (!uid) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }
  try {
    const result = await createInstitutionForSuperAdmin(pool, uid, req.body)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    return res.status(201).json({ ok: true, institution: result.institution })
  } catch (err) {
    console.error('[super-admin/institutions POST]', err)
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'That acronym is already in use.' })
    }
    return res.status(500).json({ error: 'Failed to create institution.' })
  }
})

export default router
