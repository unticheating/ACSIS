import { hexToRgba, normalizeHex, shade, tint } from './institutionColorScale.js'

/**
 * Inline CSS vars for per-card neumorphic hover (institution-tinted).
 * @param {string} primaryHex
 * @param {boolean} [isDark]
 */
export function cardNeuStyleVars(primaryHex, isDark = false) {
  const primary = normalizeHex(primaryHex || '#334155')
  if (isDark) {
    return {
      '--card-glow': primary,
      '--acsis-card-neu-highlight': hexToRgba(tint(primary, 0.1), 0.2),
      '--acsis-card-neu-shadow': hexToRgba('#000000', 0.45),
    }
  }
  return {
    '--card-glow': primary,
    '--acsis-card-neu-highlight': hexToRgba(tint(primary, 0.9), 0.98),
    '--acsis-card-neu-shadow': hexToRgba(shade(primary, 0.48), 0.38),
  }
}
