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
  lockExamSessionQuery,
  listStudentAnswersForSessionQuery,
  markSessionSubmittedQuery,
  updateExamStatusByIdQuery,
  deleteExamSessionsQuery,
  unlockExamSessionsQuery,
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
import { percentageFromScores, shouldLockExam } from '../lib/examSessionRules.js'
import { notifyMonitoringUpdate } from '../lib/monitoringBroadcast.js'
import { getExamAssignmentAccessQuery } from '../repositories/examAssignmentRepository.js'
import { recordTeacherActivityQuery } from '../repositories/teacherActivityRepository.js'
import { getClassOwnerMemberIdQuery } from '../repositories/classRepository.js'

function mapSavedAnswers(rows) {
  const out = {}
  for (const row of rows) {
    const qid = Number(row.question_id)
    const text = row.choice_text ?? row.answer_text
    if (text != null && String(text).length > 0) {
      out[qid] = String(text)
    }
  }
  return out
}

async function syncSessionLockState(session, examRow, institutionId) {
  if (!session || session.status === 'submitted' || session.locked_at) {
    return session
  }
  const examStatus = (examRow.status || '').toLowerCase()
  if (examStatus !== EXAM_STATUS.OPEN) {
    return session
  }

  const maxWarnings = await getInstitutionMaxWarnings(institutionId)
  if (shouldLockExam(Number(session.warning_count ?? 0), maxWarnings)) {
    const locked = await lockExamSessionQuery(session.session_id, 'max_warnings')
    if (locked) {
      return { ...session, locked_at: locked.locked_at, lock_reason: locked.lock_reason }
    }
  }
  const endMs = examRow.scheduled_end ? new Date(examRow.scheduled_end).getTime() : NaN
  if (Number.isFinite(endMs) && Date.now() >= endMs) {
    const locked = await lockExamSessionQuery(session.session_id, 'time_up')
    if (locked) {
      return { ...session, locked_at: locked.locked_at, lock_reason: locked.lock_reason }
    }
  }
  return session
}

async function ensureStudentCanJoinExam(examId, studentMemberId) {
  const access = await getExamAssignmentAccessQuery(examId, studentMemberId)
  if (!access.allowed) {
    return {
      ok: false,
      status: 403,
      error: 'This exam is assigned to selected students only.',
    }
  }
  return { ok: true, access }
}

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

  const accessGate = await ensureStudentCanJoinExam(examId, studentMemberId)
  if (!accessGate.ok) return accessGate

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

  const accessGate = await ensureStudentCanJoinExam(examId, studentMemberId)
  if (!accessGate.ok) return accessGate

  const examRow = await getExamForJoinQuery(classId, examId)
  if (!examRow) {
    return { ok: false, status: 404, error: 'Exam not found.' }
  }

  const status = (examRow.status || '').toLowerCase()
  if (status === EXAM_STATUS.DRAFT) {
    return { ok: false, status: 403, error: 'This exam is not published yet.' }
  }

  let session = await findExamSessionQuery(examId, studentMemberId)

  const maxWarnings = await getInstitutionMaxWarnings(examRow.institution_id)
  if (session) {
    session = await syncSessionLockState(session, examRow, examRow.institution_id)
  }

  const examMeta = mapExamMeta(examRow)
  const payload = {
    joined: Boolean(session),
    sessionId: session?.session_id ?? null,
    sessionStatus: session?.status ?? null,
    sessionLocked: Boolean(session?.locked_at),
    lockReason: session?.lock_reason ?? null,
    warningCount: session?.warning_count ?? 0,
    maxWarnings,
    savedAnswers: {},
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
    const savedRows = await listStudentAnswersForSessionQuery(session.session_id)
    payload.savedAnswers = mapSavedAnswers(savedRows)
  }

  return { ok: true, ...payload }
}

export async function lockStudentExamSessionService(classId, examId, studentMemberId, reason = 'time_up') {
  const gate = await requireOpenSession(classId, examId, studentMemberId)
  if (!gate.ok) return gate

  const locked = await lockExamSessionQuery(gate.session.session_id, reason)
  if (!locked) {
    return { ok: false, status: 400, error: 'Could not lock exam session.' }
  }

  notifyMonitoringUpdate(classId, examId)
  const maxWarnings = await getInstitutionMaxWarnings(gate.exam.institution_id)

  return {
    ok: true,
    sessionLocked: true,
    lockReason: locked.lock_reason,
    warningCount: Number(gate.session.warning_count ?? 0),
    maxWarnings,
  }
}

export async function saveStudentAnswerService(classId, examId, studentMemberId, body) {
  const gate = await requireOpenSession(classId, examId, studentMemberId)
  if (!gate.ok) return gate

  const questionId = Number(body?.questionId)
  if (!Number.isFinite(questionId)) {
    return { ok: false, status: 400, error: 'questionId is required.' }
  }

  let choiceId = body?.choiceId != null ? Number(body.choiceId) : null
  const answerText = body?.answerText != null ? String(body.answerText) : null

  if (!choiceId && answerText) {
    choiceId = await findChoiceIdByTextQuery(questionId, answerText)
  }

  try {
    await upsertStudentAnswerQuery(gate.session.session_id, questionId, { choiceId, answerText })
  } catch (err) {
    if (err?.code === 'SESSION_CLOSED') {
      return { ok: false, status: 400, error: err.message }
    }
    if (err?.code === 'SESSION_LOCKED') {
      return { ok: false, status: 400, error: err.message }
    }
    throw err
  }

  return { ok: true }
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

  if (teacherMemberId) {
    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      eventType: 'exam_started',
      details: 'Exam moved from lobby to live',
    }).catch((err) => {
      console.error('[examSessionService.startExam] teacher activity log failed:', err)
    })
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

  await unlockExamSessionsQuery(examId)

  if (teacherMemberId) {
    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      eventType: 'exam_restarted',
      details: 'Exam was restarted',
    }).catch((err) => {
      console.error('[examSessionService.restartExam] teacher activity log failed:', err)
    })
  }

  return { ok: true, status: next }
}

async function requireOpenSession(classId, examId, studentMemberId) {
  const enrolled = await checkEnrollment(studentMemberId, classId)
  if (!enrolled) {
    return { ok: false, status: 403, error: 'NOT_ENROLLED' }
  }

  const accessGate = await ensureStudentCanJoinExam(examId, studentMemberId)
  if (!accessGate.ok) return accessGate

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

  const maxWarnings = await getInstitutionMaxWarnings(gate.exam.institution_id)
  const priorWarnings = Number(gate.session.warning_count ?? 0)

  await insertCheatingLogQuery(gate.session.session_id, eventType, details || null)

  const teacherMemberId = await getClassOwnerMemberIdQuery(classId)
  if (teacherMemberId) {
    void recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      studentMemberId,
      eventType: 'student_detected',
      details: `${eventType}${details ? ` — ${details}` : ''}`.slice(0, 500),
    }).catch((err) => {
      console.error('[examSessionService.logCheatingEvent] teacher activity log failed:', err)
    })
  }

  let warningCount = priorWarnings
  if (!shouldLockExam(priorWarnings, maxWarnings)) {
    warningCount = await incrementSessionWarningQuery(gate.session.session_id)
  }

  let sessionLocked = Boolean(gate.session.locked_at)
  if (shouldLockExam(warningCount, maxWarnings)) {
    const locked = await lockExamSessionQuery(gate.session.session_id, 'max_warnings')
    sessionLocked = Boolean(locked?.locked_at ?? true)
  }
  notifyMonitoringUpdate(classId, examId)

  return {
    ok: true,
    warningCount,
    maxWarnings,
    sessionLocked,
    autoSubmitted: false,
  }
}

export async function submitExamService(classId, examId, studentMemberId, answersPayload) {
  const gate = await requireOpenSession(classId, examId, studentMemberId)
  if (!gate.ok) return gate

  if (!gate.session.locked_at) {
    const synced = await syncSessionLockState(gate.session, gate.exam, gate.exam.institution_id)
    gate.session = synced
  }

  const answers = Array.isArray(answersPayload) ? answersPayload : []
  if (!gate.session.locked_at) {
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
        if (err?.code === 'SESSION_LOCKED') {
          return { ok: false, status: 400, error: err.message }
        }
        throw err
      }
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
