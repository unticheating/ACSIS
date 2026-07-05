/** @param {Element} root */
export function isDocumentScrollRoot(root) {
  return root === document.scrollingElement
    || root === document.documentElement
    || root === document.body
}

/** @param {Element | null | undefined} el */
export function getScrollableParent(el) {
  let node = el?.parentElement ?? null
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      return node
    }
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

/** @param {Element} root */
export function getScrollTopForRoot(root) {
  if (isDocumentScrollRoot(root)) {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
  }
  return root.scrollTop
}

/** @param {Element} root @param {number} top @param {ScrollBehavior} [behavior] */
export function scrollRootTo(root, top, behavior = 'auto') {
  const y = Math.max(0, top)
  if (isDocumentScrollRoot(root)) {
    const scrollingElement = document.scrollingElement || document.documentElement
    scrollingElement.scrollTo({ top: y, left: 0, behavior: 'auto' })
    window.scrollTo({ top: y, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = y
    document.body.scrollTop = y
    return
  }
  root.scrollTo({ top: y, left: 0, behavior: 'auto' })
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateScrollRootTo(root, top) {
  const start = getScrollTopForRoot(root)
  const distance = top - start
  if (Math.abs(distance) < 1) return

  const duration = Math.min(700, Math.max(280, Math.abs(distance) * 0.45))
  const startTime = performance.now()

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1)
    const eased = 1 - (1 - progress) ** 3
    scrollRootTo(root, start + distance * eased, 'auto')
    if (progress < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

/**
 * Scroll so `el`'s top sits `viewportOffset` px below the viewport top.
 * @param {Element} el
 * @param {number} viewportOffset
 * @param {ScrollBehavior} [behavior]
 */
export function scrollElementToViewportOffset(el, viewportOffset, behavior = 'smooth') {
  const root = getScrollableParent(el)
  const rootTop = isDocumentScrollRoot(root) ? 0 : root.getBoundingClientRect().top
  const target = getScrollTopForRoot(root) + el.getBoundingClientRect().top - rootTop - viewportOffset

  if (behavior === 'smooth' && !prefersReducedMotion()) {
    animateScrollRootTo(root, target)
    return
  }

  scrollRootTo(root, target, 'auto')
}

/** @returns {number} */
export function getPageScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
}

/** @param {number} scrollTop */
export function restorePageScrollTop(scrollTop) {
  window.scrollTo({ top: scrollTop, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = scrollTop
  document.body.scrollTop = scrollTop
}

export function isPageScrollLocked() {
  return document.body.hasAttribute('data-scroll-locked')
}

/**
 * Lock page scroll without jumping to the top (for non-Radix overlays).
 * @returns {() => void} cleanup
 */
export function lockPageScroll() {
  const scrollY = getPageScrollTop()
  const { style } = document.body
  const previous = {
    overflow: style.overflow,
    position: style.position,
    top: style.top,
    width: style.width,
  }

  style.overflow = 'hidden'
  style.position = 'fixed'
  style.top = `-${scrollY}px`
  style.width = '100%'

  return () => {
    style.overflow = previous.overflow
    style.position = previous.position
    style.top = previous.top
    style.width = previous.width
    restorePageScrollTop(scrollY)
  }
}
