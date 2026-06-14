import { z } from 'zod';
import { resolveMatchingPayload } from '../lib/matchingAnswers.js';
import {
  closeExamService,
  createExamService,
  copyExamService,
  updateExamDraftService,
  getClassExamsService,
  listTeacherExamsWithClassMetaService,
  publishExamService,
  updateExamPasswordService,
  deleteExamService,
  getExamDetailsService,
  verifyExamPasswordService,
} from '../services/examService.js';
import {
  getStudentExamSessionService,
  joinExamService,
  lockStudentExamSessionService,
  logCheatingEventService,
  restartExamService,
  saveStudentAnswerService,
  startExamService,
  submitExamService,
} from '../services/examSessionService.js';
import {
  getStudentPerformanceService,
  getTeacherActiveMonitoringService,
  getTeacherActivityLogsService,
  getTeacherExamAssignmentRosterService,
  getTeacherExamResultsService,
  dismissTeacherViolationService,
  getTeacherExamSessionDetailService,
  getTeacherMonitoringSnapshotService,
  listTeacherReportExamsService,
  updateTeacherExamAssignmentRosterService,
} from '../services/examResultsService.js';
import { manualGradeAnswerService } from '../services/examGradingService.js';
import { exportExamReportService } from '../services/examReportService.js';
import { releaseExamScoresService } from '../services/examReleaseService.js';

// Input validation schemas
const choiceSchema = z.string().min(1, 'Option text cannot be empty');

const questionSchema = z.object({
  id: z.union([z.number().int().positive(), z.string()]).optional(),
  type: z.enum([
    'multiple',
    'multiple-choice',
    'identification',
    'truefalse',
    'coding',
    'matching',
    'essay',
    'diagramming',
  ]),
  question: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(choiceSchema).optional(),
  correctAnswer: z.string().optional().default(''),
  presentationAnswer: z.string().optional().nullable(),
  answerExplanation: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  matchingPairs: z
    .array(
      z.object({
        left: z.string(),
        right: z.string(),
      }),
    )
    .optional(),
  diagramVariant: z.enum(['flowchart', 'erd']).optional(),
  diagramReference: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if ((val.type === 'multiple' || val.type === 'multiple-choice') && (!val.options || val.options.length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Multiple choice questions must have at least 2 options",
      path: ['options']
    });
  }
  if (val.type === 'identification') {
    const parts = String(val.correctAnswer || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter at least one acceptable identification answer (comma-separated).',
        path: ['correctAnswer'],
      });
    }
  }
  if (val.type === 'truefalse' && !String(val.correctAnswer || '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'True / False questions require a correct answer.',
      path: ['correctAnswer'],
    });
  }
  if (val.type === 'coding' && !String(val.correctAnswer || '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Coding questions require an expected solution.',
      path: ['correctAnswer'],
    });
  }
  if (val.type === 'matching') {
    const pairs = resolveMatchingPayload(val);
    if (pairs.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Matching questions need at least two pairs.',
        path: ['matchingPairs'],
      });
    }
  }
});

const sectionSchema = z.object({
  id: z.union([z.number().int().positive(), z.string()]).optional(),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  questions: z.array(questionSchema).default([]),
});

const createExamSchema = z
  .object({
    title: z.string().min(1, 'Exam title is required'),
    password: z
      .string()
      .max(20, 'Exam password must be 20 characters or fewer')
      .optional()
      .transform((v) => (v == null || v.trim() === '' ? undefined : v.trim())),
    shuffleQuestions: z.boolean().optional().default(false),
    shuffleChoices: z.boolean().optional().default(false),
    scheduledStart: z.string().datetime().nullable().optional().default(null),
    scheduledEnd: z.string().datetime().nullable().optional().default(null),
    isAutoPublish: z.boolean().optional().default(false),
    description: z.string().optional().default(''),
    sections: z.array(sectionSchema).optional(),
    questions: z.array(questionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const fromSections = (data.sections || []).reduce((n, s) => n + (s.questions?.length || 0), 0);
    const fromFlat = (data.questions || []).length;
    if (fromSections + fromFlat < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one question is required',
        path: ['questions'],
      });
    }
  });

const manualGradeSchema = z.object({
  isCorrect: z.boolean(),
});

const releaseScoresSchema = z.object({
  sendEmail: z.boolean().optional().default(true),
  includeAnswerKey: z.boolean().optional().default(false),
  sessionIds: z.array(z.number().int().positive()).optional(),
});

const exportReportSchema = z.object({
  format: z.enum(['csv', 'pdf', 'excel']).optional(),
  reportType: z.enum(['detailed', 'summary', 'violations']).optional(),
  teacherLogoBase64: z.string().optional(),
  departmentName: z.string().optional(),
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
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error', details: err.issues });
    }
    console.error('[examController.createTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to create exam.' });
  }
}

const copyExamSchema = z.object({
  targetClassId: z.string().min(1, 'Target class ID is required'),
  scheduledStart: z.string().datetime().nullable().optional().default(null),
  scheduledEnd: z.string().datetime().nullable().optional().default(null),
});

export async function copyTeacherExam(req, res) {
  try {
    const { classId, examId } = req.params;
    if (!classId || !examId) return res.status(400).json({ error: 'Class ID and Exam ID are required.' });

    const payload = copyExamSchema.parse(req.body);

    const result = await copyExamService(
      req.memberId,
      classId,
      payload.targetClassId,
      examId,
      payload.scheduledStart,
      payload.scheduledEnd
    );

    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    return res.status(201).json({ ok: true, examId: result.examId, classId: result.classId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error', details: err.issues });
    }
    console.error('[examController.copyTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to copy exam.' });
  }
}

export async function updateTeacherExam(req, res) {
  try {
    const { classId, examId } = req.params;
    if (!classId || !examId) return res.status(400).json({ error: 'Class ID and Exam ID are required.' });

    const payload = createExamSchema.parse(req.body);

    const result = await updateExamDraftService(req.memberId, classId, examId, payload);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error', details: err.issues });
    }
    console.error('[examController.updateTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to update exam.' });
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

const assignmentSchema = z.object({
  studentIds: z.array(z.number().int().positive()).optional().default([]),
});

export async function getTeacherExamAssignments(req, res) {
  const { classId, examId } = req.params
  const result = await getTeacherExamAssignmentRosterService(classId, examId, req.memberId)
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error })
  }
  return res.json(result)
}

export async function updateTeacherExamAssignments(req, res) {
  const { classId, examId } = req.params
  try {
    const payload = assignmentSchema.parse(req.body)
    const result = await updateTeacherExamAssignmentRosterService(
      classId,
      examId,
      req.memberId,
      payload.studentIds,
    )
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error })
    }
    return res.json({ ok: true, assignedCount: result.assignedCount, assignedStudentIds: result.assignedStudentIds })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error', details: err.issues })
    }
    console.error('[examController.updateTeacherExamAssignments]', err)
    return res.status(500).json({ error: 'Failed to update exam assignments.' })
  }
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
      maxWarnings: result.maxWarnings,
      sessionLocked: Boolean(result.sessionLocked),
      autoSubmitted: false,
    });
  } catch (err) {
    console.error('[examController.logStudentCheating]', err);
    return res.status(500).json({ error: 'Failed to log event.' });
  }
}

export async function lockStudentExam(req, res) {
  const { classId, examId } = req.params;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'time_up';

  try {
    const result = await lockStudentExamSessionService(classId, examId, req.memberId, reason);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    console.error('[examController.lockStudentExam]', err);
    return res.status(500).json({ error: 'Failed to lock exam.' });
  }
}

export async function saveStudentExamAnswer(req, res) {
  const { classId, examId } = req.params;

  try {
    const result = await saveStudentAnswerService(classId, examId, req.memberId, req.body);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[examController.saveStudentExamAnswer]', err);
    return res.status(500).json({ error: 'Failed to save answer.' });
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
      scoreReleased: Boolean(result.scoreReleased),
      scorePending: Boolean(result.scorePending),
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
    return res.json({ ok: true, status: result.status, topStudent: result.topStudent ?? null });
  } catch (err) {
    console.error('[examController.closeTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to end exam.' });
  }
}

export async function startTeacherExam(req, res) {
  const { classId, examId } = req.params;
  const { newScheduledEnd } = req.body || {};
  try {
    const result = await startExamService(classId, examId, req.memberId, { newScheduledEnd });
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({ ok: true, status: result.status });
  } catch (err) {
    console.error('[examController.startTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to start exam.' });
  }
}

const patchExamPasswordSchema = z.object({
  password: z.string().min(1, 'Exam code is required').max(20, 'Exam code must be 20 characters or fewer'),
});

export async function patchTeacherExamPassword(req, res) {
  const { classId, examId } = req.params;
  const parsed = patchExamPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid exam code.',
    });
  }
  try {
    const result = await updateExamPasswordService(classId, examId, req.memberId, parsed.data.password);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({ ok: true, code: result.code });
  } catch (err) {
    console.error('[examController.patchTeacherExamPassword]', err);
    return res.status(500).json({ error: 'Failed to update exam code.' });
  }
}

export async function restartTeacherExam(req, res) {
  const { classId, examId } = req.params;
  const { newScheduledEnd, newScheduledStart } = req.body || {};
  try {
    const result = await restartExamService(classId, examId, req.memberId, {
      newScheduledEnd,
      newScheduledStart,
    });
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json({ ok: true, status: result.status });
  } catch (err) {
    console.error('[examController.restartTeacherExam]', err);
    return res.status(500).json({ error: 'Failed to restart exam.' });
  }
}

const verifyExamPasswordSchema = z.object({
  password: z.string().min(1, 'Exam password is required').max(20),
});

export async function postStudentVerifyExamPassword(req, res) {
  const { classId, examId } = req.params;
  const parsed = verifyExamPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Invalid exam code.',
    });
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

export async function dismissTeacherViolation(req, res) {
  const { classId, examId, sessionId, logId } = req.params;
  const result = await dismissTeacherViolationService(
    classId,
    examId,
    sessionId,
    logId,
    req.memberId,
  );
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

export async function getTeacherActivityLogs(req, res) {
  const result = await getTeacherActivityLogsService(req.memberId, req.query?.limit)
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error })
  }
  return res.json(result)
}

export async function getTeacherMonitoringSnapshot(req, res) {
  const { classId, examId } = req.params;
  const result = await getTeacherMonitoringSnapshotService(classId, examId, req.memberId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result);
}

/** Server-Sent Events: push when roster/cheating changes (replaces 5s polling at scale). */
export async function streamTeacherMonitoringSnapshot(req, res) {
  const { classId, examId } = req.params;
  const { subscribeMonitoring } = await import('../lib/monitoringBroadcast.js');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  async function pushSnapshot() {
    const result = await getTeacherMonitoringSnapshotService(classId, examId, req.memberId);
    if (!result.ok) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: result.error })}\n\n`);
      return;
    }
    res.write(`data: ${JSON.stringify(result)}\n\n`);
  }

  await pushSnapshot();
  const unsubscribe = subscribeMonitoring(classId, examId, () => {
    pushSnapshot().catch((err) => {
      console.error('[streamTeacherMonitoringSnapshot]', err);
    });
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
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

export async function patchManualGrade(req, res) {
  const { classId, examId, sessionId, answerId } = req.params;
  try {
    const body = manualGradeSchema.parse(req.body);
    const result = await manualGradeAnswerService(
      classId,
      examId,
      sessionId,
      answerId,
      req.memberId,
      body.isCorrect,
    );
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('[examController.patchManualGrade]', err);
    return res.status(500).json({ error: 'Failed to save grade.' });
  }
}

export async function postReleaseExamScores(req, res) {
  const { classId, examId } = req.params;
  try {
    const body = releaseScoresSchema.parse(req.body ?? {});
    const result = await releaseExamScoresService(classId, examId, req.memberId, body);
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('[examController.postReleaseExamScores]', err);
    return res.status(500).json({ error: 'Failed to release scores.' });
  }
}

export async function postExportExamReport(req, res) {
  const { classId, examId } = req.params;
  try {
    const payload = exportReportSchema.parse(req.body ?? {});

    const result = await exportExamReportService(classId, examId, req.memberId, {
      format: payload.format,
      reportType: payload.reportType,
      teacherLogoBase64: payload.teacherLogoBase64,
      departmentName: payload.departmentName,
    });
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('[examController.postExportExamReport]', err);
    return res.status(500).json({ error: 'Failed to export report.' });
  }
}
