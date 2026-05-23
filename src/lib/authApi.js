const API_BASE = ''

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export function startGoogleSignIn() {
  window.location.href = `${API_BASE}/api/auth/google`
}

export async function fetchAuthMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
  if (res.status === 401) return { authenticated: false }
  return parseJson(res)
}

export async function logoutAuth() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  return parseJson(res)
}

export async function loginWithPassword(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  return parseJson(res)
}

export async function fetchAuthConfig() {
  const res = await fetch(`${API_BASE}/api/auth/config`, { credentials: 'include' })
  return parseJson(res)
}

export async function fetchVerificationPending() {
  const res = await fetch(`${API_BASE}/api/auth/verification-pending`, { credentials: 'include' })
  if (res.status === 401) return { pending: false }
  return parseJson(res)
}

export async function startEmailVerification(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/start-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  return parseJson(res)
}

export async function verifyEmailCode(code) {
  const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  })
  return parseJson(res)
}

export async function resendVerificationCode() {
  const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: 'POST',
    credentials: 'include',
  })
  return parseJson(res)
}

export const AUTH_ERROR_MESSAGES = {
  invalid_domain: 'Only @plpasig.edu.ph Google accounts can sign in.',
  email_not_verified: 'Your Google email is not verified. Use a verified school account.',
  google_denied: 'Google sign-in was cancelled.',
  missing_code: 'Google sign-in did not complete. Please try again.',
  auth_failed: 'Sign-in failed. Please try again or contact your administrator.',
  no_membership:
    'Your account is recognized, but you are not assigned to an institution yet. Ask your administrator to add you.',
}
