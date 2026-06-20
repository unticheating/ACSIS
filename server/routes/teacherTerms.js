import { Router } from 'express'
import {
  createTeacherTerm,
  deleteTeacherTerm,
  getTeacherTerm,
  listTeacherTerms,
  patchTeacherTerm,
  updateTeacherTermsSort,
} from '../controllers/teachingTermController.js'
import { requireAuth, resolveTeacherInstitution } from '../lib/sessionAuth.js'

const router = Router()

router.use(requireAuth)
router.use((req, res, next) => {
  if (req.authSession?.portal !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers only.' })
  }
  next()
})
router.use(resolveTeacherInstitution)

router.get('/', listTeacherTerms)
router.post('/', createTeacherTerm)
router.put('/sort', updateTeacherTermsSort)
router.get('/:termId', getTeacherTerm)
router.patch('/:termId', patchTeacherTerm)
router.delete('/:termId', deleteTeacherTerm)

export default router
