import { Router } from 'express';
import { enroll, getClasses } from '../controllers/studentController.js';
import { getStudentClassStream, getStudentExamSession } from '../controllers/examController.js';
import { requireAuth } from '../lib/sessionAuth.js';

const router = Router();

// All student routes require authentication
router.use(requireAuth);

router.post('/enroll', enroll);
router.get('/classes', getClasses);
router.get('/classes/:classId/exams', getStudentClassStream);
router.get('/classes/:classId/exams/:examId', getStudentExamSession);

export default router;
