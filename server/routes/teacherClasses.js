import { Router } from 'express';
import { createTeacherClass, getTeacherClasses, getTeacherDashboard } from '../controllers/classController.js';
import { createTeacherExam, getTeacherClassStream, publishTeacherExam, deleteTeacherExam, getTeacherExamSession } from '../controllers/examController.js';
import { requireAuth } from '../lib/sessionAuth.js';

const router = Router();

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.authSession?.portal !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers only.' });
  }
  next();
});

router.get('/dashboard', getTeacherDashboard);
router.get('/', getTeacherClasses);
router.post('/', createTeacherClass);

// Exam routes for a specific class
router.get('/:classId/exams', getTeacherClassStream);
router.post('/:classId/exams', createTeacherExam);
router.get('/:classId/exams/:examId', getTeacherExamSession);
router.put('/:classId/exams/:examId', publishTeacherExam);
router.delete('/:classId/exams/:examId', deleteTeacherExam);

export default router;
