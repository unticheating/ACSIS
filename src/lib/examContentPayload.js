/** @param {unknown} id */
export function isPersistedEntityId(id) {
  if (id == null || id === '') return false
  const n = Number(id)
  return Number.isInteger(n) && n > 0
}

/** @param {unknown} id */
export function persistedEntityIdForApi(id) {
  return isPersistedEntityId(id) ? Number(id) : undefined
}

export function newLocalQuestionId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** @param {object} q */
export function mapQuestionForExamApi(q) {
  const persistedId = persistedEntityIdForApi(q.id)
  return {
    ...(persistedId != null ? { id: persistedId } : {}),
    type: q.type,
    question: q.question,
    points: Number(q.points || 1),
    options: q.options,
    correctAnswer: q.correctAnswer,
    imageUrl: q.imageUrl || null,
    presentationAnswer: q.presentationAnswer ?? null,
    answerExplanation: q.answerExplanation ?? null,
  }
}

/** @param {object} sec */
export function mapSectionForExamApi(sec) {
  const persistedId = persistedEntityIdForApi(sec.id)
  return {
    ...(persistedId != null ? { id: persistedId } : {}),
    title: sec.title.trim() || 'Set',
    description: sec.description.trim(),
    questions: (sec.questions || []).map(mapQuestionForExamApi),
  }
}

/** @param {object[]} sections */
export function buildExamSectionsPayload(sections) {
  return sections.map(mapSectionForExamApi)
}
