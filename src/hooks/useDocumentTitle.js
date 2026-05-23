import { useEffect } from 'react'

const DEFAULT_SUFFIX = 'ACSIS'

/**
 * Updates the browser tab title (e.g. "Dashboard – ACSIS").
 * @param {string | null | undefined} pageTitle
 * @param {{ suffix?: string }} [options]
 */
export function useDocumentTitle(pageTitle, options = {}) {
  const suffix = options.suffix ?? DEFAULT_SUFFIX

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} – ${suffix}` : suffix
  }, [pageTitle, suffix])
}
