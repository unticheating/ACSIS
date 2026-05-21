import { Router } from 'express';
import { createAdminClass, getAdminClasses } from '../controllers/classController.js';
import { requireAuth, requireInstitutionAdmin } from '../lib/sessionAuth.js';

const router = Router();

router.use(requireAuth, requireInstitutionAdmin);

router.get('/', getAdminClasses);
router.post('/', createAdminClass);

export default router;
