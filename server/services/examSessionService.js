import { getPool } from '../db.js'
import { normalizeExamPassword } from '../lib/examCodes.js'
import { EXAM_STATUS, nextStatusAfterRestart, nextStatusAfterStart } from '../lib/examStatus.js'
import {
  createExamSessionQuery,
  findChoiceIdByTextQuery,
  findExamSessionQuery,
  getExamForJoinQuery,
  getSessionForStudentQuery,
  gradeSessionAnswersQuery,
  incrementSessionWarningQuery,
  insertCheatingLogQuery,
  isValidCheatEvent,
  isSessionScoreReleasedQuery,
  markSessionSubmittedQuery,
  updateExamStatusByIdQuery,
  deleteExamSessionsQuery,
  upsertStudentAnswerQuery,
} from '../repositories/examSessionRepository.js'

/** Students only receive numeric scores after faculty releases them. */
async function buildStudentSubmitPayload(sessionId, scores) {
  const scoreReleased = await isSessionScoreReleasedQuery(sessionId)
  const base = { sessionId, scoreReleased }
  if (!scoreReleased) {
    return { ...base, scorePending: true }
  }
  return {
    ...base,
    rawScore: scores.rawScore,
    totalPoints: scores.totalPoints,
    percentage: percentageFromScores(scores),
  }
}
import { getExamWithQuestionsQuery } from '../repositories/examRepository.js'
import { applyLayoutToExamQuestions } from '../lib/examShuffle.js'
import { getSessionShuffleLayoutQuery } from '../repositories/examSessionRepository.js'
import { closeOtherTeacherOngoingExamsQuery } from '../repositories/examResultsRepository.js'
import { checkEnrollment } from '../repositories/studentRepository.js'
import { getInstitutionMaxWarnings } from '../repositories/adminRepository.js'
import { percentageFromScores, shouldAutoSubmitExam } from '../lib/examSessionRules.js'
import { notifyMonitoringUpdate } from '../lib/monitoringBroadcast.js'

function mapExamMeta(row) {
  const status = (row.status || '').toLowerCase()
  return {
    id: row.exam_id,
    title: row.title,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    status: row.status,
    code: row.password,
    openedAt: status === EXAM_STATUS.OPEN && row.updated_at ? row.updated_at : null,
  }
}

export async function joinExamService(classId, examId, studentMemberId, passwordInput) {
  const enrolled = await checkEnrollment(studentMemberId, classId)
  if (!enrolled) {
    return { ok: false, status: 403, error: 'NOT_ENROLLED' }
  }

  const exam = await getExamForJoinQuery(classId, examId)
  if (!exam) {
    return { ok: false, status: 404, error: 'Exam not found.' }
  }

  const status = (exam.status || '').toLowerCase()
  if (status === EXAM_STATUS.DRAFT) {
    return { ok: false, status: 403, error: 'This exam is not published yet.' }
  }
  if (status === EXAM_STATUS.CLOSED) {
    return { ok: false, status: 403, error: 'This exam has ended.' }
  }
  if (status === EXAM_STATUS.WAITING && exam.scheduled_start) {
    const opensAt = new Date(exam.scheduled_start).getTime()
    if (Number.isFinite(opensAt) && Date.now() < opensAt) {
      return {
        ok: false,
        status: 403,
        error: `The exam lobby opens at ${new Date(exam.scheduled_start).toLocaleString()}.`,
      }
    }
  }

  const expected = normalizeExamPassword(exam.password)
  const given = normalizeExamPassword(passwordInput)
  if (!expected) {
    return { ok: false, status: 400, error: 'This exam has no code set. Ask your instructor to republish it.' }
  }
  if (!given || given !== expected) {
    return { ok: false, status: 401, error: 'Incorrect exam code.' }
  }

  let session = await findExamSessionQuery(examId, studentMemberId)
  if (status === EXAM_STATUS.OPEN && !session) {
    return {
      ok: false,
      status: 403,
      error: 'The exam has already started. Late join is not allowed.',
    }
  }
  if (session?.status === 'submitted') {
    return { ok: false, status: 400, error: 'You already submitted this exam.' }
  }
  if (!session) {
    session = await createExamSessionQuery(examId, studentMemberId)
  }

  return {
    ok: true,
    sessionId: session.session_id,
    sessionStatus: session.status,
    exam: mapExamMeta(exam),
  }
}

export async function getStudentExamSessionService(classId, examId, studentMemberId) {
  const enrolled = await checkEnrollment(studentMemberId, classId)
  if (!enrolled) {
    return { ok: false, status: 403, error: 'NOT_ENROLLED' }
  }

  const examRow = await getExamForJoinQuery(classId, examId)
  if (!examRow) {
    return { ok: false, status: 404, error: 'Exam not found.' }
  }

  const status = (examRow.status || '').toLowerCase()
  if (status === EXAM_STATUS.DRAFT) {
    return { ok: false, status: 403, error: 'This exam is not published yet.' }
  }

  const session = await findExamSessionQuery(examId, studentMemberId)
  if (status === EXAM_STATUS.OPEN && !session) {
    return {
      ok: false,
      status: 403,
      error: 'The exam has already started. Late join is not allowed.',
    }
  }

  const examMeta = mapExamMeta(examRow)
  const payload = {
    joined: Boolean(session),
    sessionId: session?.session_id ?? null,
    sessionStatus: session?.status ?? null,
    warningCount: session?.warning_count ?? 0,
    exam: examMeta,
    questions: [],
    result: null,
  }

  if (session?.status === 'submitted') {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT raw_score, total_points, percentage, score_released
       FROM exam_results WHERE session_id = $1`,
      [session.session_id],
    )
    if (rows[0]?.score_released) {
      payload.result = {
        scoreReleased: true,
        rawScore: Number(rows[0].raw_score),
        totalPoints: Number(rows[0].total_points),
        percentage: Number(rows[0].percentage),
      }
    } else if (rows[0]) {
      payload.scorePending = true
    }
    return { ok: true, ...payload }
  }

  if (status === EXAM_STATUS.OPEN && session) {
    const full = await getExamWithQuestionsQuery(classId, examId, false)
    if (full?.questions) {
      const layout = await getSessionShuffleLayoutQuery(session.session_id)
      payload.questions = applyLayoutToExamQuestions(full.questions, layout, { forStudent: true })
      const { questions, correctAnswer, _choicesMeta, ...examPublic } = full
      payload.exam = { ...examMeta, ...examPublic, code: examMeta.code }
    }
  }

  return { ok: true, ...payload }
}

export async function startExamService(classId, examId, teacherMemberId = null, opts = {}) {
  const { newScheduledEnd } = opts
  const exam = await getExamForJoinQuery(classId, examId)
  if (!exam) {
    return { ok: false, status: 404, error: 'Exam not found.' }
  }

  const next = nextStatusAfterStart(exam.status)
  if (!next) {
    return { ok: false, status: 400, error: 'Only exams in the lobby or closed can be started.' }
  }

  if (teacherMemberId) {
    await closeOtherTeacherOngoingExamsQuery(teacherMemberId, classId, examId)
  }

  const updated = await updateExamStatusByIdQuery(classId, examId, next, newScheduledEnd)
  if (!updated) {
    return { ok: false, status: 500, error: 'Failed to start exam.' }
  }

  return { ok: true, status: next }
}

export async function restartExamService(classId, examId, teacherMemberId = null, opts = {}) {
  const { newScheduledEnd, newScheduledStart } = opts
  const exam = await getExamForJoinQuery(classId, examId)
  if (!exam) {
    return { ok: false, status: 404, error: 'Exam not found.' }
  }

  const next = nextStatusAfterRestart(exam.status)
  if (!next) {
    return {
      ok: false,
      status: 400,
      error: 'Only live or ended exams can be restarted. Use Start exam while the exam is in the lobby.',
    }
  }

  if (teacherMemberId) {
    await closeOtherTeacherOngoingExamsQuery(teacherMemberId, classId, examId)
  }

  const schedulePatch = {}
  if (newScheduledStart !== undefined) {
    schedulePatch.scheduledStart = newScheduledStart ? new Date(newScheduledStart) : null
  }
  if (newScheduledEnd !== undefined) {
    schedulePatch.scheduledEnd = newScheduledEnd ? new Date(newScheduledEnd) : null
  }

  const updated = await updateExamStatusByIdQuery(classId, examId, next, schedulePatch)
  if (!updated) {
    return { ok: false, status: 500, error: 'Failed to restart exam.' }
  }

  return { ok: true, status: next }
}

async function requireOpenSession(classId, examId, studentMemberId) {
  const enrolled = await checkEnrollment(studentMemberId, classId)
  if (!enrolled) {
    return { ok: false, status: 403, error: 'NOT_ENROLLED' }
  }

  const exam = await getExamForJoinQuery(classId, examId)
  if (!exam) {
    return { ok: false, status: 404, error: 'Exam not found.' }
  }

  if ((exam.status || '').toLowerCase() !== EXAM_STATUS.OPEN) {
    return { ok: false, status: 403, error: 'Exam is not live yet.' }
  }

  const session = await getSessionForStudentQuery(examId, studentMemberId)
  if (!session) {
    return { ok: false, status: 403, error: 'Join the exam with your exam code first.' }
  }
  if (session.status === 'submitted') {
    return { ok: false, status: 400, error: 'You already submitted this exam.' }
  }

  return { ok: true, exam, session }
}

export async function logCheatingEventService(classId, examId, studentMemberId, eventType, details) {
  if (!isValidCheatEvent(eventType)) {
    return { ok: false, status: 400, error: 'Invalid event type.' }
  }

  const gate = await requireOpenSession(classId, examId, studentMemberId)
  if (!gate.ok) return gate

  await insertCheatingLogQuery(gate.session.session_id, eventType, details || null)
  const warningCount = await incrementSessionWarningQuery(gate.session.session_id)
  const maxWarnings = await getInstitutionMaxWarnings(gate.exam.institution_id)

  let autoSubmitted = false
  let scores = { rawScore: 0, totalPoints: 0 }
  if (shouldAutoSubmitExam(warningCount, maxWarnings)) {
    await markSessionSubmittedQuery(gate.session.session_id, true)
    try {
      scores = await gradeSessionAnswersQuery(gate.session.session_id)
    } catch (err) {
      console.error('[examSessionService.logCheating] auto-submit grade failed:', err)
    }
    autoSubmitted = true
    notifyMonitoringUpdate(classId, examId)
  } else {
    notifyMonitoringUpdate(classId, examId)
  }

  const payload = {
    ok: true,
    warningCount,
    maxWarnings,
    autoSubmitted,
    ...(await buildStudentSubmitPayload(gate.session.session_id, scores)),
  }
  return payload
}

export async function submitExamService(classId, examId, studentMemberId, answersPayload) {
  const gate = await requireOpenSession(classId, examId, studentMemberId)
  if (!gate.ok) return gate

  const answers = Array.isArray(answersPayload) ? answersPayload : []
  for (const row of answers) {
    const questionId = Number(row?.questionId)
    if (!Number.isFinite(questionId)) continue

    let choiceId = row.choiceId != null ? Number(row.choiceId) : null
    const answerText = row.answerText != null ? String(row.answerText) : null

    if (!choiceId && answerText) {
      choiceId = await findChoiceIdByTextQuery(questionId, answerText)
    }

    try {
      await upsertStudentAnswerQuery(gate.session.session_id, questionId, { choiceId, answerText })
    } catch (err) {
      if (err?.code === 'SESSION_CLOSED') {
        return { ok: false, status: 400, error: err.message }
      }
      throw err
    }
  }

  await markSessionSubmittedQuery(gate.session.session_id, false)
  let scores = { rawScore: 0, totalPoints: 0 }
  try {
    scores = await gradeSessionAnswersQuery(gate.session.session_id)
  } catch (err) {
    console.error('[examSessionService.submitExam] grading failed:', err)
  }
  notifyMonitoringUpdate(classId, examId)

  return {
    ok: true,
    ...(await buildStudentSubmitPayload(gate.session.session_id, scores)),
  }
}
