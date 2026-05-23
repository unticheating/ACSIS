import { getExamWithQuestionsQuery } from '../repositories/examRepository.js'
import { getTeacherClassByIdQuery } from '../repositories/classRepository.js'
import {
  computeExamRanksQuery,
  getTopRankedSessionQuery,
  listSessionsForScoreEmailQuery,
  markResultEmailSentQuery,
  releaseExamScoresQuery,
} from '../repositories/examResultsRepository.js'
import { sendExamResultEmail } from '../lib/sendEmail.js'

export async function finalizeExamResultsService(examId) {
  await computeExamRanksQuery(examId)
  const top = await getTopRankedSessionQuery(examId)
  return { top }
}

export async function releaseExamScoresService(classId, examId, teacherMemberId, { sendEmail = true, includeAnswerKey = false } = {}) {
  try {
    const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
    if (!cls) {
      return { ok: false, status: 403, error: 'Access denied.' }
    }

    const exam = await getExamWithQuestionsQuery(classId, examId, false)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    await computeExamRanksQuery(examId)
    await releaseExamScoresQuery(examId)

    let emailsSent = 0
    let emailsSkipped = 0

    if (sendEmail) {
      const sessions = await listSessionsForScoreEmailQuery(examId)
      for (const row of sessions) {
        if (!row.email) {
          emailsSkipped += 1
          continue
        }
        const result = await sendExamResultEmail({
          to: row.email,
          studentName: row.studentName,
          examTitle: row.examTitle,
          rawScore: row.rawScore,
          totalPoints: row.totalPoints,
          percentage: row.percentage,
          answerKey: includeAnswerKey ? exam.questions : null,
        })
        if (result.sent) {
          await markResultEmailSentQuery(row.sessionId)
          emailsSent += 1
        } else {
          emailsSkipped += 1
        }
      }
    }

    const top = await getTopRankedSessionQuery(examId)
    return { ok: true, emailsSent, emailsSkipped, topStudent: top }
  } catch (err) {
    console.error('[examReleaseService.releaseExamScores]', err)
    return { ok: false, status: 500, error: 'Failed to release scores.' }
  }
}
