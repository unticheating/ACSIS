import {
  identificationDisplayFromQuestion,
  joinIdentificationAnswersList,
  labelForQuestionType,
  parseIdentificationAnswersList,
} from '@/lib/questionTypes.js'
import DiagramEditor from '@/components/exam/DiagramEditor.jsx'

function AnswerExplanationBlock({ text }) {
  const explain = (text || '').trim()
  if (!explain) return null
  return (
    <div className="acsis-exam-answer-key__explain">
      <span className="acsis-exam-answer-key__label">Explain</span>
      <p className="acsis-exam-answer-key__explain-text line-clamp-3" title={explain}>{explain}</p>
    </div>
  )
}

/**
 * Teacher-facing correct-answer presentation (exam detail Questions tab, builder preview).
 * @param {{ question: object, className?: string }} props
 */
export default function ExamQuestionAnswerPresentation({ question, className = '' }) {
  const q = question || {}
  const type = String(q.type || '').toLowerCase()

  if (type === 'identification') {
    const { acceptable, presentation } = identificationDisplayFromQuestion(q)
    return (
      <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
        <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
          <span className="acsis-exam-answer-key__label">Presentation answer</span>
          <span className="acsis-exam-answer-key__value">{presentation || '—'}</span>
        </div>
        {acceptable.length > 1 ? (
          <div className="acsis-exam-answer-key__row">
            <span className="acsis-exam-answer-key__label">Also accepted</span>
            <span className="acsis-exam-answer-key__chips">
              {acceptable
                .filter((a) => a !== presentation)
                .map((a) => (
                  <span key={a} className="acsis-exam-answer-key__chip">
                    {a}
                  </span>
                ))}
            </span>
          </div>
        ) : null}
        <AnswerExplanationBlock text={q.answerExplanation} />
      </div>
    )
  }

  if (type === 'multiple-choice' || type === 'multiple' || type === 'mcq') {
    const opts = Array.isArray(q.options) ? q.options : []
    const correct = q.correctAnswer || opts.find((_, i) => q._choicesMeta?.[i]?.isCorrect) || ''
    return (
      <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
        <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
          <span className="acsis-exam-answer-key__label">Correct option</span>
          <span className="acsis-exam-answer-key__value">{correct || '—'}</span>
        </div>
        <AnswerExplanationBlock text={q.answerExplanation} />
      </div>
    )
  }

  if (type === 'coding') {
    return (
      <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
        {q.options?.[0] ? (
          <div className="acsis-exam-answer-key__row">
            <span className="acsis-exam-answer-key__label">Language</span>
            <span className="acsis-exam-answer-key__chip">{q.options[0]}</span>
          </div>
        ) : null}
        <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
          <span className="acsis-exam-answer-key__label">Expected solution</span>
          <pre className="acsis-exam-answer-key__code">{q.correctAnswer || '—'}</pre>
        </div>
        <AnswerExplanationBlock text={q.answerExplanation} />
      </div>
    )
  }

  if (type === 'matching') {
    const pairs = Array.isArray(q.matchingPairs) && q.matchingPairs.length
      ? q.matchingPairs
      : []
    return (
      <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
        <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
          <span className="acsis-exam-answer-key__label">Correct matches</span>
          <div className="space-y-1">
            {pairs.length ? (
              pairs.map((pair, idx) => (
                <div key={`${pair.left}-${idx}`} className="text-sm">
                  <span className="font-medium">{pair.left}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{pair.right}</span>
                </div>
              ))
            ) : (
              <span className="acsis-exam-answer-key__value">—</span>
            )}
          </div>
        </div>
        <AnswerExplanationBlock text={q.answerExplanation} />
      </div>
    )
  }

  if (type === 'essay') {
    return (
      <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
        <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
          <span className="acsis-exam-answer-key__label">Sample / rubric</span>
          <p className="acsis-exam-answer-key__value whitespace-pre-wrap line-clamp-4" title={q.correctAnswer}>{q.correctAnswer || 'Manual grading'}</p>
        </div>
        <AnswerExplanationBlock text={q.answerExplanation} />
      </div>
    )
  }

  if (type === 'diagramming') {
    return (
      <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
        <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <span className="acsis-exam-answer-key__label">Diagram Reference</span>
            <span className="acsis-exam-answer-key__chip">{q.diagramVariant || q.options?.[0] || 'flowchart'}</span>
          </div>
          <div className="w-full h-[250px] rounded-md overflow-hidden border border-border/50">
            <DiagramEditor
              variant={q.diagramVariant || q.options?.[0] || 'flowchart'}
              value={q.correctAnswer || ''}
              readOnly={true}
              height={250}
            />
          </div>
        </div>
        <AnswerExplanationBlock text={q.answerExplanation} />
      </div>
    )
  }

  return (
    <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
      <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
        <span className="acsis-exam-answer-key__label">Answer</span>
        <span className="acsis-exam-answer-key__value">{q.correctAnswer || '—'}</span>
      </div>
      <AnswerExplanationBlock text={q.answerExplanation} />
    </div>
  )
}

/** @param {string} acceptableRaw comma-separated */
export function buildAnswerExplanationField(explanationRaw) {
  return { answerExplanation: (explanationRaw || '').trim() || null }
}

export function buildIdentificationQuestionFields(acceptableRaw, presentationRaw, explanationRaw) {
  const acceptable = parseIdentificationAnswersList(acceptableRaw)
  const presentation =
    (presentationRaw || '').trim().toUpperCase() || acceptable[0] || ''
  let merged = acceptable
  if (presentation && !merged.includes(presentation)) {
    merged = [presentation, ...merged]
  }
  return {
    correctAnswer: joinIdentificationAnswersList(merged),
    presentationAnswer: presentation,
    ...buildAnswerExplanationField(explanationRaw),
    acceptableAnswers: merged,
  }
}

/** Primary answer text for teacher presentation / flashcard back face. */
export function presentAnswerTextFromQuestion(question) {
  const q = question || {}
  const type = String(q.type || '').toLowerCase()

  if (type === 'identification') {
    const { presentation } = identificationDisplayFromQuestion(q)
    return presentation || '—'
  }

  if (type === 'multiple-choice' || type === 'multiple' || type === 'mcq') {
    const opts = Array.isArray(q.options) ? q.options : []
    const correct = q.correctAnswer || opts.find((_, i) => q._choicesMeta?.[i]?.isCorrect) || ''
    return correct || '—'
  }

  if (type === 'coding') {
    return q.correctAnswer || '—'
  }

  return q.correctAnswer || '—'
}

/** Optional explanation shown under the answer in presentation mode. */
export function presentExplanationFromQuestion(question) {
  return String(question?.answerExplanation || '').trim()
}

export function isCodingQuestionType(type) {
  return String(type || '').toLowerCase() === 'coding'
}

export function isMultipleChoiceQuestionType(type) {
  const t = String(type || '').toLowerCase()
  return t === 'multiple-choice' || t === 'multiple' || t === 'mcq'
}

export function isTrueFalseQuestionType(type) {
  const t = String(type || '').toLowerCase()
  return t === 'truefalse' || t === 'true_false'
}

/** Choices shown on the presentation card front (MCQ grid or True/False). */
export function presentChoicesForQuestion(question) {
  const q = question || {}
  const type = String(q.type || '').toLowerCase()

  if (isMultipleChoiceQuestionType(type)) {
    return (Array.isArray(q.options) ? q.options : [])
      .map((o) => String(o ?? '').trim())
      .filter(Boolean)
  }

  if (isTrueFalseQuestionType(type)) {
    const fromApi = (Array.isArray(q.options) ? q.options : [])
      .map((o) => String(o ?? '').trim())
      .filter(Boolean)
    if (fromApi.length >= 2) return fromApi.slice(0, 2)
    return ['True', 'False']
  }

  return []
}

export { labelForQuestionType, parseIdentificationAnswersList }
