import { useLayoutEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AUTH_REDIRECT_BANNER_ERROR,
  resolveAuthRedirectErrorCode,
  showAuthRedirectToastOnce,
  stripAuthRedirectParams,
} from '@/lib/authRedirectError.js'

/**
 * Shows Sonner toasts for OAuth redirect errors (?error=google_denied, etc.).
 * invalid_domain is shown as an inline banner on the login page instead.
 */
export default function AuthRedirectToastListener() {
  const [searchParams, setSearchParams] = useSearchParams()

  useLayoutEffect(() => {
    const errorCode = resolveAuthRedirectErrorCode(searchParams)
    if (!errorCode) return

    showAuthRedirectToastOnce(errorCode)

    if (searchParams.get('error') && errorCode !== AUTH_REDIRECT_BANNER_ERROR) {
      setSearchParams(stripAuthRedirectParams(searchParams), { replace: true })
    }
  }, [searchParams, setSearchParams])

  return null
}
