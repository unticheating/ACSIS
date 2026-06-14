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
import '../../styles/exam-questions-present.css'

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

function PresentQuestionBack({ index, total, question, answerText, explanation, isCoding, isDiagramming, isFullscreen }) {
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
          ) : isDiagramming ? (
            <div
              className="exam-present-answer--diagram w-full rounded-md overflow-hidden border border-border/50"
              style={{ height: isFullscreen ? 'min(55vh, 600px)' : 300 }}
            >
              <DiagramEditor
                variant={question?.diagramVariant || question?.options?.[0] || 'flowchart'}
                value={answerText}
                readOnly={true}
                height="100%"
              />
            </div>
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
  }, [open, goPrev, goNext, toggleFlip, toggleFullscreen, exitFullscreen, onClose, studentsPanelOpen])

  const handleClose = useCallback(async () => {
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
            onClick={toggleFlip}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
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
                isFullscreen={isFullscreen}
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
      </div>
    </div>
  )
}
