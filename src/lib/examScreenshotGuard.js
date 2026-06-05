/**
 * Keyboard guards during exam: screenshots, Windows/Meta, Alt+Tab, etc.
 * Browsers cannot fully block OS-level actions (phone camera, etc.).
 */

/** F11 / Esc — blocked during exam; may count as a strike up to max warnings. */
export function isFullscreenRestoreKey(ev) {
  if (!ev) return false
  const code = ev.code || ''
  const key = ev.key || ''
  return (
    code === 'F11' ||
    key === 'F11' ||
    code === 'Escape' ||
    key === 'Escape'
  )
}
export function isScreenshotShortcut(ev) {
  if (!ev) return false
  const code = ev.code || ''
  const key = ev.key || ''

  if (code === 'PrintScreen' || key === 'PrintScreen') return true

  // macOS: Cmd+Shift+3 / 4 / 5
  if (ev.metaKey && ev.shiftKey && /^[345]$/.test(key)) return true

  // Windows: Win+Shift+S (Snipping Tool)
  if (
    ev.shiftKey &&
    (key === 's' || key === 'S') &&
    (ev.metaKey || code === 'OSLeft' || code === 'OSRight')
  ) {
    return true
  }

  // Some mobile / laptop keys
  if (key === 'Snapshot' || code === 'Snapshot') return true

  return false
}

export function describeScreenshotShortcut(ev) {
  if (!ev) return 'Screenshot shortcut'
  const parts = []
  if (ev.metaKey) parts.push('Win/Cmd')
  if (ev.shiftKey) parts.push('Shift')
  if (ev.altKey) parts.push('Alt')
  if (ev.ctrlKey) parts.push('Ctrl')
  const main = ev.code || ev.key || 'PrintScreen'
  parts.push(main)
  return parts.join('+')
}

function isMetaOrOsKey(ev) {
  const code = ev.code || ''
  const key = ev.key || ''
  return (
    key === 'Meta' ||
    code === 'MetaLeft' ||
    code === 'MetaRight' ||
    code === 'OSLeft' ||
    code === 'OSRight'
  )
}

function isAltKey(ev) {
  const code = ev.code || ''
  const key = ev.key || ''
  return key === 'Alt' || code === 'AltLeft' || code === 'AltRight'
}

/** Allowed Meta/Ctrl combos (copy/paste already handled separately). */
function isAllowedModifierCombo(ev) {
  const key = ev.key || ''
  return ['c', 'C', 'v', 'V', 'x', 'X'].includes(key)
}

/**
 * @returns {{ eventType: string, details: string } | null}
 */
export function getFocusViolationFromKey(ev) {
  if (!ev) return null
  if (isScreenshotShortcut(ev)) {
    return { eventType: 'screenshot_attempt', details: describeScreenshotShortcut(ev) }
  }

  const code = ev.code || ''

  if (code === 'F12') {
    return { eventType: 'devtools_open', details: 'F12' }
  }

  if (ev.altKey && ev.key === 'Tab') {
    return { eventType: 'alt_tab', details: 'Alt+Tab' }
  }

  if (isMetaOrOsKey(ev)) {
    return { eventType: 'win_key', details: ev.code || 'Windows key' }
  }

  if (ev.metaKey && !ev.ctrlKey && !isAllowedModifierCombo(ev)) {
    return { eventType: 'win_key', details: describeScreenshotShortcut(ev) }
  }

  return null
}
