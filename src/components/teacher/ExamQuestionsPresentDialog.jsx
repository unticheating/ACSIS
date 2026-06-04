import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react'
import {
  isCodingQuestionType,
  labelForQuestionType,
  presentAnswerTextFromQuestion,
  presentChoicesForQuestion,
  presentExplanationFromQuestion,
} from '@/components/teacher/ExamQuestionAnswerPresentation.jsx'
import '../../styles/exam-questions-present.css'

function PresentQuestionFront({ questionKey, index, total, question, questionText, imageUrl }) {
  const options = presentChoicesForQuestion(question)

  return (
    <div className="exam-present-face exam-present-face--front">
      <div className="exam-present-meta">
        <span className="exam-present-meta__num">
          Question {index + 1} of {total}
        </span>
        <span className="exam-present-meta__type">{labelForQuestionType(question?.type)}</span>
      </div>
      <div className="exam-present-body">
        <p className="exam-present-question">{questionText}</p>
        {imageUrl ? <img src={imageUrl} alt="" className="exam-present-image" /> : null}
      </div>
      {options.length > 0 ? (
        <ul key={`choices-${questionKey}`} className="exam-present-options" aria-label="Answer choices">
          {options.map((opt, optIndex) => (
            <li key={`${questionKey}-opt-${optIndex}`} className="exam-present-option">
              {opt}
            </li>
          ))}
        </ul>
      ) : (
        <p className="exam-present-hint">Click or press Space to reveal the answer</p>
      )}
    </div>
  )
}

function PresentQuestionBack({ index, total, question, answerText, explanation, isCoding }) {
  return (
    <div className="exam-present-face exam-present-face--back">
      <div className="exam-present-meta">
        <span className="exam-present-meta__num">
          Question {index + 1} of {total}
        </span>
        <span className="exam-present-meta__type">{labelForQuestionType(question?.type)}</span>
      </div>
      <div className="exam-present-back-scroll">
        <div className="exam-present-body exam-present-body--answer">
          <p className="exam-present-answer-label">Answer</p>
          {isCoding ? (
            <pre className="exam-present-answer exam-present-answer--code">{answerText}</pre>
          ) : (
            <p className="exam-present-answer">{answerText}</p>
          )}
        </div>
        {explanation ? (
          <div className="exam-present-explanation">
            <p className="exam-present-explanation-label">Explanation</p>
            <p className="exam-present-explanation-text">{explanation}</p>
          </div>
        ) : null}
      </div>
      <p className="exam-present-hint">Click or press Space to show the question again</p>
    </div>
  )
}

export default function ExamQuestionsPresentDialog({ open, onClose, examTitle, questions }) {
  const shellRef = useRef(null)
  const items = Array.isArray(questions) ? questions : []
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const current = items[index] || null
  const total = items.length
  const questionKey = String(current?.id ?? `q-${index}`)

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
    setFlipped(false)
  }, [])

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(total - 1, i + 1))
    setFlipped(false)
  }, [total])

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f)
  }, [])

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ignore */
      }
    }
    setIsFullscreen(false)
  }, [])

  const enterFullscreen = useCallback(async () => {
    const el = shellRef.current
    if (!el) return
    try {
      await el.requestFullscreen()
      setIsFullscreen(true)
    } catch {
      setIsFullscreen(false)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement === shellRef.current) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }, [enterFullscreen, exitFullscreen])

  useEffect(() => {
    if (!open) return undefined
    setIndex(0)
    setFlipped(false)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const t = window.setTimeout(() => {
      void enterFullscreen()
    }, 0)

    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prevOverflow
      void exitFullscreen()
    }
  }, [open, enterFullscreen, exitFullscreen])

  useEffect(() => {
    setFlipped(false)
  }, [questionKey])

  useEffect(() => {
    if (!open) return undefined

    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === shellRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (document.fullscreenElement === shellRef.current) {
          void exitFullscreen()
        } else {
          onClose?.()
        }
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        void toggleFullscreen()
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        toggleFlip()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, goPrev, goNext, toggleFlip, toggleFullscreen, exitFullscreen, onClose])

  const handleClose = useCallback(async () => {
    await exitFullscreen()
    onClose?.()
  }, [exitFullscreen, onClose])

  if (!open || total === 0) return null

  const questionText = current?.question || current?.question_text || 'Untitled question'
  const answerText = presentAnswerTextFromQuestion(current)
  const explanation = presentExplanationFromQuestion(current)
  const isCoding = isCodingQuestionType(current?.type)

  return (
    <div className="exam-present-overlay" role="presentation" onClick={() => void handleClose()}>
      <div
        ref={shellRef}
        className={`exam-present-shell${isFullscreen ? ' is-fullscreen' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-present-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="exam-present-header">
          <div className="exam-present-header-text">
            <h2 id="exam-present-title" className="exam-present-title">
              Present questions
            </h2>
            {examTitle ? <p className="exam-present-subtitle truncate">{examTitle}</p> : null}
          </div>
          <div className="exam-present-header-actions">
            <button
              type="button"
              className="exam-present-close"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" aria-hidden />
              ) : (
                <Maximize2 className="w-4 h-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="exam-present-close"
              onClick={() => void handleClose()}
              aria-label="Close"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="exam-present-stage">
          <button
            key={questionKey}
            type="button"
            className={`exam-present-card${flipped ? ' is-flipped' : ''}`}
            onClick={toggleFlip}
            aria-label={flipped ? 'Show question' : 'Show answer'}
          >
            <div className="exam-present-card-inner">
              <PresentQuestionFront
                questionKey={questionKey}
                index={index}
                total={total}
                question={current}
                questionText={questionText}
                imageUrl={current?.imageUrl}
              />
              <PresentQuestionBack
                index={index}
                total={total}
                question={current}
                answerText={answerText}
                explanation={explanation}
                isCoding={isCoding}
              />
            </div>
          </button>
        </div>

        <footer className="exam-present-toolbar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="exam-present-icon-btn"
            disabled={index <= 0}
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            aria-label="Previous question"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </button>
          <span className="exam-present-counter">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            className="exam-present-icon-btn"
            disabled={index >= total - 1}
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            aria-label="Next question"
          >
            <ChevronRight className="w-5 h-5" aria-hidden />
          </button>
          <button
            type="button"
            className="exam-present-flip-btn"
            onClick={(e) => {
              e.stopPropagation()
              toggleFlip()
            }}
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            {flipped ? 'Show question' : 'Show answer'}
          </button>
        </footer>
      </div>
    </div>
  )
}
