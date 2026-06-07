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
  const res = await fetch(`${API_BASE}/api/auth/me`, { 
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
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

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  })
  return parseJson(res)
}

export async function changePassword(newPassword, confirmPassword) {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ newPassword, confirmPassword }),
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
  invalid_domain:
    'Only registered school domains are allowed to sign in using Google Auth.',
  email_not_verified: 'Your Google email is not verified. Use a verified school account.',
  google_denied: 'Google sign-in was cancelled.',
  missing_code: 'Google sign-in did not complete. Please try again.',
  auth_failed: 'Sign-in failed. Please try again or contact your administrator.',
  no_membership:
    'Your account is recognized, but you are not assigned to an institution yet. Ask your administrator to add you.',
}

export async function saveStudentNumber(studentNumber) {
  const res = await fetch(`${API_BASE}/api/student/onboarding/student-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ studentNumber }),
  })
  return parseJson(res)
}

export async function joinClassByCode(accessCode) {
  const res = await fetch(`${API_BASE}/api/student/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ accessCode }),
  })
  return parseJson(res)
}

export async function initialJoinClassByCode(accessCode) {
  const res = await fetch(`${API_BASE}/api/auth/onboarding/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ accessCode }),
  })
  return parseJson(res)
}

export async function updateProfileAvatar(avatarDataUrl) {
  const res = await fetch(`${API_BASE}/api/auth/profile/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ avatarDataUrl }),
  })
  return parseJson(res)
}
