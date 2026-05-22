import { Router } from 'express'
import { getViolationSessionDetailService, listViolationsService } from '../services/adminService.js'
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireInstitutionAdmin)

router.get('/', async (req, res) => {
  const result = await listViolationsService(req.institutionId)
  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }
  return res.json({
    violations: result.violations,
    count: result.count,
    maxWarnings: result.maxWarnings,
  })
})

router.get('/:sessionId', async (req, res) => {
  const result = await getViolationSessionDetailService(req.institutionId, req.params.sessionId)
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error })
  }
  return res.json({ detail: result.detail, maxWarnings: result.maxWarnings })
})

export default router
