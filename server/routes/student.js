import { Router } from 'express';
import { enroll, getClasses } from '../controllers/studentController.js';
<<<<<<< Updated upstream
import { getStudentClassStream, getStudentExamSession } from '../controllers/examController.js';
import { requireAuth, requireStudentMember } from '../lib/sessionAuth.js';
=======
import {
  getStudentClassStream,
  getStudentExamSession,
  joinStudentExam,
  logStudentCheating,
  submitStudentExam,
  getStudentPerformance,
} from '../controllers/examController.js';
import { requireAuth } from '../lib/sessionAuth.js';
>>>>>>> Stashed changes

const router = Router();

router.use(requireAuth);
router.use(requireStudentMember);

router.post('/enroll', enroll);
router.get('/performance', getStudentPerformance);
router.get('/classes', getClasses);
router.get('/classes/:classId/exams', getStudentClassStream);
router.post('/classes/:classId/exams/:examId/join', joinStudentExam);
router.get('/classes/:classId/exams/:examId/session', getStudentExamSession);
router.post('/classes/:classId/exams/:examId/cheating', logStudentCheating);
router.post('/classes/:classId/exams/:examId/submit', submitStudentExam);

export default router;
