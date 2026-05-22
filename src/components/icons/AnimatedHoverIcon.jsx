import { forwardRef, useImperativeHandle, useRef } from 'react'

/**
 * @typedef {{ startAnimation: () => void, stopAnimation: () => void }} AnimatedHoverIconHandle
 */

/**
 * Its Hover icon. Pass `ref` from the parent button/link and call start/stop on that parent's hover
 * so the whole control triggers the animation, not only the icon.
 * @param {{
 *   icon: import('react').ForwardRefExoticComponent,
 *   size?: number,
 *   strokeWidth?: number,
 *   className?: string,
 * }} props
 */
const AnimatedHoverIcon = forwardRef(function AnimatedHoverIcon(
  { icon: Icon, size = 20, strokeWidth = 2, className = '' },
  ref,
) {
  const iconRef = useRef(null)

  useImperativeHandle(ref, () => ({
    startAnimation: () => iconRef.current?.startAnimation?.(),
    stopAnimation: () => iconRef.current?.stopAnimation?.(),
  }))

  return (
    <span className={`acsis-hover-icon ${className}`.trim()} aria-hidden>
      <Icon ref={iconRef} size={size} strokeWidth={strokeWidth} />
    </span>
  )
})

export default AnimatedHoverIcon
