import { formTypeFromQuestionType } from './questionTypes.js'

/** Default student directions for each question-set type in the exam builder / print. */
export const EXAM_SECTION_INSTRUCTIONS = {
  multiple:
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
 * @param {string | null | undefined} formType
 * @returns {string}
 */
export function boilerplateInstructionsForFormType(formType) {
  return EXAM_SECTION_INSTRUCTIONS[formType] || ''
}

/**
 * @param {string | null | undefined} questionApiType
 * @returns {string}
 */
export function boilerplateInstructionsForQuestionType(questionApiType) {
  return boilerplateInstructionsForFormType(formTypeFromQuestionType(questionApiType))
}
