import ClassPatternPicker from '@/components/classes/ClassPatternPicker.jsx'
import { CLASS_HEADER_COLOR_PRESETS, normalizeHeaderColor } from '@/lib/classHeaderColor.js'

/**
 * @param {{
 *   pattern: string,
 *   onPatternChange: (pattern: string) => void,
 *   color: string | null,
 *   onColorChange: (color: string | null) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function ClassHeaderAppearancePicker({
  pattern,
  onPatternChange,
  color,
  onColorChange,
  disabled = false,
}) {
  const normalized = normalizeHeaderColor(color)
  const customHex = normalized || '#2563eb'
  const presetOn = (value) => {
    if (value === null) return normalized === null
    return normalized === value?.toLowerCase()
  }

  return (
    <div className="acsis-appearance-picker">
      <div className="acsis-appearance-picker__section">
        <p className="acsis-appearance-picker__heading">Background color</p>
        <div className="acsis-color-picker" role="radiogroup" aria-label="Header background color">
          {CLASS_HEADER_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={presetOn(preset.value)}
              disabled={disabled}
              className={`acsis-color-picker__chip${presetOn(preset.value) ? ' acsis-color-picker__chip--on' : ''}`}
              onClick={() => onColorChange(preset.value)}
            >
              <span
                className="acsis-color-picker__swatch"
                style={
                  preset.value
                    ? { backgroundColor: preset.value }
                    : { background: 'var(--acsis-brand, #2563eb)' }
                }
                aria-hidden
              />
              <span className="acsis-color-picker__label">{preset.label}</span>
            </button>
          ))}
        </div>
        <label className="acsis-color-picker__custom">
          <span className="acsis-color-picker__custom-label">Custom</span>
          <input
            type="color"
            value={customHex}
            disabled={disabled}
            onChange={(e) => onColorChange(e.target.value)}
            aria-label="Custom header color"
          />
        </label>
      </div>

      <div className="acsis-appearance-picker__section">
        <p className="acsis-appearance-picker__heading">Pattern</p>
        <ClassPatternPicker
          value={pattern}
          onChange={onPatternChange}
          disabled={disabled}
          previewColor={color}
        />
      </div>
    </div>
  )
}
