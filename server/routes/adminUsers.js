import { Router } from 'express'
import { getPool } from '../db.js'
import { createInstitutionUser, listInstitutionUsers, updateInstitutionUser } from '../lib/institutionUsers.js'
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth, requireInstitutionAdmin)

router.get('/', async (req, res) => {
  try {
    const pool = getPool()
    const users = await listInstitutionUsers(pool, req.institutionId)
    const pendingFaculty = users.filter((u) => u.role === 'faculty' && u.status === 'pending').length
    return res.json({ users, pendingFaculty })
  } catch (err) {
    console.error('[admin/users GET]', err)
    return res.status(500).json({ error: 'Failed to load users.' })
  }
})

router.post('/', async (req, res) => {
  try {
    const pool = getPool()
    const result = await createInstitutionUser(pool, req.institutionId, req.body)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    return res.status(201).json(result)
  } catch (err) {
    console.error('[admin/users POST]', err)
    return res.status(500).json({ error: 'Failed to create user.' })
  }
})

router.patch('/:uid', async (req, res) => {
  const uid = Number(req.params.uid)
  if (!Number.isFinite(uid)) {
    return res.status(400).json({ error: 'Invalid user id.' })
  }
  try {
    const pool = getPool()
    const result = await updateInstitutionUser(pool, req.institutionId, uid, req.body)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }
    return res.json(result)
  } catch (err) {
    console.error('[admin/users PATCH]', err)
    return res.status(500).json({ error: 'Failed to update user.' })
  }
})

export default router
