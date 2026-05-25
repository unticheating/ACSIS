import React, { forwardRef, useMemo } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils.js'

import './date-time-picker.css'

const CustomInput = forwardRef(({ value, onClick, placeholder, className }, ref) => (
  <div
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 items-center justify-between cursor-pointer',
      className,
    )}
    onClick={onClick}
    ref={ref}
  >
    <span className={cn('text-sm', !value && 'text-muted-foreground')}>
      {value || placeholder || 'Pick a date & time'}
    </span>
    <CalendarIcon className="h-4 w-4 text-muted-foreground opacity-50" />
  </div>
))
CustomInput.displayName = 'CustomInput'

function isSameCalendarDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Earliest allowed moment from disablePast and/or minDateTime. */
function resolveEarliestMin(disablePast, minDateTime) {
  const candidates = []
  if (disablePast) candidates.push(new Date())
  if (minDateTime != null) {
    const m = new Date(minDateTime)
    if (!Number.isNaN(m.getTime())) candidates.push(m)
  }
  if (candidates.length === 0) return null
  return candidates.reduce((latest, d) => (d > latest ? d : latest))
}

/**
 * @param {object} props
 * @param {Date | string | null} [props.value]
 * @param {(date: Date | null) => void} [props.onChange]
 * @param {boolean} [props.disablePast] Block dates and times before now
 * @param {Date | string | null} [props.minDateTime] Earliest selectable moment (e.g. end after start)
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder,
  className,
  disablePortal,
  disablePast = false,
  minDateTime = null,
}) {
  const selectedDate = value ? new Date(value) : null
  const earliestMin = useMemo(
    () => resolveEarliestMin(disablePast, minDateTime),
    [disablePast, minDateTime],
  )

  const minDate = earliestMin ? startOfDay(earliestMin) : undefined

  const minTime = earliestMin
    ? (() => {
        const base = selectedDate || new Date()
        return isSameCalendarDay(base, earliestMin) ? earliestMin : startOfDay(base)
      })()
    : undefined

  const maxTime = endOfDay(selectedDate || new Date())

  const handleChange = (date) => {
    if (!date) {
      onChange?.(null)
      return
    }
    let next = date
    if (earliestMin && next < earliestMin) {
      next = new Date(earliestMin)
    }
    onChange?.(next)
  }

  return (
    <DatePicker
      selected={selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate : null}
      onChange={handleChange}
      showTimeInput
      timeInputLabel="Time:"
      dateFormat="MMMM d, yyyy h:mm aa"
      placeholderText={placeholder}
      customInput={<CustomInput className={className} />}
      popperClassName="acsis-datepicker-popper"
      wrapperClassName="w-full"
      portalId={disablePortal ? undefined : 'root'}
      minDate={minDate}
      minTime={minTime}
      maxTime={maxTime}
    />
  )
}
