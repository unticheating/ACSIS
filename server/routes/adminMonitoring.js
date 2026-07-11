import { Router } from 'express'
import { z } from 'zod'
import {
  getMonitoringService,
  getAdminActivityLogsService,
} from '../services/adminService.js'
import { exportAdminActivityLogsService } from '../services/auditLogExportService.js'
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js'

const router = Router()

const exportAuditLogsSchema = z.object({
  search: z.string().optional(),
  eventType: z.string().optional(),
  examId: z.union([z.string(), z.number()]).optional(),
  sectionKey: z.string().optional(),
  teacherMemberId: z.union([z.string(), z.number()]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  examTitle: z.string().optional(),
  sectionLabel: z.string().optional(),
  teacherName: z.string().optional(),
})

router.use(requireAuth, requireInstitutionAdmin)

router.get('/', async (req, res) => {
  const result = await getMonitoringService(req.institutionId)
  if (!result.ok) {
    return res.status(500).json({ error: result.error })
  }
  return res.json({ stats: result.stats })
})

router.get('/audit-logs', async (req, res) => {
  const result = await getAdminActivityLogsService(req.institutionId, req.query)
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error })
  }
  return res.json(result)
})

router.post('/audit-logs/export', async (req, res) => {
  try {
    const payload = exportAuditLogsSchema.parse(req.body ?? {})
    const result = await exportAdminActivityLogsService(req.institutionId, {
      search: payload.search || '',
      eventType: payload.eventType || '',
      examId: payload.examId ? String(payload.examId) : '',
      sectionKey: payload.sectionKey || '',
      teacherMemberId: payload.teacherMemberId ? String(payload.teacherMemberId) : '',
      dateFrom: payload.dateFrom || '',
      dateTo: payload.dateTo || '',
      examTitle: payload.examTitle || '',
      sectionLabel: payload.sectionLabel || '',
      teacherName: payload.teacherName || '',
    })
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error })
    }
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    return res.send(result.body)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message })
    }
    console.error('[adminMonitoring.exportAuditLogs]', err)
    return res.status(500).json({ error: 'Failed to export audit trail.' })
  }
})

export default router
