/** Optional per-class header background (stored as `classes.header_color`). */

export const CLASS_HEADER_COLOR_PRESETS = [
  { id: 'brand', label: 'Institution default', value: null },
  { id: 'forest', label: 'Forest', value: '#14532d' },
  { id: 'ocean', label: 'Ocean', value: '#1e3a8a' },
  { id: 'teal', label: 'Teal', value: '#0f766e' },
  { id: 'violet', label: 'Violet', value: '#5b21b6' },
  { id: 'wine', label: 'Wine', value: '#881337' },
  { id: 'amber', label: 'Amber', value: '#b45309' },
  { id: 'slate', label: 'Slate', value: '#334155' },
]

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * @param {unknown} value
 * @returns {string | null} null = use institution brand
 */
export function normalizeHeaderColor(value) {
  if (value === null || value === undefined || value === '') return null
  const v = String(value).trim()
  if (v === 'brand') return null
  if (!HEX_COLOR.test(v)) return null
  if (v.length === 4) {
    const r = v[1]
    const g = v[2]
    const b = v[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return v.toLowerCase()
}

/**
 * @param {string | null | undefined} headerColor
 * @returns {import('react').CSSProperties | undefined}
 */
export function headerColorStyle(headerColor) {
  const hex = normalizeHeaderColor(headerColor)
  if (!hex) return undefined
  return { '--class-header-bg': hex }
}
