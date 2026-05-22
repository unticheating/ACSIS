import PlpLogo from './PlpLogo.jsx'

/**
 * Institution logo from settings, or default PLP mark.
 * @param {{ logo?: string | null, className?: string, width?: number, height?: number, alt?: string, responsive?: boolean }} props
 */
export default function InstitutionLogo({
  logo,
  className = 'acsis-logo-img',
  width = 36,
  height = 36,
  alt = '',
  responsive = false,
}) {
  if (logo) {
    return (
      <img
        src={logo}
        className={className}
        width={responsive ? undefined : width}
        height={responsive ? undefined : height}
        alt={alt}
        decoding="async"
      />
    )
  }
  return <PlpLogo className={className} width={width} height={height} alt={alt} responsive={responsive} />
}
