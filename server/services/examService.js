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
  updateExamPasswordByTeacherQuery,
} from '../repositories/examRepository.js';
import { closeOtherTeacherOngoingExamsQuery } from '../repositories/examResultsRepository.js';
import { finalizeExamResultsService } from './examReleaseService.js';
import { getClassByIdQuery, getTeacherClassByIdQuery, getClassOwnerMemberIdQuery } from '../repositories/classRepository.js';
import { getExamAssignmentAccessQuery } from '../repositories/examAssignmentRepository.js'
import { checkEnrollment } from '../repositories/studentRepository.js';
import { nextStatusAfterClose, nextStatusAfterPublish } from '../lib/examStatus.js';
import { getStudentSessionsForExamsQuery } from '../repositories/examSessionRepository.js';
import { generateExamPassword } from '../lib/examCodes.js';
import { recordTeacherActivityQuery } from '../repositories/teacherActivityRepository.js'

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
      {
        sections: payload.sections,
        questions: payload.questions,
        description: payload.description,
      },
      {
        shuffleQuestions: Boolean(payload.shuffleQuestions),
        shuffleChoices: Boolean(payload.shuffleChoices),
        scheduledStart: payload.scheduledStart,
        scheduledEnd: payload.scheduledEnd,
        isAutoPublish: Boolean(payload.isAutoPublish),
      },
    );

    await client.query('COMMIT');
    void recordTeacherActivityQuery({
      teacherMemberId: memberId,
      classId,
      examId,
      eventType: 'exam_created',
      details: String(payload.title || 'Untitled exam').slice(0, 500),
    }).catch((err) => {
      console.error('[examService.createExam] teacher activity log failed:', err)
    })
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

    const result = await updateExamDraftTransaction(
      client,
      memberId,
      classId,
      examId,
      payload.title,
      examPassword,
      {
        sections: payload.sections,
        questions: payload.questions,
        description: payload.description,
      },
      {
        shuffleQuestions: Boolean(payload.shuffleQuestions),
        shuffleChoices: Boolean(payload.shuffleChoices),
        scheduledStart: payload.scheduledStart,
        scheduledEnd: payload.scheduledEnd,
        isAutoPublish: Boolean(payload.isAutoPublish),
      },
    );

    if (!result.ok) {
      await client.query('ROLLBACK');
      const messages = {
        NOT_FOUND: 'Exam not found or you do not have permission to edit it.',
      };
      return {
        ok: false,
        status: 404,
        error: messages[result.code] || 'Could not update exam.',
      };
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[examService.updateExamDraft]', err);
    if (err?.code === 'QUESTION_LOCKED') {
      return { ok: false, status: 409, error: err.message };
    }
    if (err?.code === 'VALIDATION') {
      return { ok: false, status: 400, error: err.message };
    }
    return { ok: false, status: 500, error: 'Database transaction failed.' };
  } finally {
    client.release();
  }
}

export async function copyExamService(memberId, sourceClassId, targetClassId, examId, scheduledStart, scheduledEnd) {
  try {
    const sourceClass = await getTeacherClassByIdQuery(sourceClassId, memberId);
    if (!sourceClass) {
      return { ok: false, status: 403, error: 'Source class not found or permission denied.' };
    }
    const targetClass = await getTeacherClassByIdQuery(targetClassId, memberId);
    if (!targetClass) {
      return { ok: false, status: 403, error: 'Target class not found or permission denied.' };
    }

    const exam = await getExamWithQuestionsQuery(sourceClassId, examId, false);
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' };
    }

    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const newTitle = `Copy of ${exam.title || 'Untitled exam'}`;
      const examPassword = generateExamPassword();
      
      const sectionsMap = new Map();
      const sections = [];
      
      for (const s of (exam.sections || [])) {
        const newSec = { title: s.title, description: s.description, questions: [] };
        sectionsMap.set(s.id, newSec);
        sections.push(newSec);
      }
      
      const flatQuestions = [];
      for (const q of (exam.questions || [])) {
        const qCopy = {
          type: q.type,
          question: q.question,
          points: q.points,
          imageUrl: q.imageUrl,
          options: q.options,
          correctAnswer: q.correctAnswer,
          presentationAnswer: q.presentationAnswer ?? null,
          answerExplanation: q.answerExplanation ?? null,
        };
        if (q.sectionId && sectionsMap.has(q.sectionId)) {
          sectionsMap.get(q.sectionId).questions.push(qCopy);
        } else {
          flatQuestions.push(qCopy);
        }
      }

      const payload = {
        sections: sections.length > 0 ? sections : undefined,
        questions: sections.length === 0 ? flatQuestions : undefined,
        description: exam.description || '',
      };

      const newExamId = await insertExamTransaction(
        client,
        memberId,
        targetClassId,
        newTitle,
        examPassword,
        payload,
        {
          shuffleQuestions: Boolean(exam.shuffleQuestions),
          shuffleChoices: Boolean(exam.shuffleChoices),
          scheduledStart,
          scheduledEnd,
          isAutoPublish: false,
        }
      );

      await client.query('COMMIT');
      return { ok: true, examId: newExamId, classId: targetClassId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[examService.copyExamService]', err);
    return { ok: false, status: 500, error: 'Database transaction failed.' };
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

    let filteredExams = exams
    // If a student is requesting the exams, hide any exam which has assignment rows
    // and the student is not included in that assignment list.
    if (studentMemberId && Array.isArray(exams) && exams.length > 0) {
      const out = []
      for (const ex of exams) {
        try {
          const access = await getExamAssignmentAccessQuery(ex.id, studentMemberId)
          if (access.hasAssignments && !access.allowed) {
            // Skip this exam for this student
            continue
          }
        } catch (err) {
          console.error('[examService.getClassExams/assignment-check]', err)
          // On error, be permissive and include the exam
        }
        out.push(ex)
      }
      filteredExams = out
    }

    const withSessions = await attachStudentSessionsToExams(filteredExams, studentMemberId)
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

export async function updateExamPasswordService(classId, examId, teacherMemberId, passwordInput) {
  const raw = String(passwordInput || '').trim();
  if (!raw) {
    return { ok: false, status: 400, error: 'Exam code cannot be empty.' };
  }
  if (raw.length > 20) {
    return { ok: false, status: 400, error: 'Exam code must be 20 characters or fewer.' };
  }
  const password = normalizeExamPassword(raw);
  try {
    const success = await updateExamPasswordByTeacherQuery(classId, examId, teacherMemberId, password);
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found or you do not have permission.' };
    }

    void recordTeacherActivityQuery({
      teacherMemberId: teacherMemberId,
      classId,
      examId,
      eventType: 'exam_code_updated',
      details: 'Updated exam code',
    }).catch((err) => {
      console.error('[examService.updateExamPassword] teacher activity log failed:', err)
    })
    return { ok: true, code: password };
  } catch (err) {
    console.error('[examService.updateExamPassword]', err);
    return { ok: false, status: 500, error: 'Failed to update exam code.' };
  }
}

export async function closeExamService(classId, examId) {
  try {
    const exam = await getExamWithQuestionsQuery(classId, examId, false)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

        const teacherMemberId = await getClassOwnerMemberIdQuery(classId)
        if (teacherMemberId) {
          void recordTeacherActivityQuery({
            teacherMemberId,
            classId,
            examId,
            eventType: 'exam_ended',
            details: 'Exam closed',
          }).catch((err) => {
            console.error('[examService.closeExam] teacher activity log failed:', err)
          })
        }
    const nextStatus = nextStatusAfterClose(exam.status)
    if (!nextStatus) {
      return { ok: false, status: 400, error: 'Only live or lobby exams can be ended.' }
    }

    const success = await updateExamStatusQuery(classId, examId, nextStatus)
    if (!success) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }
    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      eventType: 'exam_published',
      details: `Status changed to ${nextStatus}`,
    }).catch((err) => {
      console.error('[examService.publishExam] teacher activity log failed:', err)
    })

    const { top } = await finalizeExamResultsService(examId)
    if (top?.teacherMemberId) {
      void recordTeacherActivityQuery({
        teacherMemberId: top.teacherMemberId,
        classId,
        examId,
        eventType: 'exam_ended',
        details: `Top performer: ${top.studentName || 'student'}`,
      }).catch((err) => {
        console.error('[examService.closeExam] teacher activity log failed:', err)
      })
    }
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
    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      eventType: 'exam_deleted',
      details: 'Exam deleted',
    }).catch((err) => {
      console.error('[examService.deleteExam] teacher activity log failed:', err)
    })
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
