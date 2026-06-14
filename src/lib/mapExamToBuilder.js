function newSection(index = 1) {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: `Set ${index}`,
    description: '',
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

/**
 * Map teacher exam API payload into create-exam builder sections.
 * @param {object} exam
 */
export function mapExamToBuilderState(exam) {
  const questions = exam?.questions || []
  const apiSections = exam?.sections || []

  let sections
  if (apiSections.length > 0) {
    sections = apiSections.map((s, idx) => ({
      id: String(s.id),
      title: s.title || `Set ${idx + 1}`,
      description: s.description || '',
      questions: questions
        .filter((q) => String(q.sectionId) === String(s.id))
        .map(mapQuestion),
    }))
  } else if (questions.length > 0) {
    const sec = newSection(1)
    sec.questions = questions.map(mapQuestion)
    sections = [sec]
  } else {
    sections = [newSection(1)]
  }

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

export function shouldShowQuestionSetHeader(sections, sec, secIndex) {
  if (sections.length > 1) return true
  if (sec.description?.trim()) return true
  const defaultTitle = `Set ${secIndex + 1}`
  return Boolean(sec.title?.trim() && sec.title.trim() !== defaultTitle)
}
