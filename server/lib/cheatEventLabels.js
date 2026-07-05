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
