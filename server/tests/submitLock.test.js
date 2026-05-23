import assert from 'node:assert/strict'
import test from 'node:test'
import { getPool } from '../db.js'
import {
  createExamSessionQuery,
  markSessionSubmittedQuery,
  upsertStudentAnswerQuery,
} from '../repositories/examSessionRepository.js'

const db = getPool()

test('upsertStudentAnswer rejects submitted session', { skip: !db }, async () => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const examRes = await client.query(
      `SELECT e.exam_id, c.class_id, ce.member_id
       FROM exams e
       JOIN classes c ON c.class_id = e.class_id
       JOIN class_enrollments ce ON ce.class_id = c.class_id
       LIMIT 1`,
    )
    const row = examRes.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return
    }

    const session = await createExamSessionQuery(row.exam_id, row.member_id)
    await markSessionSubmittedQuery(session.session_id, false)

    await assert.rejects(
      () =>
        upsertStudentAnswerQuery(session.session_id, 1, {
          choiceId: null,
          answerText: 'TEST',
        }),
      (err) => err?.code === 'SESSION_CLOSED',
    )
    await client.query('ROLLBACK')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})
