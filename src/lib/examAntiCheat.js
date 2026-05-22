/** Matches proctoring rules in ACSIS exam session (max 3 strikes → auto-submit). */
export const MAX_EXAM_WARNINGS = 3

export const CHEAT_EVENT_LABELS = {
  alt_tab: 'Tab or window switch detected',
  copy_attempt: 'Copy attempt blocked',
  paste_attempt: 'Paste attempt blocked',
  window_blur: 'Exam window lost focus',
  devtools_open: 'Developer tools shortcut',
  other: 'Unauthorized action',
}

export function labelForCheatEvent(eventType) {
  return CHEAT_EVENT_LABELS[eventType] || CHEAT_EVENT_LABELS.other
}
