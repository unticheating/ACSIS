/** Canonical display labels for question types (API, DB, and legacy form values). */

/** Builder form values — one type per question set. */
export const BUILDER_QUESTION_FORM_TYPES = [
  { value: 'multiple', label: 'Multiple Choice' },
  { value: 'identification', label: 'Identification' },
  { value: 'truefalse', label: 'True / False' },
  { value: 'coding', label: 'Coding' },
  { value: 'matching', label: 'Matching' },
  { value: 'essay', label: 'Essay / Paragraph' },
  { value: 'diagramming', label: 'Diagramming' },
]

/**
 * @param {string | null | undefined} type
 * @returns {'multiple' | 'identification' | 'truefalse' | 'coding' | 'matching' | 'essay' | 'diagramming'}
 */
export function formTypeFromQuestionType(type) {
  if (type === 'multiple-choice' || type === 'multiple' || type === 'mcq') return 'multiple'
  if (type === 'truefalse' || type === 'true_false') return 'truefalse'
  if (type === 'coding') return 'coding'
  if (type === 'matching') return 'matching'
  if (type === 'essay') return 'essay'
  if (type === 'diagramming') return 'diagramming'
  return 'identification'
}

/**
 * @param {string} formType
 * @returns {string}
 */
export function apiTypeFromFormType(formType) {
  return formType === 'multiple' ? 'multiple-choice' : formType
}

/**
 * @param {string} formType
 * @param {number} [index]
 * @returns {string}
 */
export function defaultSectionTitleForFormType(formType, index = 1) {
  const hit = BUILDER_QUESTION_FORM_TYPES.find((t) => t.value === formType)
  return hit?.label || `Set ${index}`
}

/**
 * Derive set titles from question types. Duplicate types get a numeric suffix.
 * @param {Array<{ id?: string, questionType?: string, title?: string }>} sections
 */
export function syncSectionTitles(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return sections

  const typeIndexes = {}
  return sections.map((sec) => {
    const formType = sec.questionType || 'multiple'
    const baseLabel = labelForFormType(formType)
    const totalOfType = sections.filter((s) => (s.questionType || 'multiple') === formType).length

    if (totalOfType === 1) {
      return { ...sec, title: baseLabel }
    }

    typeIndexes[formType] = (typeIndexes[formType] || 0) + 1
    const n = typeIndexes[formType]
    return { ...sec, title: n === 1 ? baseLabel : `${baseLabel} (${n})` }
  })
}

/**
 * @param {string | null | undefined} formType
 * @returns {string}
 */
export function labelForFormType(formType) {
  const hit = BUILDER_QUESTION_FORM_TYPES.find((t) => t.value === formType)
  return hit?.label || labelForQuestionType(formType)
}

/**
 * @param {string | null | undefined} questionApiType
 * @param {string | null | undefined} sectionFormType
 */
export function questionMatchesSectionType(questionApiType, sectionFormType) {
  if (!sectionFormType) return true
  return formTypeFromQuestionType(questionApiType) === sectionFormType
}

const QUESTION_TYPE_LABELS = {
  'multiple-choice': 'Multiple choice',
  multiple: 'Multiple choice',
  multiple_choice: 'Multiple choice',
  mcq: 'Multiple choice',
  identification: 'Identification',
  truefalse: 'True / False',
  true_false: 'True / False',
  coding: 'Coding',
  matching: 'Matching',
  essay: 'Essay / Paragraph',
  diagramming: 'Diagramming',
}

const QUESTION_TYPE_SORT = {
  'Multiple choice': 0,
  Identification: 1,
  'True / False': 2,
  Coding: 3,
  Matching: 4,
  'Essay / Paragraph': 5,
  Diagramming: 6,
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

/** Identification answers are stored/compared in uppercase — normalize for display and teacher entry. */
export function normalizeIdentificationAnswer(text) {
  if (text == null || text === '') return ''
  return String(text).trim().toUpperCase()
}

/**
 * Comma-separated acceptable identification answers (deduped, uppercase).
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function parseIdentificationAnswersList(text) {
  if (text == null || text === '') return []
  const seen = new Set()
  const out = []
  for (const part of String(text).split(',')) {
    const norm = normalizeIdentificationAnswer(part)
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
  }
  return out
}

/**
 * @param {string[] | null | undefined} answers
 * @returns {string}
 */
export function joinIdentificationAnswersList(answers) {
  if (!Array.isArray(answers) || answers.length === 0) return ''
  return answers.map((a) => normalizeIdentificationAnswer(a)).filter(Boolean).join(', ')
}

/**
 * @param {{
 *   type?: string,
 *   correctAnswer?: string | null,
 *   acceptableAnswers?: string[] | null,
 *   presentationAnswer?: string | null,
 * }} q
 */
export function identificationDisplayFromQuestion(q) {
  const acceptable =
    Array.isArray(q?.acceptableAnswers) && q.acceptableAnswers.length
      ? q.acceptableAnswers.map((a) => normalizeIdentificationAnswer(a)).filter(Boolean)
      : parseIdentificationAnswersList(q?.correctAnswer)
  const presentation =
    normalizeIdentificationAnswer(q?.presentationAnswer) || acceptable[0] || ''
  return { acceptable, presentation }
}

/**
 * @param {string | null | undefined} questionType
 * @param {string | null | undefined} text
 */
export function formatReviewAnswerText(questionType, text) {
  if (text == null || text === '' || text === '—') return '—'
  const t = String(text)
  if (String(questionType || '').toLowerCase() === 'identification') {
    return normalizeIdentificationAnswer(t)
  }
  if (String(questionType || '').toLowerCase() === 'matching') {
    // Try the delimiter-separated format used by DB choice_text: "Left\x1eRight"
    const PAIR_DELIMITER = '\x1e'
    if (t.includes(PAIR_DELIMITER)) {
      const idx = t.indexOf(PAIR_DELIMITER)
      const left = t.slice(0, idx).trim()
      const right = t.slice(idx + 1).trim()
      if (left && right) return `${left} → ${right}`
    }
    // Try JSON format used by student answer_text: {"Left":"Right",...}
    try {
      const parsed = JSON.parse(t)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed)
          .map(([k, v]) => `${k} → ${v}`)
          .join('\n')
      }
    } catch {
      // not JSON, fall through
    }
  }
  return t
}
