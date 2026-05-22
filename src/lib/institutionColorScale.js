/** @param {string} hex */
export function normalizeHex(hex) {
  const h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase()
  }
  if (h.length === 6) return `#${h}`.toUpperCase()
  return '#16A34A'
}

/** @param {string} hex @param {number} amount 0–1 mix toward white */
export function tint(hex, amount) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const mix = (c) => Math.round(c + (255 - c) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

/** @param {string} hex @param {number} amount 0–1 mix toward black */
export function shade(hex, amount) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const mix = (c) => Math.round(c * (1 - amount))
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

/** @param {string} hex @param {number} alpha 0–1 */
export function hexToRgba(hex, alpha) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** @param {string} hex */
export function hexToHslComponents(hex) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Tailwind-like brand scale from institution primary.
 * @param {string} primaryHex
 */
export function buildBrandScale(primaryHex) {
  const primary = normalizeHex(primaryHex)
  return {
    50: tint(primary, 0.92),
    100: tint(primary, 0.82),
    500: primary,
    600: shade(primary, 0.12),
    700: shade(primary, 0.25),
  }
}
