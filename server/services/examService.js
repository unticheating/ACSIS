import { getPool } from '../db.js';
import { 
  insertExamTransaction, 
  getExamsByClassIdQuery, 
  updateExamStatusQuery, 
  deleteExamQuery,
  getExamWithQuestionsQuery
} from '../repositories/examRepository.js';
import { getClassByIdQuery } from '../repositories/classRepository.js';
import { checkEnrollment } from '../repositories/studentRepository.js';
import { nextStatusAfterClose, nextStatusAfterPublish } from '../lib/examStatus.js';
import { getStudentSessionsForExamsQuery } from '../repositories/examSessionRepository.js';
import { generateExamPassword } from '../lib/examCodes.js';

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
      payload.questions
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

export async function getClassExamsService(classId, requireActive = false, studentMemberId = null) {
  try {
    const classData = await getClassByIdQuery(classId);
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
    classData.exams = await attachStudentSessionsToExams(exams, studentMemberId)

    return { ok: true, classData };
  } catch (err) {
    console.error('[examService.getClassExams]', err);
    return { ok: false, status: 500, error: 'Database error fetching exams.' };
  }
}

export async function publishExamService(classId, examId) {
  try {
    const exam = await getExamWithQuestionsQuery(classId, examId, false);
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found or you do not have permission.' };
    }

    const nextStatus = nextStatusAfterPublish(exam.status);
    if (!nextStatus) {
      return { ok: false, status: 400, error: 'Only draft exams can be published.' };
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
    return { ok: true, status: nextStatus }
  } catch (err) {
    console.error('[examService.closeExam]', err)
    return { ok: false, status: 500, error: 'Failed to end exam.' }
  }
}

export async function deleteExamService(classId, examId) {
  try {
    const success = await deleteExamQuery(classId, examId);
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[examService.deleteExam]', err);
    return { ok: false, status: 500, error: 'Failed to delete exam.' };
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

    return { ok: true, exam };
  } catch (err) {
    console.error('[examService.getExamDetails]', err);
    return { ok: false, status: 500, error: 'Failed to fetch exam details.' };
  }
}
