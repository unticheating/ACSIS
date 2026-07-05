/**
 * Max scorable points for one question (mirrors server exam_results total_points logic).
 * Matching items award points per pair: question.points × pair count.
 * @param {{ type?: string, points?: number, matchingPairs?: { left?: string, right?: string }[] } | null | undefined} question
 * @returns {number}
 */
export function maxPointsForQuestion(question) {
  if (!question) return 0
  const points = Number(question.points ?? 1)
  const type = String(question.type || '').toLowerCase()
  if (type === 'matching') {
    const pairCount = Array.isArray(question.matchingPairs) ? question.matchingPairs.length : 0
    return points * pairCount
  }
  return points
}

/**
 * @param {{ type?: string, points?: number, matchingPairs?: unknown[] }[] | null | undefined} questions
 * @returns {number}
 */
export function sumExamTotalPoints(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return 0
  return questions.reduce((total, q) => total + maxPointsForQuestion(q), 0)
}
