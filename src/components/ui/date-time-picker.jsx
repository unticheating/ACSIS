import React, { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils.js'

// Simple custom CSS override for react-datepicker to make it look more modern/shadcn-like
import './date-time-picker.css'

const CustomInput = forwardRef(({ value, onClick, placeholder, className }, ref) => (
  <div
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 items-center justify-between cursor-pointer",
      className
    )}
    onClick={onClick}
    ref={ref}
  >
    <span className={cn("text-sm", !value && "text-muted-foreground")}>
      {value || placeholder || "Pick a date & time"}
    </span>
    <CalendarIcon className="h-4 w-4 text-muted-foreground opacity-50" />
  </div>
))
CustomInput.displayName = 'CustomInput'

export function DateTimePicker({ value, onChange, placeholder, className, disablePortal }) {
  const selectedDate = value ? new Date(value) : null

  const handleChange = (date) => {
    onChange(date ? date.toISOString() : '')
  }

  return (
    <DatePicker
      selected={selectedDate}
      onChange={handleChange}
      showTimeInput
      timeInputLabel="Time:"
      dateFormat="MMMM d, yyyy h:mm aa"
      placeholderText={placeholder}
      customInput={<CustomInput className={className} />}
      popperClassName="acsis-datepicker-popper"
      wrapperClassName="w-full"
      portalId={disablePortal ? undefined : 'root'}
    />
  )
}
