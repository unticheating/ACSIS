/**
 * Shared fetch wrapper that automatically attaches demo-mode headers
 * and credentials for all API calls.
 */

const STORAGE_SESSION_MODE = 'acsis.sessionMode'
const STORAGE_ACCOUNT = 'acsis.activeAccountId'

export function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) }

  // Check if we're in demo mode
  const sessionMode = sessionStorage.getItem(STORAGE_SESSION_MODE)
  if (sessionMode === 'demo') {
    const accountId = sessionStorage.getItem(STORAGE_ACCOUNT) || 'student'
    headers['x-demo-account'] = accountId
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })
}
