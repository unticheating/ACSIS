import { z } from 'zod';
import {
  closeExamService,
  createExamService,
  getClassExamsService,
  listTeacherExamsWithClassMetaService,
  publishExamService,
  deleteExamService,
  getExamDetailsService,
  verifyExamPasswordService,
} from '../services/examService.js';
import {
  getStudentExamSessionService,
  joinExamService,
  logCheatingEventService,
  startExamService,
  submitExamService,
} from '../services/examSessionService.js';
import {
  getStudentPerformanceService,
  getTeacherActiveMonitoringService,
  getTeacherExamResultsService,
  getTeacherExamSessionDetailService,
  getTeacherMonitoringSnapshotService,
  listTeacherReportExamsService,
} from '../services/examResultsService.js';

// Input validation schemas
const choiceSchema = z.string().min(1, 'Option text cannot be empty');

const questionSchema = z.object({
  type: z.enum(['multiple', 'multiple-choice', 'identification', 'truefalse']),
  question: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(choiceSchema).optional(),
  correctAnswer: z.string().min(1, 'Correct answer is required')
}).superRefine((val, ctx) => {
  if ((val.type === 'multiple' || val.type === 'multiple-choice') && (!val.options || val.options.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Multiple choice questions must have at least 2 options",
      path: ['options']
    });
  }
});

const createExamSchema = z.object({
  title: z.string().min(1, 'Exam title is required'),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  password: z
    .string()
    .max(20, 'Exam password must be 20 characters or fewer')
    .optional()
    .transform((v) => (v == null || v.trim() === '' ? undefined : v.trim())),
  questions: z.array(questionSchema).min(1, 'At least one question is required')
});

export async function getTeacherExamsCatalog(req, res) {
  const result = await listTeacherExamsWithClassMetaService(req.memberId);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result.exams);
}

export async function createTeacherExam(req, res) {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ error: 'Class ID is required.' });

    // Validate payload
    const payload = createExamSchema.parse(req.body);

    const result = await createExamService(req.memberId, classId, payload);
    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(201).json({ ok: true, examId: result.examId, code: result.code });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message, details: err.errors });
    }
    console.error('[examController.createTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to create exam.' });
  }
}

export async function getTeacherClassStream(req, res) {
  const { classId } = req.params;
  const result = await getClassExamsService(classId, false, null, req.memberId);
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.classData);
}

export async function publishTeacherExam(req, res) {
  const { classId, examId } = req.params;
  const result = await publishExamService(classId, examId, req.memberId);
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json({ ok: true, status: result.status, code: result.code });
}

export async function deleteTeacherExam(req, res) {
  const { classId, examId } = req.params;
  const result = await deleteExamService(classId, examId, req.memberId);
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json({ ok: true });
}

export async function getStudentClassStream(req, res) {
  const { classId } = req.params;
  const result = await getClassExamsService(classId, true, req.memberId); // Require active exams, enforce enrollment
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.classData);
}

export async function joinStudentExam(req, res) {
  const { classId, examId } = req.params;
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password.trim()) {
    return res.status(400).json({ error: 'Exam code is required.' });
  }

  try {
    const result = await joinExamService(classId, examId, req.memberId, password);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    console.error('[examController.joinStudentExam]', err);
    const detail = err instanceof Error ? err.message : ''
    return res.status(500).json({
      error: detail.includes('foreign key')
        ? 'Could not start exam session. Restart the API server and try again.'
        : 'Failed to join exam.',
    });
  }
}

export async function getStudentExamSession(req, res) {
  const { classId, examId } = req.params;
  try {
    const result = await getStudentExamSessionService(classId, examId, req.memberId);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    console.error('[examController.getStudentExamSession]', err);
    return res.status(500).json({ error: 'Failed to load exam session.' });
  }
}

export async function logStudentCheating(req, res) {
  const { classId, examId } = req.params;
  const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType : 'other';
  const details = typeof req.body?.details === 'string' ? req.body.details : null;

  try {
    const result = await logCheatingEventService(classId, examId, req.memberId, eventType, details);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({
      ok: true,
      warningCount: result.warningCount,
      sessionId: result.sessionId,
      autoSubmitted: Boolean(result.autoSubmitted),
      rawScore: result.rawScore,
      totalPoints: result.totalPoints,
      percentage: result.percentage,
    });
  } catch (err) {
    console.error('[examController.logStudentCheating]', err);
    return res.status(500).json({ error: 'Failed to log event.' });
  }
}

export async function submitStudentExam(req, res) {
  const { classId, examId } = req.params;
  const answers = req.body?.answers;

  try {
    const result = await submitExamService(classId, examId, req.memberId, answers);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({
      ok: true,
      sessionId: result.sessionId,
      rawScore: result.rawScore,
      totalPoints: result.totalPoints,
      percentage: result.percentage,
    });
  } catch (err) {
    console.error('[examController.submitStudentExam]', err);
    return res.status(500).json({ error: 'Failed to submit exam.' });
  }
}

export async function closeTeacherExam(req, res) {
  const { classId, examId } = req.params;
  try {
    const result = await closeExamService(classId, examId);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({ ok: true, status: result.status });
  } catch (err) {
    console.error('[examController.closeTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to end exam.' });
  }
}

export async function startTeacherExam(req, res) {
  const { classId, examId } = req.params;
  try {
    const result = await startExamService(classId, examId, req.memberId);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({ ok: true, status: result.status });
  } catch (err) {
    console.error('[examController.startTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to start exam.' });
  }
}

const verifyExamPasswordSchema = z.object({
  password: z.string().min(1, 'Exam password is required').max(20),
});

export async function postStudentVerifyExamPassword(req, res) {
  const { classId, examId } = req.params;
  const parsed = verifyExamPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const result = await verifyExamPasswordService(
    classId,
    examId,
    req.memberId,
    parsed.data.password,
  );

  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json({ ok: true });
}

export async function getTeacherExamSession(req, res) {
  const { classId, examId } = req.params;
  // Teachers don't need active exams and don't need enrollment checks
  const result = await getExamDetailsService(classId, examId, false, null);
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.exam);
}

export async function getTeacherExamResults(req, res) {
  const { classId, examId } = req.params;
  const result = await getTeacherExamResultsService(classId, examId, req.memberId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}

export async function getTeacherExamSessionDetail(req, res) {
  const { classId, examId, sessionId } = req.params;
  const result = await getTeacherExamSessionDetailService(classId, examId, sessionId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}

export async function getTeacherActiveMonitoring(req, res) {
  const result = await getTeacherActiveMonitoringService(req.memberId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}

export async function getTeacherMonitoringSnapshot(req, res) {
  const { classId, examId } = req.params;
  const result = await getTeacherMonitoringSnapshotService(classId, examId, req.memberId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}

export async function listTeacherReportExams(req, res) {
  const result = await listTeacherReportExamsService(req.memberId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}

export async function getStudentPerformance(req, res) {
  const result = await getStudentPerformanceService(req.memberId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}
