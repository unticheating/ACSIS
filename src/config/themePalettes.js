/**
 * Predefined institution palettes (matches PostgreSQL `themes` seed in sql/acsis.sql).
 * @typedef {{ themeId: number, themeName: string, primaryColor: string, secondaryColor: string, baseColor: string }} ThemePalette
 */

/** @type {ThemePalette[]} */
export const THEME_PALETTES = [
  { themeId: 1, themeName: 'Emerald', primaryColor: '#16A34A', secondaryColor: '#DDEEE4', baseColor: '#FFFFFF' },
  { themeId: 2, themeName: 'Ocean', primaryColor: '#1D4ED8', secondaryColor: '#DBEAFE', baseColor: '#FFFFFF' },
  { themeId: 3, themeName: 'Crimson', primaryColor: '#B91C1C', secondaryColor: '#FEE2E2', baseColor: '#FFFFFF' },
  { themeId: 4, themeName: 'Violet', primaryColor: '#7C3AED', secondaryColor: '#EDE9FE', baseColor: '#FFFFFF' },
  { themeId: 5, themeName: 'Amber', primaryColor: '#D97706', secondaryColor: '#FEF3C7', baseColor: '#FFFFFF' },
  { themeId: 6, themeName: 'Slate', primaryColor: '#334155', secondaryColor: '#F1F5F9', baseColor: '#FFFFFF' },
]

/** @param {number} themeId */
export function paletteById(themeId) {
  return THEME_PALETTES.find((p) => p.themeId === themeId) ?? THEME_PALETTES[0]
}
