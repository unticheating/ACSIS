import { APP_LOGO_ALT, APP_LOGO_SRC } from '@/config/brandAssets.js'

/**
 * Default in-app logo (PLP placeholder until ACSIS mark is added).
 * @param {{ className?: string, width?: number, height?: number, alt?: string, responsive?: boolean }} props
 */
export default function PlpLogo({
  className = '',
  width = 36,
  height = 36,
  alt = APP_LOGO_ALT,
  responsive = false,
}) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt={alt}
      className={className}
      {...(responsive ? {} : { width, height })}
      decoding="async"
    />
  )
}
