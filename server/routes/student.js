import { Router } from 'express';
import { enroll, getClasses, unenroll, updateStudentNumber } from '../controllers/studentController.js';
import {
  getStudentClassStream,
  getStudentExamSession,
  joinStudentExam,
  logStudentCheating,
  submitStudentExam,
  getStudentPerformance,
  postStudentVerifyExamPassword,
} from '../controllers/examController.js';
import { requireAuth, requireStudentMember, resolveStudentInstitution } from '../lib/sessionAuth.js';

const router = Router();

router.use(requireAuth);
router.use(requireStudentMember);

router.post('/enroll', enroll);
router.get('/performance', getStudentPerformance);
router.get('/classes', getClasses);
router.delete('/classes/:classId/enroll', unenroll);
router.get('/classes/:classId/exams', getStudentClassStream);
router.post('/classes/:classId/exams/:examId/join', joinStudentExam);
router.get('/classes/:classId/exams/:examId/session', getStudentExamSession);
router.post('/classes/:classId/exams/:examId/verify-password', postStudentVerifyExamPassword);
router.post('/classes/:classId/exams/:examId/cheating', logStudentCheating);
router.post('/classes/:classId/exams/:examId/submit', submitStudentExam);

router.post('/onboarding/student-number', resolveStudentInstitution, updateStudentNumber);

export default router;
