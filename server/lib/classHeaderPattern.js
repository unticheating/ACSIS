export const CLASS_HEADER_PATTERNS = ['grid', 'honeycomb', 'diamond', 'floral', 'ruled'];

export const DEFAULT_HEADER_PATTERN = 'grid';

/** @param {unknown} value */
export function normalizeHeaderPattern(value) {
  const v = String(value ?? '')
    .toLowerCase()
    .trim();
  return CLASS_HEADER_PATTERNS.includes(v) ? v : DEFAULT_HEADER_PATTERN;
}
