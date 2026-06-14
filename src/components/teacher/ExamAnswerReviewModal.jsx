import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize } from 'lucide-react'
import DiagramEditor from '@/components/exam/DiagramEditor.jsx'
import { fetchTeacherExamSessionDetail } from '@/lib/teacherExamResultsApi.js'
import { manualGradeAnswer } from '@/lib/teacherExamGradingApi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { formatReviewAnswerText, labelForQuestionType } from '@/lib/questionTypes.js'
import '../../styles/exam-answer-review.css'

function questionTypeShort(type) {
  const label = labelForQuestionType(type)
  if (label === 'Multiple choice') return 'MCQ'
  if (label === 'True / False') return 'T/F'
  if (label === 'Coding') return 'Code'
  return 'ID'
}

export default function ExamAnswerReviewModal({
  classId,
  examId,
  examTitle,
  submittedSessions,
  initialSessionId,
  onClose,
  onUpdated,
}) {
  const queue = useMemo(
    () =>
      [...submittedSessions].sort((a, b) =>
        String(a.studentName || '').localeCompare(String(b.studentName || '')),
      ),
    [submittedSessions],
  )

  const initialIndex = Math.max(
    0,
    queue.findIndex((s) => s.sessionId === initialSessionId),
  )

  const [studentIndex, setStudentIndex] = useState(initialIndex)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [answers, setAnswers] = useState([])
  const [sessionMeta, setSessionMeta] = useState(null)
  const [expandedDiagram, setExpandedDiagram] = useState(null)

  const currentStudent = queue[studentIndex] || null
  const reviewedCount = answers.filter((a) => a.manuallyChecked).length

  const loadSession = useCallback(async () => {
    if (!currentStudent?.sessionId) return
    setLoading(true)
    try {
      const data = await fetchTeacherExamSessionDetail(classId, examId, currentStudent.sessionId)
      setAnswers(data.answers || [])
      setSessionMeta(data.session || null)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to load answers.')
      setAnswers([])
    } finally {
      setLoading(false)
    }
  }, [classId, examId, currentStudent?.sessionId])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  async function gradeAnswer(answer, isCorrect) {
    if (!currentStudent || savingId != null) return
    setSavingId(answer.id)
    try {
      const data = await manualGradeAnswer(
        classId,
        examId,
        currentStudent.sessionId,
        answer.id,
        isCorrect,
      )
      setAnswers(data.answers || [])
      setSessionMeta(data.session || sessionMeta)
      acsisToastSuccess('Saved.')
      onUpdated?.(data)
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSavingId(null)
    }
  }

  function selectStudent(idx) {
    if (idx >= 0 && idx < queue.length) setStudentIndex(idx)
  }

  const showScore = sessionMeta?.percentage != null

  return (
    <div className="exam-review-overlay" role="presentation" onClick={onClose}>
      <div
        className="exam-review-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="exam-review-header">
          <div className="exam-review-header-text">
            <h2 id="exam-review-title" className="exam-review-title">
              Review answers
            </h2>
            <p className="exam-review-subtitle truncate">{examTitle}</p>
          </div>
          <button type="button" className="exam-review-close" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="exam-review-toolbar">
          <button
            type="button"
            className="exam-review-icon-btn"
            disabled={studentIndex <= 0}
            onClick={() => selectStudent(studentIndex - 1)}
            aria-label="Previous student"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            className="exam-review-select"
            value={studentIndex}
            onChange={(e) => selectStudent(Number(e.target.value))}
          >
            {queue.map((s, idx) => (
              <option key={s.sessionId} value={idx}>
                {s.studentName} ({s.schoolId || '—'})
              </option>
            ))}
          </select>

          <button
            type="button"
            className="exam-review-icon-btn"
            disabled={studentIndex >= queue.length - 1}
            onClick={() => selectStudent(studentIndex + 1)}
            aria-label="Next student"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {showScore ? (
            <span className="exam-review-score-chip">
              {sessionMeta.percentage}%
              {sessionMeta.rank != null ? ` · #${sessionMeta.rank}` : ''}
            </span>
          ) : null}
        </div>

        <div className="exam-review-scroll">
          {loading ? (
            <p className="exam-review-empty">Loading…</p>
          ) : !currentStudent ? (
            <p className="exam-review-empty">No submissions.</p>
          ) : answers.length === 0 ? (
            <p className="exam-review-empty">No answers recorded.</p>
          ) : (
            <>
              <p className="exam-review-meta">
                {currentStudent.studentName} · {answers.length} question
                {answers.length === 1 ? '' : 's'}
                {reviewedCount < answers.length
                  ? ` · ${reviewedCount} manually checked (optional)`
                  : null}
              </p>
              <ul className="exam-review-answer-list">
                {answers.map((a, idx) => {
                  const isIdent = String(a.questionType || '').toLowerCase() === 'identification'
                  const isDiagram = String(a.questionType || '').toLowerCase() === 'diagramming'
                  const answerDisplay = formatReviewAnswerText(a.questionType, a.answer)
                  const keyDisplay = a.expectedAnswer
                    ? formatReviewAnswerText(a.questionType, a.expectedAnswer)
                    : null
                  return (
                  <li key={a.id} className="exam-review-answer-item">
                    <div className="exam-review-answer-head">
                      <span className="exam-review-num">{idx + 1}</span>
                      <span className="exam-review-type">{questionTypeShort(a.questionType)}</span>
                      <span
                        className={`exam-review-status ${
                          a.isCorrect ? 'correct' : a.isCorrect === false ? 'incorrect' : 'pending'
                        }`}
                      >
                        {a.isCorrect === true ? 'Correct' : a.isCorrect === false ? 'Wrong' : '—'}
                      </span>
                    </div>
                    <p className="exam-review-q-text">{a.questionText}</p>
                    <div className="exam-review-row">
                      <span className="exam-review-k">Answer:</span>
                      {isDiagram ? (
                        <div className="relative border border-border rounded w-full mt-2 overflow-hidden group">
                          <DiagramEditor value={a.answer} readOnly height={180} />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-background/90 text-foreground p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm hover:bg-muted"
                            onClick={() => setExpandedDiagram({ title: 'Student Answer', value: a.answer })}
                            aria-label="Expand Diagram"
                          >
                            <Maximize className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`exam-review-v${isIdent ? ' exam-review-v--ident' : ''}`}>
                          {answerDisplay}
                        </span>
                      )}
                    </div>
                    {keyDisplay && !isDiagram ? (
                      <div className="exam-review-row muted flex-col items-start gap-1">
                        <span className="exam-review-k">Key:</span>
                        <span className={`exam-review-v${isIdent ? ' exam-review-v--ident' : ''}`}>
                          {keyDisplay}
                        </span>
                      </div>
                    ) : null}
                    <div className="exam-review-actions">
                      <button
                        type="button"
                        className="exam-review-btn-sm incorrect"
                        disabled={savingId === a.id}
                        onClick={() => void gradeAnswer(a, false)}
                      >
                        Wrong
                      </button>
                      <button
                        type="button"
                        className="exam-review-btn-sm correct"
                        disabled={savingId === a.id}
                        onClick={() => void gradeAnswer(a, true)}
                      >
                        Correct
                      </button>
                    </div>
                  </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {expandedDiagram && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setExpandedDiagram(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">{expandedDiagram.title}</h3>
              <button
                type="button"
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setExpandedDiagram(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <DiagramEditor value={expandedDiagram.value} readOnly height="100%" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
