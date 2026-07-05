import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react'
import {
  isCodingQuestionType,
  labelForQuestionType,
  presentAnswerTextFromQuestion,
  presentChoicesForQuestion,
  presentExplanationFromQuestion,
} from '@/components/teacher/ExamQuestionAnswerPresentation.jsx'
import DiagramEditor from '@/components/exam/DiagramEditor.jsx'
import { diagramReferenceFromQuestion } from '@/lib/diagramQuestion.js'
import '../../styles/exam-questions-present.css'

function diagramVariantFromQuestion(question) {
  return question?.diagramVariant || question?.options?.[0] || 'flowchart'
}

function stopCardFlip(e) {
  e.stopPropagation()
}

function PresentDiagramPanel({ question, onExpand, className = '' }) {
  const variant = diagramVariantFromQuestion(question)
  const value = diagramReferenceFromQuestion(question)

  return (
    <div
      className={`exam-present-answer--diagram exam-present-no-flip ${className}`.trim()}
      onClick={stopCardFlip}
      onPointerDown={stopCardFlip}
      role="presentation"
    >
      <button
        type="button"
        className="exam-present-diagram-expand-btn"
        onClick={(e) => {
          stopCardFlip(e)
          onExpand?.()
        }}
        aria-label="Expand diagram"
        title="Expand diagram"
      >
        <Maximize2 className="w-4 h-4" aria-hidden />
      </button>
      <DiagramEditor variant={variant} value={value || ''} readOnly height="100%" />
    </div>
  )
}

function PresentDiagramExpandOverlay({ question, onClose }) {
  const variant = diagramVariantFromQuestion(question)
  const value = diagramReferenceFromQuestion(question)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div
      className="exam-present-diagram-overlay exam-present-no-flip"
      role="dialog"
      aria-modal="true"
      aria-label="Expanded diagram"
      onClick={onClose}
    >
      <div className="exam-present-diagram-overlay__panel" onClick={stopCardFlip}>
        <header className="exam-present-diagram-overlay__header">
          <p className="exam-present-diagram-overlay__title">Reference diagram</p>
          <button
            type="button"
            className="exam-present-close"
            onClick={onClose}
            aria-label="Close expanded diagram"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>
        <div className="exam-present-diagram-overlay__canvas">
          <DiagramEditor variant={variant} value={value || ''} readOnly height="100%" />
        </div>
      </div>
    </div>
  )
}

function formatStudentsCorrectPhrase(correctCount, submittedCount) {
  if (!submittedCount) return 'No submissions yet'
  if (correctCount === 1) return '1 student answered correctly'
  return `${correctCount} students answered correctly`
}

function questionStatForQuestion(questionStats, questionId) {
  if (!Array.isArray(questionStats) || questionId == null) return null
  return questionStats.find((s) => Number(s.questionId) === Number(questionId)) || null
}

function studentResponseLabel(isCorrect) {
  if (isCorrect === true) return 'Correct'
  if (isCorrect === false) return 'Incorrect'
  return 'Pending review'
}

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

function PresentQuestionBack({
  index,
  total,
  question,
  answerText,
  explanation,
  isCoding,
  isDiagramming,
  onExpandDiagram,
}) {
  return (
    <div className={`exam-present-face exam-present-face--back${isDiagramming ? ' exam-present-face--diagram' : ''}`}>
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
          ) : isDiagramming ? (
            <PresentDiagramPanel question={question} onExpand={onExpandDiagram} />
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
      <p className="exam-present-hint">
        {isDiagramming
          ? 'Expand the diagram to pan and zoom · Use the toolbar to flip'
          : 'Click or press Space to show the question again'}
      </p>
    </div>
  )
}

export default function ExamQuestionsPresentDialog({
  open,
  onClose,
  examTitle,
  questions,
  questionStats = [],
  submittedCount = 0,
}) {
  const shellRef = useRef(null)
  const items = Array.isArray(questions) ? questions : []
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [diagramExpanded, setDiagramExpanded] = useState(false)
  const [studentsPanelOpen, setStudentsPanelOpen] = useState(false)
  const studentsPanelRef = useRef(null)

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

  const handleCardClick = useCallback(
    (e) => {
      if (e.target.closest('.exam-present-no-flip')) return
      toggleFlip()
    },
    [toggleFlip],
  )

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
    setStudentsPanelOpen(false)
    setDiagramExpanded(false)
  }, [questionKey])

  useEffect(() => {
    if (!studentsPanelOpen) return undefined

    function onPointerDown(e) {
      if (studentsPanelRef.current?.contains(e.target)) return
      setStudentsPanelOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [studentsPanelOpen])

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
      if (diagramExpanded) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setDiagramExpanded(false)
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (studentsPanelOpen) {
          setStudentsPanelOpen(false)
          return
        }
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
        const onDiagramBack =
          flipped && String(items[index]?.type || '').toLowerCase() === 'diagramming'
        if (onDiagramBack) return
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
  }, [open, goPrev, goNext, toggleFlip, toggleFullscreen, exitFullscreen, onClose, studentsPanelOpen, diagramExpanded, flipped, index, items])

  const handleClose = useCallback(async () => {
    setDiagramExpanded(false)
    await exitFullscreen()
    onClose?.()
  }, [exitFullscreen, onClose])

  if (!open || total === 0) return null

  const questionText = current?.question || current?.question_text || 'Untitled question'
  const answerText = presentAnswerTextFromQuestion(current)
  const explanation = presentExplanationFromQuestion(current)
  const isCoding = isCodingQuestionType(current?.type)
  const isDiagramming = String(current?.type || '').toLowerCase() === 'diagramming'
  const currentQuestionStat = questionStatForQuestion(questionStats, current?.id)
  const correctCount = Number(currentQuestionStat?.correctCount || 0)
  const studentsCorrectPhrase = formatStudentsCorrectPhrase(correctCount, submittedCount)
  const questionStudents = currentQuestionStat?.students || []
  const canShowStudents = submittedCount > 0 && questionStudents.length > 0

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
          <div
            key={questionKey}
            className={`exam-present-card${flipped ? ' is-flipped' : ''}`}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.target.closest('.exam-present-no-flip')) return
              if (e.key === 'Enter' || e.key === ' ') {
                if (flipped && isDiagramming) return
                e.preventDefault()
                toggleFlip()
              }
            }}
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
                isDiagramming={isDiagramming}
                onExpandDiagram={() => setDiagramExpanded(true)}
              />
            </div>
          </div>
        </div>

        <footer className="exam-present-toolbar" onClick={(e) => e.stopPropagation()}>
          <div className="exam-present-toolbar__nav">
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
          </div>
          <div className="exam-present-toolbar__stat-wrap" ref={studentsPanelRef}>
            <button
              type="button"
              className="exam-present-toolbar__stat"
              aria-live="polite"
              aria-expanded={studentsPanelOpen}
              aria-haspopup="dialog"
              disabled={!canShowStudents}
              onClick={(e) => {
                e.stopPropagation()
                if (!canShowStudents) return
                setStudentsPanelOpen((open) => !open)
              }}
            >
              {studentsCorrectPhrase}
            </button>
            {studentsPanelOpen && canShowStudents ? (
              <div className="exam-present-students-panel" role="dialog" aria-label="Student responses">
                <p className="exam-present-students-panel__title">Student responses</p>
                <ul className="exam-present-students-panel__list">
                  {questionStudents.map((student, studentIndex) => (
                    <li
                      key={`${student.schoolId || student.studentName}-${studentIndex}`}
                      className={`exam-present-students-panel__item${
                        student.isCorrect === true
                          ? ' is-correct'
                          : student.isCorrect === false
                            ? ' is-incorrect'
                            : ' is-pending'
                      }`}
                    >
                      <span className="exam-present-students-panel__name">{student.studentName}</span>
                      {student.schoolId ? (
                        <span className="exam-present-students-panel__id">{student.schoolId}</span>
                      ) : null}
                      <span className="exam-present-students-panel__status">
                        {studentResponseLabel(student.isCorrect)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
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
        {diagramExpanded && isDiagramming ? (
          <PresentDiagramExpandOverlay
            question={current}
            onClose={() => setDiagramExpanded(false)}
          />
        ) : null}
      </div>
    </div>
  )
}
