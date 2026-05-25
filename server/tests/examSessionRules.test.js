import assert from 'node:assert/strict'
import test from 'node:test'
import { percentageFromScores, shouldLockExam, shouldAutoSubmitExam } from '../lib/examSessionRules.js'

test('percentageFromScores', () => {
  assert.equal(percentageFromScores({ rawScore: 8, totalPoints: 10 }), 80)
  assert.equal(percentageFromScores({ rawScore: 0, totalPoints: 0 }), 0)
})

test('shouldLockExam uses institution limit', () => {
  assert.equal(shouldLockExam(2, 3), false)
  assert.equal(shouldLockExam(3, 3), true)
  assert.equal(shouldLockExam(4, 5), false)
  assert.equal(shouldLockExam(5, 5), true)
  assert.equal(shouldLockExam(3, 0), true)
  assert.equal(shouldAutoSubmitExam(3, 3), true)
})
