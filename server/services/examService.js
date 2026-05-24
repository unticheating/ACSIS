import { getPool } from '../db.js';
import { 
  insertExamTransaction,
  updateExamDraftTransaction,
  getExamsByClassIdQuery,
  listTeacherExamsWithClassMetaQuery,
  updateExamStatusQuery, 
  deleteExamQuery,
  getExamWithQuestionsQuery,
  verifyExamPasswordQuery,
} from '../repositories/examRepository.js';
import { closeOtherTeacherOngoingExamsQuery } from '../repositories/examResultsRepository.js';
import { finalizeExamResultsService } from './examReleaseService.js';
import { getClassByIdQuery, getTeacherClassByIdQuery } from '../repositories/classRepository.js';
import { checkEnrollment } from '../repositories/studentRepository.js';
import { nextStatusAfterClose, nextStatusAfterPublish } from '../lib/examStatus.js';
import { getStudentSessionsForExamsQuery } from '../repositories/examSessionRepository.js';
import { generateExamPassword } from '../lib/examCodes.js';

function normalizeExamPassword(password) {
  if (password == null) return null;
  const trimmed = String(password).trim();
  return trimmed === '' ? null : trimmed;
}

/** Hide lobby password from student API responses. */
function sanitizeExamForStudent(exam) {
  if (!exam) return exam;
  const requiresPassword = Boolean(exam.code && String(exam.code).trim());
  const { code, ...rest } = exam;
  return { ...rest, requiresPassword };
}

export async function createExamService(memberId, classId, payload) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const examPassword =
      payload.password && String(payload.password).trim()
        ? String(payload.password).trim().toUpperCase()
        : generateExamPassword();

    const examId = await insertExamTransaction(
      client,
      memberId,
      classId,
      payload.title,
      examPassword,
      payload.duration || null,
      {
        sections: payload.sections,
        questions: payload.questions,
      },
      {
        shuffleQuestions: Boolean(payload.shuffleQuestions),
        shuffleChoices: Boolean(payload.shuffleChoices),
      },
    );

    await client.query('COMMIT');
    return { ok: true, examId, code: examPassword };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[examService.createExam]', err);
    return { ok: false, error: 'Database transaction failed.' };
  } finally {
    client.release();
  }
}

export async function updateExamDraftService(memberId, classId, examId, payload) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const examPassword = payload.password && String(payload.password).trim()
      ? String(payload.password).trim().toUpperCase()
      : undefined;

    const success = await updateExamDraftTransaction(
      client,
      memberId,
      classId,
      examId,
      payload.title,
      examPassword,
      payload.duration || null,
      {
        sections: payload.sections,
        questions: payload.questions,
      },
      {
        shuffleQuestions: Boolean(payload.shuffleQuestions),
        shuffleChoices: Boolean(payload.shuffleChoices),
      },
    );

    if (!success) {
      await client.query('ROLLBACK');
      return { ok: false, status: 404, error: 'Exam not found, not a draft, or permission denied.' };
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[examService.updateExamDraft]', err);
    return { ok: false, status: 500, error: 'Database transaction failed.' };
  } finally {
    client.release();
  }
}

async function attachStudentSessionsToExams(exams, studentMemberId) {
  if (!studentMemberId || !exams.length) return exams
  const examIds = exams.map((e) => e.id)
  const sessions = await getStudentSessionsForExamsQuery(examIds, studentMemberId)
  const byExam = new Map(sessions.map((s) => [Number(s.exam_id), s]))
  return exams.map((exam) => {
    const sess = byExam.get(Number(exam.id))
    if (!sess) return exam
    return {
      ...exam,
      sessionId: sess.session_id,
      sessionStatus: sess.status,
      warningCount: Number(sess.warning_count || 0),
      submittedAt: sess.submitted_at,
      percentage: sess.percentage != null ? Number(sess.percentage) : null,
      rawScore: sess.raw_score != null ? Number(sess.raw_score) : null,
      totalPoints: sess.total_points != null ? Number(sess.total_points) : null,
    }
  })
}

export async function listTeacherExamsWithClassMetaService(memberId) {
  try {
    const rows = await listTeacherExamsWithClassMetaQuery(memberId);
    return { ok: true, exams: rows };
  } catch (err) {
    console.error('[examService.listTeacherExamsWithClassMeta]', err);
    return { ok: false, error: 'Database error.' };
  }
}

export async function getClassExamsService(classId, requireActive = false, studentMemberId = null, teacherMemberId = null) {
  try {
    const classData = teacherMemberId
      ? await getTeacherClassByIdQuery(classId, teacherMemberId)
      : await getClassByIdQuery(classId);
    if (!classData) {
      return { ok: false, status: 404, error: 'Class not found.' };
    }
    
    if (studentMemberId) {
      const isEnrolled = await checkEnrollment(studentMemberId, classId);
      if (!isEnrolled) {
        return { ok: false, status: 403, error: 'NOT_ENROLLED' };
      }
    }
    
    const exams = await getExamsByClassIdQuery(classId, requireActive)
    const withSessions = await attachStudentSessionsToExams(exams, studentMemberId)
    classData.exams = studentMemberId
      ? withSessions.map(sanitizeExamForStudent)
      : withSessions
    if (studentMemberId && classData) {
      delete classData.accessCode
    }
    return { ok: true, classData };
  } catch (err) {
    console.error('[examService.getClassExams]', err);
    return { ok: false, status: 500, error: 'Database error fetching exams.' };
  }
}

export async function publishExamService(classId, examId, teacherMemberId = null) {
  try {
    const exam = await getExamWithQuestionsQuery(classId, examId, false);
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found or you do not have permission.' };
    }

    const nextStatus = nextStatusAfterPublish(exam.status);
    if (!nextStatus) {
      return { ok: false, status: 400, error: 'Only draft exams can be published.' };
    }

    if (teacherMemberId) {
      await closeOtherTeacherOngoingExamsQuery(teacherMemberId, classId, examId);
    }

    if (!exam.code) {
      const pool = getPool();
      const code = generateExamPassword();
      await pool.query(
        `UPDATE exams SET password = $1 WHERE exam_id = $2 AND class_id = $3`,
        [code, examId, classId],
      );
      exam.code = code;
    }

    const success = await updateExamStatusQuery(classId, examId, nextStatus);
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found or you do not have permission.' };
    }
    return { ok: true, status: nextStatus, code: exam.code };
  } catch (err) {
    console.error('[examService.publishExam]', err);
    return { ok: false, status: 500, error: 'Failed to publish exam.' };
  }
}

export async function closeExamService(classId, examId) {
  try {
    const exam = await getExamWithQuestionsQuery(classId, examId, false)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    const nextStatus = nextStatusAfterClose(exam.status)
    if (!nextStatus) {
      return { ok: false, status: 400, error: 'Only live or lobby exams can be ended.' }
    }

    const success = await updateExamStatusQuery(classId, examId, nextStatus)
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    const { top } = await finalizeExamResultsService(examId)
    return { ok: true, status: nextStatus, topStudent: top }
  } catch (err) {
    console.error('[examService.closeExam]', err)
    return { ok: false, status: 500, error: 'Failed to end exam.' }
  }
}

export async function deleteExamService(classId, examId, teacherMemberId = null) {
  try {
    const success = await deleteExamQuery(classId, examId, teacherMemberId);
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found or you do not have permission.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[examService.deleteExam]', err);
    return { ok: false, status: 500, error: 'Failed to delete exam.' };
  }
}

export async function verifyExamPasswordService(classId, examId, studentMemberId, password) {
  try {
    const isEnrolled = await checkEnrollment(studentMemberId, classId);
    if (!isEnrolled) {
      return { ok: false, status: 403, error: 'NOT_ENROLLED' };
    }

    const exam = await getExamWithQuestionsQuery(classId, examId, true);
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found or not available.' };
    }

    const stored = exam.code ? String(exam.code).trim() : '';
    if (!stored) {
      return { ok: true };
    }

    const attempt = normalizeExamPassword(password);
    if (!attempt) {
      return { ok: false, status: 400, error: 'Exam password is required.' };
    }

    const valid = await verifyExamPasswordQuery(classId, examId, attempt, true);
    if (!valid) {
      return { ok: false, status: 401, error: 'Incorrect exam password.' };
    }

    return { ok: true };
  } catch (err) {
    console.error('[examService.verifyExamPassword]', err);
    return { ok: false, status: 500, error: 'Failed to verify exam password.' };
  }
}

export async function getExamDetailsService(classId, examId, requireActive = false, studentMemberId = null) {
  try {
    if (studentMemberId) {
      const isEnrolled = await checkEnrollment(studentMemberId, classId);
      if (!isEnrolled) {
        return { ok: false, status: 403, error: 'NOT_ENROLLED' };
      }
    }

    const exam = await getExamWithQuestionsQuery(classId, examId, requireActive);
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found or not active.' };
    }

    return {
      ok: true,
      exam: studentMemberId ? sanitizeExamForStudent(exam) : exam,
    };
  } catch (err) {
    console.error('[examService.getExamDetails]', err);
    return { ok: false, status: 500, error: 'Failed to fetch exam details.' };
  }
}
