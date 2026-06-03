/** @param {string | null | undefined} text */
export function normalizeIdentificationAnswer(text) {
  if (text == null || text === '') return '';
  return String(text).trim().toUpperCase();
}

/**
 * Comma-separated acceptable identification answers (deduped, uppercase).
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function parseIdentificationAnswersList(text) {
  if (text == null || text === '') return [];
  const seen = new Set();
  const out = [];
  for (const part of String(text).split(',')) {
    const norm = normalizeIdentificationAnswer(part);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/**
 * @param {{
 *   correctAnswer?: string | null,
 *   presentationAnswer?: string | null,
 *   answerExplanation?: string | null,
 * }} q
 */
export function resolveIdentificationPayload(q) {
  let acceptable = parseIdentificationAnswersList(q.correctAnswer);
  const presentation = normalizeIdentificationAnswer(q.presentationAnswer) || acceptable[0] || '';
  const explanation =
    q.answerExplanation != null && String(q.answerExplanation).trim() !== ''
      ? String(q.answerExplanation).trim()
      : null;

  if (presentation && !acceptable.includes(presentation)) {
    acceptable = [presentation, ...acceptable];
  }
  if (!presentation && acceptable.length) {
    return { acceptable, presentation: acceptable[0], explanation };
  }
  return { acceptable, presentation, explanation };
}
