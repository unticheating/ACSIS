const FAVICON_ID = 'acsis-document-icon'
const APPLE_ICON_ID = 'acsis-apple-touch-icon'

/**
 * Sets the browser tab icon (favicon). Replaces any icons from index.html or prior runs.
 * @param {string} href Resolved image URL (e.g. from brandAssets DOCUMENT_LOGO_SRC)
 * @param {string} [type]
 */
function faviconMimeType(href) {
  if (typeof href === 'string' && href.includes('.svg')) return 'image/svg+xml'
  return 'image/png'
}

export function setDocumentFavicon(href, type) {
  if (!href || typeof document === 'undefined') return
  const mimeType = type ?? faviconMimeType(href)

  document
    .querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
    )
    .forEach((el) => {
      if (el.id !== FAVICON_ID && el.id !== APPLE_ICON_ID) {
        el.remove()
      }
    })

  let link = document.getElementById(FAVICON_ID)
  if (!link) {
    link = document.createElement('link')
    link.id = FAVICON_ID
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = mimeType
  link.href = href

  let apple = document.getElementById(APPLE_ICON_ID)
  if (!apple) {
    apple = document.createElement('link')
    apple.id = APPLE_ICON_ID
    apple.rel = 'apple-touch-icon'
    document.head.appendChild(apple)
  }
  apple.href = href
}
