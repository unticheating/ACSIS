/**
 * Apply institution palette to document CSS variables (shell + tokens).
 * @typedef {{ primaryColor: string, secondaryColor: string, baseColor?: string, themeName?: string }} ThemeColors
 */

const STORAGE_DEMO_THEME = 'acsis.demoThemeId'
const STORAGE_DEMO_INSTITUTION = 'acsis.demoInstitution'

const DEFAULT_DEMO_INSTITUTION = {
  institutionName: 'Pamantasan ng Lungsod ng Pasig',
  acronym: 'PLP',
  logo: null,
  maxWarnings: 3,
}

/** @param {string} hex */
function normalizeHex(hex) {
  const h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase()
  }
  if (h.length === 6) return `#${h}`.toUpperCase()
  return '#16A34A'
}

/** @param {string} hex @param {number} amount 0–1 mix toward white */
function tint(hex, amount) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const mix = (c) => Math.round(c + (255 - c) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

/** @param {string} hex @param {number} amount 0–1 mix toward black */
function shade(hex, amount) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const mix = (c) => Math.round(c * (1 - amount))
  return `#${[mix(r), mix(g), mix(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

/** @param {string} hex @param {number} alpha 0–1 */
function hexToRgba(hex, alpha) {
  const n = normalizeHex(hex).slice(1)
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** @returns {boolean} */
export function isDocumentDark() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

const DARK_SHELL_VARS = [
  '--acsis-canvas',
  '--acsis-sidebar-bg',
  '--acsis-dark-surface',
  '--acsis-dark-surface-muted',
  '--bg-canvas',
  '--bg-surface',
  '--bg-surface-muted',
  '--border-default',
  '--border-muted',
  '--acsis-shell-border',
  '--acsis-shell-border-subtle',
  '--acsis-nav-fg',
  '--acsis-nav-icon',
  '--acsis-content-header-bg',
]

/** @param {ThemeColors} theme */
function isEmeraldTheme(theme) {
  const name = theme.themeName?.toLowerCase?.() || ''
  if (name === 'emerald') return true
  return normalizeHex(theme.primaryColor) === '#16A34A'
}

/**
 * Dark backgrounds tinted from institution secondary/primary (not for Emerald).
 * @param {string} primary
 * @param {string} secondary
 */
function computeDarkShellSurfaces(primary, secondary) {
  const canvas = shade(secondary, 0.92)
  const sidebar = shade(secondary, 0.89)
  const surface = shade(secondary, 0.86)
  const surfaceMuted = shade(secondary, 0.82)
  const { r, g, b } = hexToRgb(surface)
  return {
    canvas,
    sidebar,
    surface,
    surfaceMuted,
    shellBorder: hexToRgba(primary, 0.2),
    shellBorderSubtle: hexToRgba(primary, 0.12),
    borderDefault: shade(secondary, 0.72),
    navFg: tint(secondary, 0.4),
    navIcon: tint(secondary, 0.28),
    headerBg: `rgba(${r}, ${g}, ${b}, 0.92)`,
  }
}

/** @param {string} hex */
function hexToRgb(hex) {
  const n = normalizeHex(hex).slice(1)
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  }
}

/**
 * @param {HTMLElement} root
 * @param {ThemeColors} theme
 * @param {string} primary
 * @param {string} secondary
 * @param {boolean} isDark
 */
function applyDarkShellSurfaces(root, theme, primary, secondary, isDark) {
  if (!isDark) {
    DARK_SHELL_VARS.forEach((key) => root.style.removeProperty(key))
    return
  }

  if (isEmeraldTheme(theme)) {
    DARK_SHELL_VARS.forEach((key) => root.style.removeProperty(key))
    return
  }

  const s = computeDarkShellSurfaces(primary, secondary)
  root.style.setProperty('--acsis-canvas', s.canvas)
  root.style.setProperty('--acsis-sidebar-bg', s.sidebar)
  root.style.setProperty('--acsis-dark-surface', s.surface)
  root.style.setProperty('--acsis-dark-surface-muted', s.surfaceMuted)
  root.style.setProperty('--bg-canvas', s.canvas)
  root.style.setProperty('--bg-surface', s.surface)
  root.style.setProperty('--bg-surface-muted', s.surfaceMuted)
  root.style.setProperty('--border-default', s.borderDefault)
  root.style.setProperty('--border-muted', s.shellBorder)
  root.style.setProperty('--acsis-shell-border', s.shellBorder)
  root.style.setProperty('--acsis-shell-border-subtle', s.shellBorderSubtle)
  root.style.setProperty('--acsis-nav-fg', s.navFg)
  root.style.setProperty('--acsis-nav-icon', s.navIcon)
  root.style.setProperty('--acsis-content-header-bg', s.headerBg)
}

/**
 * @param {ThemeColors | null | undefined} theme
 * @param {boolean} [isDark] defaults to document class
 */
export function applyInstitutionTheme(theme, isDark = isDocumentDark()) {
  if (typeof document === 'undefined' || !theme?.primaryColor) return

  const primary = normalizeHex(theme.primaryColor)
  const secondary = normalizeHex(theme.secondaryColor)
  const hover = shade(primary, 0.12)
  const brandMark = isDark ? tint(primary, 0.5) : primary
  const mutedBg = isDark ? hexToRgba(primary, 0.16) : tint(primary, 0.92)
  const mutedText = isDark ? tint(primary, 0.55) : shade(primary, 0.35)
  const navActiveBg = isDark ? hexToRgba(primary, 0.28) : primary
  const navActiveBorder = isDark
    ? `color-mix(in srgb, ${primary} 38%, transparent)`
    : `color-mix(in srgb, ${primary} 35%, transparent)`
  const navActiveFg = isDark ? tint(primary, 0.75) : '#ffffff'
  const navActiveIcon = isDark ? tint(primary, 0.82) : '#ffffff'
  const navHoverFg = isDark ? tint(primary, 0.58) : primary

  const root = document.documentElement
  root.style.setProperty('--acsis-brand', primary)
  root.style.setProperty('--acsis-brand-hover', hover)
  root.style.setProperty('--acsis-brand-muted-bg', mutedBg)
  root.style.setProperty('--acsis-brand-muted-text', mutedText)
  root.style.setProperty('--acsis-nav-active-fill', navActiveBg)
  root.style.setProperty('--acsis-nav-active-fg', navActiveFg)
  root.style.setProperty('--acsis-nav-active-icon', navActiveIcon)
  root.style.setProperty('--acsis-nav-hover-fg', navHoverFg)
  root.style.setProperty('--acsis-nav-active-shadow', isDark ? `0 0 0 1px ${navActiveBorder}` : `0 4px 14px ${navActiveBorder}`)
  root.style.setProperty('--acsis-canvas-light', secondary)
  root.style.setProperty('--accent-primary', primary)
  root.style.setProperty('--accent-primary-hover', hover)
  root.style.setProperty('--focus-ring', primary)
  root.style.setProperty('--brand-mark', brandMark)
  root.dataset.institutionTheme = theme.themeName?.toLowerCase?.() || ''

  applyDarkShellSurfaces(root, theme, primary, secondary, isDark)

  if (!isDark) {
    root.style.setProperty('--acsis-canvas', secondary)
  }
}

export function clearInstitutionTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  ;[
    '--acsis-brand',
    '--acsis-brand-hover',
    '--acsis-brand-muted-bg',
    '--acsis-brand-muted-text',
    '--acsis-nav-active-fill',
    '--acsis-nav-active-fg',
    '--acsis-nav-active-icon',
    '--acsis-nav-hover-fg',
    '--acsis-nav-active-shadow',
    '--acsis-canvas',
    '--acsis-canvas-light',
    '--acsis-sidebar-bg',
    '--acsis-dark-surface',
    '--acsis-dark-surface-muted',
    '--bg-canvas',
    '--bg-surface',
    '--bg-surface-muted',
    '--border-default',
    '--border-muted',
    '--acsis-shell-border',
    '--acsis-shell-border-subtle',
    '--acsis-nav-fg',
    '--acsis-nav-icon',
    '--acsis-content-header-bg',
    '--accent-primary',
    '--accent-primary-hover',
    '--focus-ring',
    '--brand-mark',
  ].forEach((key) => root.style.removeProperty(key))
  delete root.dataset.institutionTheme
}

export function readDemoThemeId() {
  try {
    const v = Number(localStorage.getItem(STORAGE_DEMO_THEME))
    return Number.isInteger(v) && v >= 1 ? v : 1
  } catch {
    return 1
  }
}

/** @param {number} themeId */
export function writeDemoThemeId(themeId) {
  try {
    localStorage.setItem(STORAGE_DEMO_THEME, String(themeId))
  } catch {
    /* ignore */
  }
}

export function readDemoInstitution() {
  try {
    const raw = localStorage.getItem(STORAGE_DEMO_INSTITUTION)
    if (!raw) return { ...DEFAULT_DEMO_INSTITUTION }
    const p = JSON.parse(raw)
    return {
      institutionName:
        typeof p.institutionName === 'string' ? p.institutionName : DEFAULT_DEMO_INSTITUTION.institutionName,
      acronym: typeof p.acronym === 'string' ? p.acronym.toUpperCase() : DEFAULT_DEMO_INSTITUTION.acronym,
      logo: typeof p.logo === 'string' ? p.logo : null,
      maxWarnings:
        Number.isInteger(p.maxWarnings) && p.maxWarnings >= 1 && p.maxWarnings <= 20
          ? p.maxWarnings
          : DEFAULT_DEMO_INSTITUTION.maxWarnings,
    }
  } catch {
    return { ...DEFAULT_DEMO_INSTITUTION }
  }
}

/** @param {typeof DEFAULT_DEMO_INSTITUTION} data */
export function writeDemoInstitution(data) {
  try {
    localStorage.setItem(STORAGE_DEMO_INSTITUTION, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}
