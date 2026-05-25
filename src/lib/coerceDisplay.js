/**
 * Safe string coercion for UI labels, breadcrumb keys, and route segments.
 * Avoids "Cannot convert object to primitive value" from template literals / encodeURIComponent.
 */
export function coerceDisplayString(value, fallback = '') {
  if (value == null) return fallback
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return String(value)
  try {
    return String(value)
  } catch {
    return fallback
  }
}

export function coerceRouteParam(value) {
  return encodeURIComponent(coerceDisplayString(value, ''))
}
