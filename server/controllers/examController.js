import { z } from 'zod';
import { createExamService, getClassExamsService, publishExamService, deleteExamService, getExamDetailsService } from '../services/examService.js';

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
  password: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required')
});

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

    return res.status(201).json({ ok: true, examId: result.examId });
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
  const result = await getClassExamsService(classId, false); // Fetch all exams
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.classData);
}

export async function publishTeacherExam(req, res) {
  const { classId, examId } = req.params;
  const result = await publishExamService(classId, examId);
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json({ ok: true, status: result.status });
}

export async function deleteTeacherExam(req, res) {
  const { classId, examId } = req.params;
  const result = await deleteExamService(classId, examId);
  
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

export async function getStudentExamSession(req, res) {
  const { classId, examId } = req.params;
  // Require active exams, enforce enrollment
  const result = await getExamDetailsService(classId, examId, true, req.memberId);
  
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.exam);
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
