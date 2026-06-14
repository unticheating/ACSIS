/** @typedef {{ left: string, right: string }} MatchingPair */

const PAIR_DELIMITER = '\x1e'

/**
 * @param {MatchingPair[] | null | undefined} pairs
 * @returns {MatchingPair[]}
 */
export function normalizeMatchingPairs(pairs) {
  if (!Array.isArray(pairs)) return []
  const out = []
  for (const pair of pairs) {
    const left = String(pair?.left ?? '').trim()
    const right = String(pair?.right ?? '').trim()
    if (!left || !right) continue
    out.push({ left, right })
  }
  return out
}

/**
 * @param {{ matchingPairs?: MatchingPair[] | null, correctAnswer?: string | null }} q
 * @returns {MatchingPair[]}
 */
export function matchingPairsFromQuestion(q) {
  const fromPairs = normalizeMatchingPairs(q?.matchingPairs)
  if (fromPairs.length) return fromPairs

  if (typeof q?.correctAnswer === 'string' && q.correctAnswer.trim()) {
    try {
      const parsed = JSON.parse(q.correctAnswer)
      return normalizeMatchingPairs(parsed)
    } catch {
      return []
    }
  }
  return []
}

export function serializeMatchingPairs(pairs) {
  return JSON.stringify(normalizeMatchingPairs(pairs))
}

/**
 * @param {string | null | undefined} answerText
 * @returns {Record<string, string>}
 */
export function parseMatchingStudentAnswer(answerText) {
  if (!answerText) return {}
  try {
    const parsed = JSON.parse(answerText)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out = {}
    for (const [k, v] of Object.entries(parsed)) {
      out[String(k)] = String(v ?? '')
    }
    return out
  } catch {
    return {}
  }
}

/**
 * @param {Record<string, string>} map
 * @returns {string}
 */
export function stringifyMatchingStudentAnswer(map) {
  return JSON.stringify(map || {})
}

/** Fisher–Yates shuffle (copy). */
export function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function emptyMatchingPair() {
  return { left: '', right: '' }
}

export { PAIR_DELIMITER }
