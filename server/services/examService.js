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
import { nextStatusAfterPublish } from '../lib/examStatus.js';

export async function createExamService(memberId, classId, payload) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const examId = await insertExamTransaction(
      client,
      memberId,
      classId,
      payload.title,
      payload.password || null,
      payload.duration || null,
      payload.questions
    );

    await client.query('COMMIT');
    return { ok: true, examId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[examService.createExam]', err);
    return { ok: false, error: 'Database transaction failed.' };
  } finally {
    client.release();
  }
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
    
    const exams = await getExamsByClassIdQuery(classId, requireActive);
    classData.exams = exams;
    
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

    const success = await updateExamStatusQuery(classId, examId, nextStatus);
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found or you do not have permission.' };
    }
    return { ok: true, status: nextStatus };
  } catch (err) {
    console.error('[examService.publishExam]', err);
    return { ok: false, status: 500, error: 'Failed to publish exam.' };
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
