import assert from 'node:assert/strict'
import test from 'node:test'
import { buildShuffleLayout } from '../lib/examShuffle.js'

test('buildShuffleLayout shuffles within sections only', () => {
  const questionRows = [
    { question_id: 1, section_id: 10 },
    { question_id: 2, section_id: 10 },
    { question_id: 3, section_id: 20 },
    { question_id: 4, section_id: 20 },
    { question_id: 5, section_id: 20 },
  ]
  const choicesByQuestion = new Map()

  const { questionOrder } = buildShuffleLayout(questionRows, choicesByQuestion, {
    shuffleQuestions: true,
    shuffleChoices: false,
  })

  assert.equal(questionOrder.length, 5)
  assert.deepEqual([...questionOrder].sort((a, b) => a - b), [1, 2, 3, 4, 5])

  const firstSection = questionOrder.slice(0, 2).sort((a, b) => a - b)
  const secondSection = questionOrder.slice(2).sort((a, b) => a - b)
  assert.deepEqual(firstSection, [1, 2])
  assert.deepEqual(secondSection, [3, 4, 5])
})
