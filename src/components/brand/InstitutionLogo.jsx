import { Landmark } from 'lucide-react'

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
  return (
    <div 
      className={`flex items-center justify-center bg-gray-100 rounded-md text-gray-400 ${className}`} 
      style={{ width, height, minWidth: width, minHeight: height }}
    >
      <Landmark size={width * 0.55} />
    </div>
  )
}
