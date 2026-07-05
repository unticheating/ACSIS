import {
  formTypeFromQuestionType,
  labelForFormType,
  syncSectionTitles,
} from './questionTypes.js'
import { boilerplateInstructionsForFormType } from './examSectionInstructions.js'

function newSection(index = 1, questionType = 'multiple') {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: labelForFormType(questionType),
    description: boilerplateInstructionsForFormType(questionType),
    questionType,
    questions: [],
  }
}

function mapQuestion(q) {
  return {
    id: String(q.id),
    type: q.type,
    question: q.question,
    points: q.points ?? 1,
    options: q.options || [],
    correctAnswer: q.correctAnswer || '',
    imageUrl: q.imageUrl || null,
    presentationAnswer: q.presentationAnswer ?? null,
    answerExplanation: q.answerExplanation ?? null,
    matchingPairs: q.matchingPairs || [],
    diagramVariant: q.diagramVariant ?? null,
    diagramReference: q.diagramReference ?? null,
  }
}

function inferSectionQuestionType(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return 'multiple'
  return formTypeFromQuestionType(questions[0]?.type)
}

/**
 * Split a section that contains mixed question types into one section per type.
 * @param {object} section
 * @param {number} startIndex
 */
function normalizeSectionQuestionTypes(section, startIndex = 1) {
  const questions = section.questions || []
  if (questions.length === 0) {
    return [
      {
        ...section,
        questionType: section.questionType || 'multiple',
      },
    ]
  }

  const groups = new Map()
  for (const q of questions) {
    const formType = formTypeFromQuestionType(q.type)
    if (!groups.has(formType)) groups.set(formType, [])
    groups.get(formType).push(q)
  }

  if (groups.size <= 1) {
    const questionType = section.questionType || inferSectionQuestionType(questions)
    return [
      {
        ...section,
        questionType,
        title: labelForFormType(questionType),
      },
    ]
  }

  return [...groups.entries()].map(([questionType, groupedQuestions], groupIndex) => ({
    id: groupIndex === 0 ? section.id : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${groupIndex}`,
    title: labelForFormType(questionType),
    description: groupIndex === 0 ? section.description || '' : '',
    questionType,
    questions: groupedQuestions,
  }))
}

/**
 * Map teacher exam API payload into create-exam builder sections.
 * @param {object} exam
 */
export function mapExamToBuilderState(exam) {
  const questions = exam?.questions || []
  const apiSections = exam?.sections || []

  let sections
  if (apiSections.length > 0) {
    sections = apiSections.flatMap((s, idx) =>
      normalizeSectionQuestionTypes(
        {
          id: String(s.id),
          title: s.title || `Set ${idx + 1}`,
          description: s.description || '',
          questions: questions
            .filter((q) => String(q.sectionId) === String(s.id))
            .map(mapQuestion),
        },
        idx + 1,
      ),
    )
  } else if (questions.length > 0) {
    const sec = newSection(1, inferSectionQuestionType(questions.map(mapQuestion)))
    sec.questions = questions.map(mapQuestion)
    sections = normalizeSectionQuestionTypes(sec, 1)
  } else {
    sections = [newSection(1)]
  }

  sections = syncSectionTitles(sections)

  const description =
    exam?.description?.trim() ||
    apiSections.find((s) => s.description?.trim())?.description?.trim() ||
    ''

  return { sections, description }
}

/** Question sets for read-only views (exam detail, previews). */
export function groupExamQuestionsBySet(exam) {
  return mapExamToBuilderState(exam).sections.filter((s) => s.questions.length > 0)
}

export function shouldShowQuestionSetHeader(sections, sec) {
  if (sections.length > 1) return true
  return Boolean(sec.description?.trim())
}

export { newSection }
