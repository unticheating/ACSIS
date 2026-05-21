import plpLogoSrc from '../../../img/plpupdatedlogo 3.png'

/**
 * @param {{ className?: string, width?: number, height?: number, alt?: string, responsive?: boolean }} props
 */
export default function PlpLogo({
  className = '',
  width = 36,
  height = 36,
  alt = 'Pamantasan ng Lungsod ng Pasig',
  responsive = false,
}) {
  return (
    <img
      src={plpLogoSrc}
      alt={alt}
      className={className}
      {...(responsive ? {} : { width, height })}
      decoding="async"
    />
  )
}
