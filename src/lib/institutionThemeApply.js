/**
 * Apply institution palette to document CSS variables (shell + tokens + shadcn).
 * @typedef {{ primaryColor: string, secondaryColor: string, baseColor?: string, themeName?: string }} ThemeColors
 */

import {
  buildBrandScale,
  hexToHslComponents,
  hexToRgba,
  normalizeHex,
  readableBrandTextOnLight,
  shade,
  tint,
} from './institutionColorScale.js'

const STORAGE_DEMO_THEME = 'acsis.demoThemeId'
const STORAGE_DEMO_INSTITUTION = 'acsis.demoInstitution'

const DEFAULT_DEMO_INSTITUTION = {
  institutionName: 'ACSIS',
  acronym: '',
  logo: null,
  maxWarnings: 3,
}

/** Neutral dark palette — institution color is accent-only */
export const DARK_NEUTRALS = {
  canvas: '#0A0A0A',
  sidebar: '#111111',
  surface: '#1A1A1A',
  surfaceMuted: '#171717',
  elevated: '#212121',
  rowAlt: '#1F1F1F',
  border: '#2A2A2A',
  borderSubtle: '#252525',
  fgPrimary: '#F5F5F5',
  fgSecondary: '#A3A3A3',
  fgMuted: '#6B7280',
}

const THEME_CSS_KEYS = [
  '--acsis-brand',
  '--acsis-brand-50',
  '--acsis-brand-100',
  '--acsis-brand-500',
  '--acsis-brand-600',
  '--acsis-brand-700',
  '--acsis-brand-hover',
  '--acsis-brand-muted-bg',
  '--acsis-brand-muted-text',
  '--acsis-brand-subtle',
  '--acsis-brand-ring',
  '--acsis-nav-active-fill',
  '--acsis-nav-active-fg',
  '--acsis-nav-active-icon',
  '--acsis-nav-hover-fg',
  '--acsis-nav-hover-bg',
  '--acsis-nav-active-shadow',
  '--acsis-tooltip-bg',
  '--acsis-tooltip-fg',
  '--acsis-tooltip-shadow',
  '--acsis-canvas',
  '--acsis-canvas-light',
  '--acsis-sidebar-bg',
  '--acsis-sidebar-border',
  '--acsis-dark-surface',
  '--acsis-dark-surface-muted',
  '--acsis-dark-elevated',
  '--acsis-dark-row-alt',
  '--bg-canvas',
  '--bg-surface',
  '--bg-surface-muted',
  '--bg-elevated',
  '--fg-default',
  '--fg-muted',
  '--fg-subtle',
  '--border-default',
  '--border-muted',
  '--border-subtle',
  '--bg-muted',
  '--acsis-alert',
  '--acsis-shell-border',
  '--acsis-shell-border-subtle',
  '--acsis-nav-fg',
  '--acsis-nav-icon',
  '--acsis-content-header-bg',
  '--accent-primary',
  '--accent-primary-hover',
  '--focus-ring',
  '--brand-mark',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--border',
  '--input',
  '--ring',
  '--acsis-card-neu-highlight',
  '--acsis-card-neu-shadow',
  '--neu-surface-hi',
  '--neu-surface-lo',
]

/** @returns {boolean} */
export function isDocumentDark() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

/**
 * @param {HTMLElement} root
 * @param {string} primary
 */
function applyBrandScale(root, primary) {
  const scale = buildBrandScale(primary)
  root.style.setProperty('--acsis-brand', scale[500])
  root.style.setProperty('--acsis-brand-50', scale[50])
  root.style.setProperty('--acsis-brand-100', scale[100])
  root.style.setProperty('--acsis-brand-500', scale[500])
  root.style.setProperty('--acsis-brand-600', scale[600])
  root.style.setProperty('--acsis-brand-700', scale[700])
  root.style.setProperty('--acsis-brand-hover', scale[600])
  root.style.setProperty('--accent-primary', scale[500])
  root.style.setProperty('--accent-primary-hover', scale[600])
  root.style.setProperty('--focus-ring', scale[500])
}

/**
 * @param {HTMLElement} root
 * @param {string} primary
 * @param {boolean} isDark
 */
function applyTooltipTokens(root, primary, isDark) {
  if (isDark) {
    root.style.setProperty('--acsis-tooltip-bg', shade(primary, 0.15))
    root.style.setProperty('--acsis-tooltip-fg', '#ffffff')
    root.style.setProperty(
      '--acsis-tooltip-shadow',
      `0 4px 16px ${hexToRgba(primary, 0.45)}, 0 2px 8px rgba(0, 0, 0, 0.35)`,
    )
    return
  }

  root.style.setProperty('--acsis-tooltip-bg', shade(primary, 0.22))
  root.style.setProperty('--acsis-tooltip-fg', '#ffffff')
  root.style.setProperty(
    '--acsis-tooltip-shadow',
    `0 4px 14px ${hexToRgba(primary, 0.38)}`,
  )
}

/**
 * @param {HTMLElement} root
 * @param {string} primary
 * @param {boolean} isDark
 */
function applyNavTokens(root, primary, isDark) {
  applyTooltipTokens(root, primary, isDark)

  if (isDark) {
    root.style.setProperty('--acsis-on-brand', '#ffffff')
    root.style.setProperty('--acsis-brand-muted-bg', hexToRgba(primary, 0.14))
    root.style.setProperty('--acsis-brand-muted-text', tint(primary, 0.5))
    root.style.setProperty('--acsis-brand-subtle', hexToRgba(primary, 0.08))
    root.style.setProperty('--acsis-brand-ring', hexToRgba(primary, 0.38))
    root.style.setProperty('--acsis-nav-active-fill', hexToRgba(primary, 0.22))
    root.style.setProperty('--acsis-nav-active-fg', DARK_NEUTRALS.fgPrimary)
    root.style.setProperty('--acsis-nav-active-icon', tint(primary, 0.55))
    root.style.setProperty('--acsis-nav-hover-fg', DARK_NEUTRALS.fgPrimary)
    root.style.setProperty('--acsis-nav-hover-bg', hexToRgba(primary, 0.1))
    root.style.setProperty(
      '--acsis-nav-active-shadow',
      `0 0 0 1px ${hexToRgba(primary, 0.45)}, 0 4px 16px ${hexToRgba(primary, 0.12)}`,
    )
    root.style.setProperty('--brand-mark', tint(primary, 0.48))
    return
  }

  const brandText = readableBrandTextOnLight(primary)
  root.style.setProperty('--acsis-brand-muted-bg', tint(primary, 0.9))
  root.style.setProperty('--acsis-brand-muted-text', brandText)
  root.style.setProperty('--acsis-brand-subtle', tint(primary, 0.96))
  root.style.setProperty('--acsis-brand-ring', hexToRgba(primary, 0.35))
  root.style.setProperty('--acsis-on-brand', '#ffffff')
  root.style.setProperty('--acsis-nav-active-fill', primary)
  root.style.setProperty('--acsis-nav-active-fg', '#ffffff')
  root.style.setProperty('--acsis-nav-active-icon', '#ffffff')
  root.style.setProperty('--acsis-nav-hover-fg', brandText)
  root.style.setProperty('--acsis-nav-hover-bg', hexToRgba(primary, 0.12))
  root.style.setProperty(
    '--acsis-nav-active-shadow',
    `0 4px 14px ${hexToRgba(primary, 0.35)}`,
  )
  root.style.setProperty('--brand-mark', brandText)
}

/**
 * @param {HTMLElement} root
 * @param {string} primary
 */
function applyDarkNeutralSurfaces(root, primary) {
  const n = DARK_NEUTRALS
  root.style.setProperty('--acsis-canvas', n.canvas)
  root.style.setProperty('--acsis-sidebar-bg', n.sidebar)
  root.style.setProperty('--acsis-sidebar-border', hexToRgba(primary, 0.22))
  root.style.setProperty('--acsis-dark-surface', n.surface)
  root.style.setProperty('--acsis-dark-surface-muted', n.surfaceMuted)
  root.style.setProperty('--acsis-dark-elevated', n.elevated)
  root.style.setProperty('--acsis-dark-row-alt', n.rowAlt)
  root.style.setProperty('--bg-canvas', n.canvas)
  root.style.setProperty('--bg-surface', n.surface)
  root.style.setProperty('--bg-surface-muted', n.surfaceMuted)
  root.style.setProperty('--bg-elevated', n.elevated)
  root.style.setProperty('--fg-default', n.fgPrimary)
  root.style.setProperty('--fg-muted', n.fgSecondary)
  root.style.setProperty('--fg-subtle', n.fgMuted)
  root.style.setProperty('--border-default', n.border)
  root.style.setProperty('--border-muted', n.borderSubtle)
  root.style.setProperty('--border-subtle', n.borderSubtle)
  root.style.setProperty('--bg-muted', n.surfaceMuted)
  root.style.setProperty('--acsis-alert', '#f87171')
  root.style.setProperty('--acsis-shell-border', hexToRgba(primary, 0.22))
  root.style.setProperty('--acsis-shell-border-subtle', hexToRgba(primary, 0.12))
  root.style.setProperty('--acsis-nav-fg', n.fgSecondary)
  root.style.setProperty('--acsis-nav-icon', n.fgMuted)
  root.style.setProperty('--acsis-content-header-bg', n.sidebar)
  root.style.setProperty('--brand-page', n.fgPrimary)
}

/**
 * @param {HTMLElement} root
 * @param {string} primary
 * @param {string} secondary
 * @param {string} [baseColor]
 */
function applyLightSurfaces(root, primary, secondary, baseColor) {
  const surface = baseColor ? normalizeHex(baseColor) : '#FFFFFF'
  root.style.setProperty('--acsis-canvas', secondary)
  root.style.setProperty('--acsis-canvas-light', secondary)
  const sidebarBg = tint(secondary, 0.35)
  root.style.setProperty('--acsis-sidebar-bg', sidebarBg)
  root.style.setProperty(
    '--acsis-sidebar-border',
    `color-mix(in srgb, ${primary} 14%, #e5e7eb)`,
  )
  root.style.setProperty('--bg-canvas', secondary)
  root.style.setProperty('--bg-surface', surface)
  root.style.setProperty('--bg-surface-muted', tint(secondary, 0.5))
  root.style.setProperty('--bg-elevated', surface)
  root.style.setProperty('--fg-default', '#111827')
  root.style.setProperty('--fg-muted', '#6b7280')
  root.style.setProperty('--fg-subtle', '#9ca3af')
  root.style.setProperty('--border-default', '#e5e7eb')
  root.style.setProperty('--border-muted', hexToRgba(primary, 0.14))
  root.style.setProperty('--border-subtle', '#f1f5f9')
  root.style.setProperty('--bg-muted', tint(secondary, 0.5))
  root.style.setProperty('--acsis-alert', '#dc2626')
  root.style.setProperty('--acsis-shell-border', hexToRgba(primary, 0.2))
  root.style.setProperty('--acsis-shell-border-subtle', hexToRgba(primary, 0.1))
  root.style.setProperty('--acsis-nav-fg', '#4b5563')
  root.style.setProperty('--acsis-nav-icon', '#6b7280')
  root.style.setProperty('--acsis-content-header-bg', sidebarBg)
  root.style.setProperty('--brand-page', '#111827')
}

/**
 * Sync shadcn/Tailwind HSL tokens with institution primary.
 * @param {HTMLElement} root
 * @param {string} primary
 * @param {boolean} isDark
 */
function applyShadcnTokens(root, primary, isDark) {
  const { h, s } = hexToHslComponents(primary)
  const sat = Math.min(s, 78)

  const primaryL = Math.min(Math.max(38, Math.min(sat, 50) > 15 ? 40 : 32), 46)
  const ringL = Math.min(primaryL + 4, 50)

  if (isDark) {
    root.style.setProperty('--background', '0 0% 4%')
    root.style.setProperty('--foreground', '0 0% 96%')
    root.style.setProperty('--card', '0 0% 10%')
    root.style.setProperty('--card-foreground', '0 0% 96%')
    root.style.setProperty('--primary', `${h} ${sat}% ${primaryL}%`)
    root.style.setProperty('--primary-foreground', '0 0% 100%')
    root.style.setProperty('--secondary', '0 0% 13%')
    root.style.setProperty('--secondary-foreground', '0 0% 90%')
    root.style.setProperty('--muted', '0 0% 11%')
    root.style.setProperty('--muted-foreground', '0 0% 64%')
    root.style.setProperty('--accent', `${h} ${Math.max(sat - 10, 20)}% 16%`)
    root.style.setProperty('--accent-foreground', '0 0% 96%')
    root.style.setProperty('--border', '0 0% 16%')
    root.style.setProperty('--input', '0 0% 16%')
    root.style.setProperty('--ring', `${h} ${sat}% ${ringL}%`)
    return
  }

  root.style.setProperty('--background', '0 0% 100%')
  root.style.setProperty('--foreground', '222 47% 11%')
  root.style.setProperty('--card', '0 0% 100%')
  root.style.setProperty('--card-foreground', '222 47% 11%')
  root.style.setProperty('--primary', `${h} ${sat}% ${primaryL}%`)
  root.style.setProperty('--primary-foreground', '0 0% 100%')
  root.style.setProperty('--secondary', '210 20% 96%')
  root.style.setProperty('--secondary-foreground', '222 47% 11%')
  root.style.setProperty('--muted', '210 20% 96%')
  root.style.setProperty('--muted-foreground', '215 16% 47%')
  root.style.setProperty('--accent', `${h} ${Math.max(sat - 15, 12)}% 94%`)
  root.style.setProperty('--accent-foreground', `${h} ${sat}% ${Math.max(primaryL - 12, 22)}%`)
  root.style.setProperty('--border', '214 32% 91%')
  root.style.setProperty('--input', '214 32% 91%')
  root.style.setProperty('--ring', `${h} ${sat}% ${ringL}%`)
}

/**
 * Neumorphic card shadows tinted by institution primary.
 * @param {HTMLElement} root
 * @param {string} primary
 * @param {boolean} isDark
 */
function applyCardNeumorphism(root, primary, isDark) {
  if (isDark) {
    root.style.setProperty('--neu-surface-hi', '#1c1c1c')
    root.style.setProperty('--neu-surface-lo', '#000000')
    root.style.setProperty('--acsis-card-neu-highlight', hexToRgba(tint(primary, 0.1), 0.2))
    root.style.setProperty('--acsis-card-neu-shadow', hexToRgba('#000000', 0.45))
    return
  }

  root.style.setProperty('--neu-surface-hi', '#ffffff')
  root.style.setProperty('--neu-surface-lo', '#0f172a')
  root.style.setProperty('--acsis-card-neu-highlight', hexToRgba(tint(primary, 0.9), 0.98))
  root.style.setProperty('--acsis-card-neu-shadow', hexToRgba(shade(primary, 0.48), 0.38))
}

/**
 * @param {ThemeColors | null | undefined} theme
 * @param {boolean} [isDark] defaults to document class
 */
export function applyInstitutionTheme(theme, isDark = isDocumentDark()) {
  if (typeof document === 'undefined' || !theme?.primaryColor) return

  const primary = normalizeHex(theme.primaryColor)
  const secondary = normalizeHex(theme.secondaryColor)
  const baseColor = theme.baseColor ? normalizeHex(theme.baseColor) : undefined
  const root = document.documentElement

  applyBrandScale(root, primary)
  applyNavTokens(root, primary, isDark)
  applyShadcnTokens(root, primary, isDark)

  if (isDark) {
    applyDarkNeutralSurfaces(root, primary)
  } else {
    applyLightSurfaces(root, primary, secondary, baseColor)
  }

  applyCardNeumorphism(root, primary, isDark)
  root.dataset.institutionTheme = theme.themeName?.toLowerCase?.() || ''
}

export function clearInstitutionTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  THEME_CSS_KEYS.forEach((key) => root.style.removeProperty(key))
  delete root.dataset.institutionTheme
}

const DEFAULT_DEMO_THEME_ID = 6

export function readDemoThemeId() {
  try {
    const v = Number(localStorage.getItem(STORAGE_DEMO_THEME))
    return Number.isInteger(v) && v >= 1 ? v : DEFAULT_DEMO_THEME_ID
  } catch {
    return DEFAULT_DEMO_THEME_ID
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
