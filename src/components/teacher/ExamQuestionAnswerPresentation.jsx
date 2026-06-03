import {
  identificationDisplayFromQuestion,
  joinIdentificationAnswersList,
  labelForQuestionType,
  parseIdentificationAnswersList,
} from '@/lib/questionTypes.js'

/**
 * Teacher-facing correct-answer presentation (exam detail Questions tab, builder preview).
 * @param {{ question: object, className?: string }} props
 */
export default function ExamQuestionAnswerPresentation({ question, className = '' }) {
  const q = question || {}
  const type = String(q.type || '').toLowerCase()

  if (type === 'identification') {
    const { acceptable, presentation } = identificationDisplayFromQuestion(q)
    const explain = (q.answerExplanation || '').trim()
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
        {explain ? (
          <div className="acsis-exam-answer-key__explain">
            <span className="acsis-exam-answer-key__label">Explain</span>
            <p className="acsis-exam-answer-key__explain-text">{explain}</p>
          </div>
        ) : null}
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
      </div>
    )
  }

  return (
    <div className={`acsis-exam-answer-key${className ? ` ${className}` : ''}`}>
      <div className="acsis-exam-answer-key__row acsis-exam-answer-key__row--primary">
        <span className="acsis-exam-answer-key__label">Answer</span>
        <span className="acsis-exam-answer-key__value">{q.correctAnswer || '—'}</span>
      </div>
    </div>
  )
}

/** @param {string} acceptableRaw comma-separated */
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
    answerExplanation: (explanationRaw || '').trim() || null,
    acceptableAnswers: merged,
  }
}

export { labelForQuestionType, parseIdentificationAnswersList }
