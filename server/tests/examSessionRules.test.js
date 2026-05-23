import assert from 'node:assert/strict'
import test from 'node:test'
import { percentageFromScores, shouldAutoSubmitExam } from '../lib/examSessionRules.js'

test('percentageFromScores', () => {
  assert.equal(percentageFromScores({ rawScore: 8, totalPoints: 10 }), 80)
  assert.equal(percentageFromScores({ rawScore: 0, totalPoints: 0 }), 0)
})

test('shouldAutoSubmitExam uses institution limit', () => {
  assert.equal(shouldAutoSubmitExam(2, 3), false)
  assert.equal(shouldAutoSubmitExam(3, 3), true)
  assert.equal(shouldAutoSubmitExam(4, 5), false)
  assert.equal(shouldAutoSubmitExam(5, 5), true)
  assert.equal(shouldAutoSubmitExam(3, 0), true)
})
