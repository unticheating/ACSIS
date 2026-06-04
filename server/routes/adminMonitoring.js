import { Router } from 'express'
import { getMonitoringService } from '../services/adminService.js'
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireInstitutionAdmin)

router.get('/', async (req, res) => {
  const activityLimit = req.query.activityLimit != null ? Number(req.query.activityLimit) : undefined
  const result = await getMonitoringService(req.institutionId, { activityLimit })
  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }
  return res.json({
    stats: result.stats,
    activities: result.activities,
    activityTotal: result.activityTotal,
    hasMoreActivity: result.hasMoreActivity,
    activityPreviewLimit: result.activityPreviewLimit,
  })
})

export default router
