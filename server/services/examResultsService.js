import { getClassByIdQuery } from '../repositories/classRepository.js'
import {
  getExamSubmissionStatsQuery,
  listCheatingLogsForExamQuery,
  listCheatingLogsForSessionQuery,
  listExamSessionsForExamQuery,
  listExamsForTeacherReportsQuery,
  listStudentAnswersForSessionQuery,
  listStudentPerformanceQuery,
} from '../repositories/examResultsRepository.js'
import { getExamForJoinQuery } from '../repositories/examSessionRepository.js'

export async function getTeacherExamResultsService(classId, examId, teacherMemberId) {
  try {
    const cls = await getClassByIdQuery(classId)
    if (!cls) {
      return { ok: false, status: 404, error: 'Class not found.' }
    }

    const exam = await getExamForJoinQuery(classId, examId)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    const [sessions, stats, violations] = await Promise.all([
      listExamSessionsForExamQuery(classId, examId),
      getExamSubmissionStatsQuery(examId),
      listCheatingLogsForExamQuery(examId),
    ])

    return {
      ok: true,
      exam: {
        id: exam.exam_id,
        title: exam.title,
        status: exam.status,
        code: exam.password,
      },
      stats: {
        enrolled: Number(stats.enrolled || 0),
        joined: Number(stats.joined || 0),
        submitted: Number(stats.submitted || 0),
      },
      sessions,
      violations: violations.map((v) => ({
        id: v.id,
        sessionId: v.sessionId,
        eventType: v.eventType,
        details: v.details,
        occurredAt: v.occurredAt,
        studentName: v.studentName,
        schoolId: v.schoolId,
      })),
    }
  } catch (err) {
    console.error('[examResultsService.getTeacherExamResults]', err)
    return { ok: false, status: 500, error: 'Failed to load exam results.' }
  }
}

export async function getTeacherExamSessionDetailService(classId, examId, sessionId) {
  try {
    const sessions = await listExamSessionsForExamQuery(classId, examId)
    const session = sessions.find((s) => s.sessionId === Number(sessionId))
    if (!session) {
      return { ok: false, status: 404, error: 'Session not found.' }
    }
    const [answers, violations] = await Promise.all([
      listStudentAnswersForSessionQuery(sessionId),
      listCheatingLogsForSessionQuery(sessionId),
    ])
    return { ok: true, session, answers, violations }
  } catch (err) {
    console.error('[examResultsService.getTeacherExamSessionDetail]', err)
    return { ok: false, status: 500, error: 'Failed to load session detail.' }
  }
}

export async function listTeacherReportExamsService(teacherMemberId) {
  try {
    const exams = await listExamsForTeacherReportsQuery(teacherMemberId)
    return { ok: true, exams }
  } catch (err) {
    console.error('[examResultsService.listTeacherReportExams]', err)
    return { ok: false, status: 500, error: 'Failed to load exams.' }
  }
}

export async function getStudentPerformanceService(studentMemberId) {
  try {
    const rows = await listStudentPerformanceQuery(studentMemberId)
    const submitted = rows.filter((r) => r.status === 'submitted')
    const withScores = submitted.filter((r) => r.percentage != null)
    const average =
      withScores.length > 0
        ? Math.round(
            (withScores.reduce((sum, r) => sum + Number(r.percentage), 0) / withScores.length) * 100,
          ) / 100
        : null

    return {
      ok: true,
      averagePercentage: average,
      examsCompleted: submitted.length,
      totalWarnings: rows.reduce((sum, r) => sum + Number(r.warningCount || 0), 0),
      attempts: rows.map((r) => ({
        sessionId: r.sessionId,
        examId: r.examId,
        examTitle: r.examTitle,
        classId: r.classId,
        className: r.className,
        status: r.status,
        submittedAt: r.submittedAt,
        rawScore: r.rawScore != null ? Number(r.rawScore) : null,
        totalPoints: r.totalPoints != null ? Number(r.totalPoints) : null,
        percentage: r.percentage != null ? Number(r.percentage) : null,
        warningCount: Number(r.warningCount || 0),
      })),
    }
  } catch (err) {
    console.error('[examResultsService.getStudentPerformance]', err)
    return { ok: false, status: 500, error: 'Failed to load performance.' }
  }
}
