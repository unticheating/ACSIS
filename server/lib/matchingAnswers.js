const PAIR_DELIMITER = '\x1e'

/**
 * @param {{ left?: string, right?: string }[] | null | undefined} pairs
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
 * @param {{ matchingPairs?: { left?: string, right?: string }[] | null, correctAnswer?: string | null }} q
 */
export function resolveMatchingPayload(q) {
  const fromPairs = normalizeMatchingPairs(q?.matchingPairs)
  if (fromPairs.length) return fromPairs

  if (typeof q?.correctAnswer === 'string' && q.correctAnswer.trim()) {
    try {
      const parsed = JSON.parse(q.correctAnswer)
      const normalized = normalizeMatchingPairs(parsed)
      if (normalized.length) return normalized
    } catch {
      /* fall through */
    }
  }

  return []
}

export function serializeMatchingPair(pair) {
  return `${pair.left}${PAIR_DELIMITER}${pair.right}`
}

export function parseMatchingPairText(text) {
  const raw = String(text ?? '')
  const idx = raw.indexOf(PAIR_DELIMITER)
  if (idx === -1) return null
  const left = raw.slice(0, idx).trim()
  const right = raw.slice(idx + 1).trim()
  if (!left || !right) return null
  return { left, right }
}

/**
 * Student answer JSON: { "Left item": "Right item", ... }
 * @param {string | null | undefined} answerText
 * @param {{ left: string, right: string }[]} pairs
 */
export function gradeMatchingAnswer(answerText, pairs) {
  if (!pairs.length) return null
  let studentMap = {}
  try {
    const parsed = JSON.parse(String(answerText || '{}'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      studentMap = parsed
    } else {
      return false
    }
  } catch {
    return false
  }

  for (const pair of pairs) {
    const studentRight = String(studentMap[pair.left] ?? '').trim()
    if (studentRight !== pair.right) return false
  }
  return true
}
