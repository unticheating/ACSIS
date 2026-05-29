import {
  CLASS_HEADER_PATTERN_LABELS,
  CLASS_HEADER_PATTERNS,
  normalizeHeaderPattern,
} from '@/lib/classCardPatterns.js'
import { headerColorStyle } from '@/lib/classHeaderColor.js'

/**
 * @param {{
 *   value?: string,
 *   onChange: (pattern: string) => void,
 *   disabled?: boolean,
 *   previewColor?: string | null,
 * }} props
 */
export default function ClassPatternPicker({ value, onChange, disabled = false, previewColor = null }) {
  const current = normalizeHeaderPattern(value)
  const swatchStyle = headerColorStyle(previewColor)

  return (
    <div className="acsis-pattern-picker" role="radiogroup" aria-label="Class background pattern">
      {CLASS_HEADER_PATTERNS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={current === id}
          disabled={disabled}
          className={`acsis-pattern-picker__option${current === id ? ' acsis-pattern-picker__option--on' : ''}`}
          onClick={() => onChange(id)}
        >
          <span
            className="acsis-pattern-picker__swatch"
            data-pattern={id}
            style={swatchStyle}
            aria-hidden
          />
          <span className="acsis-pattern-picker__label">{CLASS_HEADER_PATTERN_LABELS[id] || id}</span>
        </button>
      ))}
    </div>
  )
}
