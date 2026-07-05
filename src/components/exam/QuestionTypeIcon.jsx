import {
  AlignLeft,
  ArrowLeftRight,
  CheckSquare,
  Code,
  ListChecks,
  Shapes,
  Type,
} from 'lucide-react'
import {
  BUILDER_QUESTION_FORM_TYPES,
  formTypeFromQuestionType,
  labelForFormType,
  labelForQuestionType,
} from '@/lib/questionTypes.js'

const ICON_BY_LABEL = {
  'Multiple choice': ListChecks,
  'Multiple Choice': ListChecks,
  Identification: Type,
  'True / False': CheckSquare,
  Coding: Code,
  Matching: ArrowLeftRight,
  'Essay / Paragraph': AlignLeft,
  Diagramming: Shapes,
}

/**
 * @param {string | null | undefined} label
 */
export function iconComponentForQuestionTypeLabel(label) {
  if (!label) return null
  return ICON_BY_LABEL[label] || ICON_BY_LABEL[labelForQuestionType(label)] || null
}

/**
 * @param {string | null | undefined} formType
 */
export function iconComponentForFormType(formType) {
  return iconComponentForQuestionTypeLabel(labelForFormType(formType))
}

/**
 * @param {{
 *   formType?: string | null,
 *   type?: string | null,
 *   label?: string | null,
 *   size?: number,
 *   className?: string,
 *   style?: import('react').CSSProperties,
 * }} props
 */
export function QuestionTypeIcon({ formType, type, label, size = 14, className, style }) {
  const resolvedLabel =
    label ||
    (formType ? labelForFormType(formType) : null) ||
    (type ? labelForQuestionType(type) : null)
  const Icon = iconComponentForQuestionTypeLabel(resolvedLabel)
  if (!Icon) return null
  return <Icon size={size} className={className} style={style} aria-hidden />
}

export { BUILDER_QUESTION_FORM_TYPES, formTypeFromQuestionType }
