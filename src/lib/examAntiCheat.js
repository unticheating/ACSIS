/** Server-side fallback when institution max_warnings is missing. */
export const DEFAULT_MAX_EXAM_WARNINGS = 3

/** @deprecated Use institution/API maxWarnings; kept for legacy imports. */
export const MAX_EXAM_WARNINGS = DEFAULT_MAX_EXAM_WARNINGS

/**
 * @param {unknown} apiOrStateValue
 * @param {unknown} [institutionMaxWarnings]
 */
export function resolveMaxWarnings(apiOrStateValue, institutionMaxWarnings) {
  const fromApi = Number(apiOrStateValue)
  if (Number.isFinite(fromApi) && fromApi > 0) return Math.floor(fromApi)
  const fromInst = Number(institutionMaxWarnings)
  if (Number.isFinite(fromInst) && fromInst > 0) return Math.floor(fromInst)
  return DEFAULT_MAX_EXAM_WARNINGS
}

/** Strike count shown in UI — never above institution max. */
export function displayStrikeCount(warningCount, maxWarnings) {
  const max = resolveMaxWarnings(maxWarnings)
  const n = Number(warningCount) || 0
  return Math.min(Math.max(0, n), max)
}

/** Tailwind classes for the in-exam warning badge by strike count. */
export function warningCountBadgeClass(count, maxWarnings) {
  const max = resolveMaxWarnings(maxWarnings)
  const n = Number(count) || 0
  if (n <= 0) return 'bg-foreground/5 text-foreground/80'
  if (n >= max - 1) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  if (n >= Math.max(1, Math.floor(max * 0.5))) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100'
}

export const CHEAT_EVENT_LABELS = {
  alt_tab: 'Tab or window switch detected',
  copy_attempt: 'Copy attempt blocked',
  paste_attempt: 'Paste attempt blocked',
  window_blur: 'Left fullscreen or pressed F11/Esc — stay in exam fullscreen',
  devtools_open: 'Developer tools shortcut',
  screenshot_attempt: 'Screenshot attempt blocked',
  win_key: 'Windows / system key blocked — stay on the exam',
  other: 'Unauthorized action',
}

export function labelForCheatEvent(eventType) {
  return CHEAT_EVENT_LABELS[eventType] || CHEAT_EVENT_LABELS.other
}
