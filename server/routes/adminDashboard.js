import { Router } from 'express'
import { getAdminDashboardService } from '../services/adminService.js'
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireInstitutionAdmin)

router.get('/', async (req, res) => {
  const result = await getAdminDashboardService(req.institutionId)
  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }
  return res.json(result.data)
})

export default router
