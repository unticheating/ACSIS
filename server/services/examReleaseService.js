import { getExamWithQuestionsQuery } from '../repositories/examRepository.js'
import { getTeacherClassByIdQuery } from '../repositories/classRepository.js'
import {
  computeExamRanksQuery,
  getMemberDisplayNameQuery,
  getTopRankedSessionQuery,
  listSessionsForScoreEmailQuery,
  markResultEmailSentQuery,
  releaseExamScoresQuery,
  validateExamSessionIdsQuery,
} from '../repositories/examResultsRepository.js'
import { sendExamResultEmail } from '../lib/sendEmail.js'
import { recordTeacherActivityQuery } from '../repositories/teacherActivityRepository.js'

export async function finalizeExamResultsService(examId) {
  await computeExamRanksQuery(examId)
  const top = await getTopRankedSessionQuery(examId)
  return { top }
}

export async function releaseExamScoresService(
  classId,
  examId,
  teacherMemberId,
  { sendEmail = true, includeAnswerKey = false, sessionIds = null } = {},
) {
  try {
    const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
    if (!cls) {
      return { ok: false, status: 403, error: 'Access denied.' }
    }

    const exam = await getExamWithQuestionsQuery(classId, examId, false)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    let releaseIds = null
    if (Array.isArray(sessionIds) && sessionIds.length > 0) {
      const requested = sessionIds.map(Number).filter(Number.isFinite)
      if (!requested.length) {
        return { ok: false, status: 400, error: 'Select at least one student to release.' }
      }
      const valid = await validateExamSessionIdsQuery(examId, requested)
      if (valid.length !== requested.length) {
        return { ok: false, status: 400, error: 'One or more selected students are invalid for this exam.' }
      }
      releaseIds = valid
    }

    await computeExamRanksQuery(examId)
    await releaseExamScoresQuery(examId, releaseIds)

    let emailsSent = 0
    let emailsSkipped = 0

    const teacherInfo = await getMemberDisplayNameQuery(teacherMemberId)

    if (sendEmail) {
      const sessions = await listSessionsForScoreEmailQuery(examId, releaseIds)
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
          teacherName: teacherInfo.name,
          teacherAvatarUrl: teacherInfo.avatarUrl,
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

    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      eventType: 'scores_released',
      details: releaseIds?.length ? `Released ${releaseIds.length} score(s)` : 'Released all scores',
    }).catch((err) => {
      console.error('[examReleaseService.releaseExamScores] teacher activity log failed:', err)
    })

    return {
      ok: true,
      emailsSent,
      emailsSkipped,
      topStudent: top,
      releasedCount: releaseIds?.length ?? null,
    }
  } catch (err) {
    console.error('[examReleaseService.releaseExamScores]', err)
    return { ok: false, status: 500, error: 'Failed to release scores.' }
  }
}
