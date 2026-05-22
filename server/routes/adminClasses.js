import { Router } from 'express';
import { getAdminClasses } from '../controllers/classController.js';
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js';

const router = Router();

router.use(requireAuth, requireInstitutionAdmin);

/** Institution admin: view classes and exams only (faculty creates/edits classes). */
router.get('/', getAdminClasses);

export default router;
