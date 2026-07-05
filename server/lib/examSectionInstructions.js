function normalizeQuestionType(type) {
  const raw = String(type || '').toLowerCase()
  if (raw === 'multiple-choice' || raw === 'multiple' || raw === 'mcq') return 'multiple-choice'
  if (raw === 'truefalse' || raw === 'true_false') return 'truefalse'
  return raw || 'identification'
}

/** Default in-paper directions when a set has no custom instructions. */
export const EXAM_SECTION_BOILERPLATE = {
  'multiple-choice':
    'Choose the letter of the best answer. Write your answer clearly on the answer sheet.',
  identification: 'Write the correct answer in the blank before each number.',
  truefalse:
    'Write T if the statement is true and F if it is false in the blank before each number.',
  matching:
    'Match each item in Column A with the correct letter in Column B. Write your answer in the blank before each number in Column A.',
  essay: 'Answer each question in complete sentences on the lines provided.',
  coding: 'Write your program in the box provided.',
  diagramming: 'Draw your diagram in the space provided.',
}

/**
 * @param {string | null | undefined} questionType
 * @returns {string}
 */
export function boilerplateInstructionsForQuestionType(questionType) {
  const key = normalizeQuestionType(questionType)
  return EXAM_SECTION_BOILERPLATE[key] || ''
}

/**
 * @param {{ description?: string | null, questions?: Array<{ type?: string }> }} section
 * @returns {string}
 */
export function resolvePrintedSectionInstructions(section) {
  const custom = String(section?.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (custom) return custom

  const firstQuestion = section?.questions?.[0]
  return boilerplateInstructionsForQuestionType(firstQuestion?.type)
}
