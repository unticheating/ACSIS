import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { BUILDER_QUESTION_FORM_TYPES } from '@/lib/questionTypes.js'
import { QuestionTypeIcon } from '@/components/exam/QuestionTypeIcon.jsx'

/**
 * @param {{
 *   value: string,
 *   onChange: (value: string) => void,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export default function SectionQuestionTypePicker({ value, onChange, disabled = false, className = '' }) {
  const current = BUILDER_QUESTION_FORM_TYPES.find((t) => t.value === value) || BUILDER_QUESTION_FORM_TYPES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          className={`exam-builder-set-type-picker h-10 justify-between gap-2 font-semibold text-base px-3 ${className}`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <QuestionTypeIcon formType={current.value} size={16} className="shrink-0 text-primary" />
            <span className="truncate">{current.label}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem]">
        {BUILDER_QUESTION_FORM_TYPES.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
            className={option.value === value ? 'bg-primary/10 text-primary' : undefined}
          >
            <QuestionTypeIcon formType={option.value} size={16} className="mr-2 text-primary" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
