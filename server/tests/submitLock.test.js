import assert from 'node:assert/strict'
import test from 'node:test'
import { getPool } from '../db.js'
import {
  createExamSessionQuery,
  findExamSessionQuery,
  lockExamSessionQuery,
  markSessionSubmittedQuery,
  upsertStudentAnswerQuery,
} from '../repositories/examSessionRepository.js'

const db = getPool()

async function examEnrollmentFixture() {
  const { rows } = await db.query(
    `SELECT e.exam_id, ce.member_id
     FROM exams e
     JOIN classes c ON c.class_id = e.class_id
     JOIN class_enrollments ce ON ce.class_id = c.class_id
     LIMIT 1`,
  )
  return rows[0] || null
}

async function resetSessionForTest(examId, memberId) {
  let session = await findExamSessionQuery(examId, memberId)
  if (!session) {
    session = await createExamSessionQuery(examId, memberId)
  }
  await db.query(
    `UPDATE exam_sessions
     SET status = 'in_progress',
         submitted_at = NULL,
         auto_submitted = FALSE,
         locked_at = NULL,
         lock_reason = NULL
     WHERE session_id = $1`,
    [session.session_id],
  )
  return session
}

test('upsertStudentAnswer rejects submitted session', { skip: !db }, async () => {
  const row = await examEnrollmentFixture()
  if (!row) return

  const session = await resetSessionForTest(row.exam_id, row.member_id)
  await markSessionSubmittedQuery(session.session_id, false)

  await assert.rejects(
    () =>
      upsertStudentAnswerQuery(session.session_id, 1, {
        choiceId: null,
        answerText: 'TEST',
      }),
    (err) => err?.code === 'SESSION_CLOSED',
  )
})

test('upsertStudentAnswer rejects locked session', { skip: !db }, async () => {
  const row = await examEnrollmentFixture()
  if (!row) return

  const session = await resetSessionForTest(row.exam_id, row.member_id)
  await lockExamSessionQuery(session.session_id, 'time_up')

  await assert.rejects(
    () =>
      upsertStudentAnswerQuery(session.session_id, 1, {
        choiceId: null,
        answerText: 'TEST',
      }),
    (err) => err?.code === 'SESSION_LOCKED',
  )
})
