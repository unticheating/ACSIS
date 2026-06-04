import { AUTH_ERROR_MESSAGES } from './authApi.js'
import { acsisToastError } from './acsisToast.js'

const PENDING_ERROR_KEY = 'acsis.authRedirectError'
const TOAST_DEDUPE_PREFIX = 'acsis.authRedirectToastShown:'
export const AUTH_REDIRECT_BANNER_ERROR = 'invalid_domain'

export const GOOGLE_DOMAIN_BANNER_MESSAGE =
  'Only registered school domains are allowed to sign in using Google Auth.'

/**
 * Capture ?error= from the URL before React Router mounts (OAuth redirect lands on /?error=…).
 */
export function captureAuthRedirectErrorFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      sessionStorage.setItem(PENDING_ERROR_KEY, error)
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * @param {string | null | undefined} errorCode
 * @returns {boolean}
 */
export function isAuthRedirectBannerError(errorCode) {
  return errorCode === AUTH_REDIRECT_BANNER_ERROR
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {string | null}
 */
export function resolveAuthRedirectErrorCode(searchParams) {
  const fromUrl = searchParams.get('error')
  if (fromUrl) return fromUrl

  try {
    const stored = sessionStorage.getItem(PENDING_ERROR_KEY)
    if (stored) return stored
  } catch {
    // ignore
  }
  return null
}

export function clearAuthRedirectPendingError() {
  try {
    sessionStorage.removeItem(PENDING_ERROR_KEY)
  } catch {
    // ignore
  }
}

/**
 * @param {string} errorCode
 */
export function showAuthRedirectToastOnce(errorCode) {
  if (isAuthRedirectBannerError(errorCode)) return

  const message = AUTH_ERROR_MESSAGES[errorCode] || 'Sign-in could not be completed.'
  const dedupeKey = `${TOAST_DEDUPE_PREFIX}${errorCode}`

  try {
    if (sessionStorage.getItem(dedupeKey)) return
    sessionStorage.setItem(dedupeKey, '1')
    sessionStorage.removeItem(PENDING_ERROR_KEY)
  } catch {
    // ignore
  }

  acsisToastError(message)
}

/**
 * @param {URLSearchParams} searchParams
 */
export function stripAuthRedirectParams(searchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete('error')
  next.delete('auth')
  return next
}
