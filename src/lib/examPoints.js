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

/** Max points for a review row from API fields. */
export function maxPointsForReviewAnswer(answer) {
  if (!answer) return 0
  const points = Number(answer.questionPoints ?? 1)
  const type = String(answer.questionType || '').toLowerCase()
  if (type === 'matching') {
    const pairCount = Number(answer.correctPairCount ?? 0)
    return points * (pairCount > 0 ? pairCount : 1)
  }
  return points
}

export function earnedPointsForReviewAnswer(answer) {
  if (!answer) return 0
  if (answer.pointsAwarded != null && Number.isFinite(Number(answer.pointsAwarded))) {
    return Number(answer.pointsAwarded)
  }
  if (answer.isCorrect === true) {
    return maxPointsForReviewAnswer(answer)
  }
  return 0
}
