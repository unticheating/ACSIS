import { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarRange } from 'lucide-react'
import './date-time-picker.css'

function toInputDate(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseInputDate(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatRangeLabel(start, end) {
  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear()
    const startFmt = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: sameYear ? undefined : 'numeric',
    })
    const endFmt = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${startFmt} – ${endFmt}`
  }
  if (start) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – …`
  }
  return ''
}

const RangeTrigger = forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    type="button"
    ref={ref}
    className="exam-audit-logs__date-range-trigger"
    onClick={onClick}
    aria-label={value || placeholder || 'Select date range'}
  >
    <span className={value ? 'exam-audit-logs__date-range-value' : 'exam-audit-logs__date-range-placeholder'}>
      {value || placeholder || 'All dates'}
    </span>
    <CalendarRange className="exam-audit-logs__date-range-icon" aria-hidden="true" />
  </button>
))
RangeTrigger.displayName = 'AuditLogDateRangeTrigger'

/**
 * @param {{
 *   dateFrom?: string,
 *   dateTo?: string,
 *   onChange: (range: { dateFrom: string, dateTo: string }) => void,
 *   placeholder?: string,
 * }} props
 */
export default function AuditLogDateRangePicker({
  dateFrom = '',
  dateTo = '',
  onChange,
  placeholder = 'All dates',
}) {
  const startDate = parseInputDate(dateFrom)
  const endDate = parseInputDate(dateTo)
  const displayValue = formatRangeLabel(startDate, endDate)

  return (
    <DatePicker
      selectsRange
      startDate={startDate}
      endDate={endDate}
      onChange={(update) => {
        const [start, end] = update
        onChange({
          dateFrom: toInputDate(start),
          dateTo: toInputDate(end),
        })
      }}
      isClearable
      dateFormat="MMM d, yyyy"
      placeholderText={placeholder}
      customInput={<RangeTrigger value={displayValue} placeholder={placeholder} />}
      popperClassName="acsis-datepicker-popper"
      wrapperClassName="exam-audit-logs__date-range"
      portalId="root"
    />
  )
}
