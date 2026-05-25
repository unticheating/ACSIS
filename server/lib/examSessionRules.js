/** @param {{ rawScore: number, totalPoints: number }} scores */
export function percentageFromScores(scores) {
  return scores.totalPoints > 0
    ? Math.round((scores.rawScore / scores.totalPoints) * 10000) / 100
    : 0
}

/**
 * @param {number} warningCount
 * @param {number} maxWarnings
 */
export function shouldLockExam(warningCount, maxWarnings) {
  const limit = Number.isFinite(maxWarnings) && maxWarnings > 0 ? maxWarnings : 3
  return Number(warningCount) >= limit
}

/** @deprecated Use shouldLockExam — exams lock for manual submit, not auto-submit. */
export function shouldAutoSubmitExam(warningCount, maxWarnings) {
  return shouldLockExam(warningCount, maxWarnings)
}
