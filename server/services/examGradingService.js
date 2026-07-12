import { gradeSessionAnswersQuery } from '../repositories/examSessionRepository.js'
import {
  getAnswerAuditContextQuery,
  listStudentAnswersForSessionQuery,
  updateManualAnswerGradeQuery,
} from '../repositories/examResultsRepository.js'
import { getTeacherClassByIdQuery } from '../repositories/classRepository.js'
import { getExamForJoinQuery } from '../repositories/examSessionRepository.js'
import { listExamSessionsForExamQuery } from '../repositories/examResultsRepository.js'
import { recordTeacherActivityQuery } from '../repositories/teacherActivityRepository.js'

export async function manualGradeAnswerService(classId, examId, sessionId, answerId, teacherMemberId, payload) {
  const isCorrect = payload?.isCorrect
  const pointsAwarded = payload?.pointsAwarded
  try {
    const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
    if (!cls) {
      return { ok: false, status: 403, error: 'Access denied.' }
    }

    const exam = await getExamForJoinQuery(classId, examId)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    const sessions = await listExamSessionsForExamQuery(classId, examId)
    const session = sessions.find((s) => s.sessionId === Number(sessionId))
    if (!session) {
      return { ok: false, status: 404, error: 'Session not found.' }
    }

    const auditContext = await getAnswerAuditContextQuery(sessionId, answerId)

    const updated = await updateManualAnswerGradeQuery(sessionId, answerId, {
      isCorrect,
      pointsAwarded,
      checkedBy: teacherMemberId,
    })
    if (!updated) {
      return { ok: false, status: 404, error: 'Answer not found.' }
    }

    const verdict = isCorrect ? 'correct' : 'incorrect'
    const studentLabel = auditContext?.studentName || session.studentName || 'student'
    const questionSnippet = String(auditContext?.questionText || 'question').slice(0, 120)
    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      sectionId: auditContext?.sectionId ?? null,
      studentMemberId: auditContext?.studentMemberId ?? session.memberId ?? null,
      eventType: 'answer_corrected',
      details: `Marked ${studentLabel} as ${verdict} on "${questionSnippet}"`,
    }).catch((err) => {
      console.error('[examGradingService.manualGradeAnswer] audit log failed:', err)
    })

    await gradeSessionAnswersQuery(sessionId)
    const answers = await listStudentAnswersForSessionQuery(sessionId)
    const refreshed = await listExamSessionsForExamQuery(classId, examId)
    const updatedSession = refreshed.find((s) => s.sessionId === Number(sessionId))

    return { ok: true, answers, session: updatedSession ?? session }
  } catch (err) {
    console.error('[examGradingService.manualGradeAnswer]', err)
    return { ok: false, status: 500, error: 'Failed to save manual grade.' }
  }
}
