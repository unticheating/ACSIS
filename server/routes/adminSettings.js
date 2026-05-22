import { Router } from 'express'
import { getPool } from '../db.js'
import { updateInstitutionSettings } from '../lib/institutionSettings.js'
import {
  getInstitutionSettings,
  listThemes,
  setInstitutionTheme,
} from '../lib/institutionTheme.js'
import { requireAuth, requireInstitutionAdminOnly } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireInstitutionAdminOnly)

router.get('/', async (req, res) => {
  try {
    const pool = getPool()
    const [themes, institution] = await Promise.all([
      listThemes(pool),
      getInstitutionSettings(pool, req.institutionId),
    ])
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found.' })
    }
    return res.json({ themes, institution })
  } catch (err) {
    console.error('[admin/settings GET]', err)
    return res.status(500).json({ error: 'Failed to load settings.' })
  }
})

router.patch('/', async (req, res) => {
  try {
    const pool = getPool()
    const result = await updateInstitutionSettings(pool, req.institutionId, req.body)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    const institution = await getInstitutionSettings(pool, req.institutionId)
    return res.json({ ok: true, institution })
  } catch (err) {
    console.error('[admin/settings PATCH]', err)
    return res.status(500).json({ error: 'Failed to update settings.' })
  }
})

router.patch('/theme', async (req, res) => {
  const themeId = Number(req.body?.themeId)
  if (!Number.isInteger(themeId) || themeId < 1) {
    return res.status(400).json({ error: 'themeId is required.' })
  }

  try {
    const pool = getPool()
    const result = await setInstitutionTheme(pool, req.institutionId, themeId)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    const institution = await getInstitutionSettings(pool, req.institutionId)
    return res.json({ ok: true, institution })
  } catch (err) {
    console.error('[admin/settings PATCH theme]', err)
    return res.status(500).json({ error: 'Failed to update theme.' })
  }
})

export default router
