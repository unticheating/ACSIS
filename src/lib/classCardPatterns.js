/** Class header / card background patterns (stored on `classes.header_pattern`). */

export const CLASS_HEADER_PATTERNS = ['grid', 'honeycomb', 'diamond', 'floral', 'ruled']

export const DEFAULT_HEADER_PATTERN = 'grid'

/** @type {Record<string, string>} */
export const CLASS_HEADER_PATTERN_LABELS = {
  grid: 'Grid',
  honeycomb: 'Honeycomb',
  diamond: 'Diamond weave',
  floral: 'Floral tiles',
  ruled: 'Ruled',
}

/**
 * @param {unknown} value
 * @returns {(typeof CLASS_HEADER_PATTERNS)[number]}
 */
export function normalizeHeaderPattern(value) {
  const v = String(value ?? '')
    .toLowerCase()
    .trim()
  return CLASS_HEADER_PATTERNS.includes(v) ? v : DEFAULT_HEADER_PATTERN
}

/** @deprecated Use normalizeHeaderPattern with server-stored pattern */
export function classCardPatternForId(id) {
  const raw = String(id ?? '')
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return CLASS_HEADER_PATTERNS[Math.abs(hash) % CLASS_HEADER_PATTERNS.length]
}
