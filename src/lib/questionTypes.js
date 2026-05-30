/** Canonical display labels for question types (API, DB, and legacy form values). */

const QUESTION_TYPE_LABELS = {
  'multiple-choice': 'Multiple choice',
  multiple: 'Multiple choice',
  multiple_choice: 'Multiple choice',
  mcq: 'Multiple choice',
  identification: 'Identification',
  truefalse: 'True / False',
  true_false: 'True / False',
  coding: 'Coding',
}

const QUESTION_TYPE_SORT = {
  'Multiple choice': 0,
  Identification: 1,
  'True / False': 2,
  Coding: 3,
}

/**
 * @param {string | null | undefined} type
 * @returns {string}
 */
export function labelForQuestionType(type) {
  if (!type) return 'Question'
  const key = String(type).trim()
  return QUESTION_TYPE_LABELS[key] || QUESTION_TYPE_LABELS[key.toLowerCase()] || key
}

/**
 * @param {{ type?: string }[] | null | undefined} questions
 * @returns {string[]}
 */
export function uniqueQuestionTypeLabels(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return []
  const labels = [
    ...new Set(questions.map((q) => labelForQuestionType(q?.type)).filter(Boolean)),
  ]
  labels.sort((a, b) => (QUESTION_TYPE_SORT[a] ?? 99) - (QUESTION_TYPE_SORT[b] ?? 99))
  return labels
}

/**
 * @param {{ type?: string }[] | null | undefined} questions
 * @returns {string}
 */
export function summarizeQuestionTypes(questions) {
  const labels = uniqueQuestionTypeLabels(questions)
  return labels.length ? labels.join(', ') : '—'
}
