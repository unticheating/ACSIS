import { Router } from 'express';
import {
  createTeacherClass,
  getTeacherClasses,
  getTeacherDashboard,
  getTeacherClassEnrollments,
  deleteTeacherClassEnrollment,
  updateTeacherClass,
  deleteTeacherClass,
  getTeacherClass,
} from '../controllers/classController.js';
import {
  createTeacherExam,
  updateTeacherExam,
  getTeacherClassStream,
  getTeacherExamsCatalog,
  publishTeacherExam,
  patchTeacherExamPassword,
  deleteTeacherExam,
  getTeacherExamSession,
  startTeacherExam,
  copyTeacherExam,
  restartTeacherExam,
  closeTeacherExam,
  getTeacherExamResults,
  getTeacherExamAssignments,
  updateTeacherExamAssignments,
  dismissTeacherViolation,
  getTeacherExamSessionDetail,
  getTeacherActiveMonitoring,
  getTeacherActivityLogs,
  postExportTeacherActivityLogs,
  getTeacherMonitoringSnapshot,
  streamTeacherMonitoringSnapshot,
  listTeacherReportExams,
  patchManualGrade,
  postExportExamReport,
  postExportExamPaper,
  postReleaseExamScores,
  deleteTeacherExamSession,
} from '../controllers/examController.js';
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
router.get('/reports/exams', listTeacherReportExams);
router.get('/monitoring/active', getTeacherActiveMonitoring);
router.get('/activity-logs', getTeacherActivityLogs);
router.post('/activity-logs/export', postExportTeacherActivityLogs);
router.get('/exams', getTeacherExamsCatalog);
router.get('/', getTeacherClasses);
router.post('/', createTeacherClass);

// Single class (before /:classId/exams)
router.get('/:classId', getTeacherClass);
router.get('/:classId/enrollments', getTeacherClassEnrollments);
router.delete('/:classId/enrollments/:memberId', deleteTeacherClassEnrollment);
router.patch('/:classId', updateTeacherClass);
router.delete('/:classId', deleteTeacherClass);

// Exam routes for a specific class
router.get('/:classId/exams', getTeacherClassStream);
router.post('/:classId/exams', createTeacherExam);
router.put('/:classId/exams/:examId/content', updateTeacherExam);
router.get('/:classId/exams/:examId', getTeacherExamSession);
router.get('/:classId/exams/:examId/assignments', getTeacherExamAssignments);
router.put('/:classId/exams/:examId/assignments', updateTeacherExamAssignments);
router.get('/:classId/exams/:examId/results', getTeacherExamResults);
router.get('/:classId/exams/:examId/monitoring', getTeacherMonitoringSnapshot);
router.get('/:classId/exams/:examId/monitoring/stream', streamTeacherMonitoringSnapshot);
router.get('/:classId/exams/:examId/results/:sessionId', getTeacherExamSessionDetail);
router.post(
  '/:classId/exams/:examId/results/:sessionId/violations/:logId/dismiss',
  dismissTeacherViolation,
);
router.patch(
  '/:classId/exams/:examId/results/:sessionId/answers/:answerId/grade',
  patchManualGrade,
);
router.post('/:classId/exams/:examId/release-scores', postReleaseExamScores);
router.post('/:classId/exams/:examId/reports/export', postExportExamReport);
router.post('/:classId/exams/:examId/paper/export', postExportExamPaper);
router.put('/:classId/exams/:examId', publishTeacherExam);
router.patch('/:classId/exams/:examId/password', patchTeacherExamPassword);
router.put('/:classId/exams/:examId/start', startTeacherExam);
router.post('/:classId/exams/:examId/copy', copyTeacherExam);
router.put('/:classId/exams/:examId/restart', restartTeacherExam);
router.put('/:classId/exams/:examId/close', closeTeacherExam);
router.delete('/:classId/exams/:examId/sessions/:sessionId', deleteTeacherExamSession);
router.delete('/:classId/exams/:examId', deleteTeacherExam);

export default router;
