import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize } from 'lucide-react'
import DiagramEditor from '@/components/exam/DiagramEditor.jsx'
import { fetchTeacherExamSessionDetail } from '@/lib/teacherExamResultsApi.js'
import { manualGradeAnswer } from '@/lib/teacherExamGradingApi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { formatReviewAnswerText, labelForQuestionType } from '@/lib/questionTypes.js'

function questionTypeShort(type) {
  const label = labelForQuestionType(type)
  if (label === 'Multiple choice') return 'MCQ'
  if (label === 'True / False') return 'T/F'
  if (label === 'Coding') return 'Code'
  if (label === 'Matching') return 'Match'
  if (label === 'Essay / Paragraph') return 'Essay'
  if (label === 'Diagramming') return 'Diagram'
  return 'ID'
}

function AnswerItem({ a, idx, savingId, gradeAnswer, setExpandedDiagram }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isIdent = String(a.questionType || '').toLowerCase() === 'identification';
  const isDiagram = String(a.questionType || '').toLowerCase() === 'diagramming';
  const isMatching = String(a.questionType || '').toLowerCase() === 'matching';
  const answerDisplay = formatReviewAnswerText(a.questionType, a.answer);
  // For matching, merge all correct choice pairs into one display block
  const keyDisplay = isMatching
    ? (() => {
        const allPairs = [a.expectedAnswer, ...(a.possibleAnswers || [])].filter(Boolean);
        return allPairs.map(p => formatReviewAnswerText(a.questionType, p)).join('\n') || null;
      })()
    : a.expectedAnswer ? formatReviewAnswerText(a.questionType, a.expectedAnswer) : null;
  
  const gradeVal = a.isCorrect === true ? 'correct' : a.isCorrect === false ? 'wrong' : 'pending';
  
  const colors = {
    correct: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    wrong: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20',
    pending: 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
  };
  
  return (
    <li className={`py-4 border-b border-border last:border-0 relative ${menuOpen ? 'z-50' : 'z-0'}`}>
      <div className={`flex items-start justify-between gap-4 mb-2 relative ${menuOpen ? 'z-50' : 'z-10'}`}>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-muted text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            {questionTypeShort(a.questionType)}
          </span>
        </div>
        
        <div className={`relative shrink-0 ${menuOpen ? 'z-50' : 'z-10'}`}>
          <button 
            type="button"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${colors[gradeVal]} ${savingId === a.id ? 'opacity-50 cursor-wait' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            disabled={savingId === a.id}
          >
            {gradeVal === 'correct' ? 'Correct' : gradeVal === 'wrong' ? 'Wrong' : 'Pending'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform opacity-70 ${menuOpen ? 'rotate-180' : ''}`}>
               <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-md border border-border bg-card shadow-md overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 z-50">
              <button 
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                onClick={() => { setMenuOpen(false); void gradeAnswer(a, true); }}
              >
                Mark Correct
              </button>
              <button 
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors text-destructive"
                onClick={() => { setMenuOpen(false); void gradeAnswer(a, false); }}
              >
                Mark Wrong
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="pl-7 pr-1">
        <p className="text-sm font-medium text-foreground mb-3 leading-snug">{a.questionText}</p>
        
        <div className="grid gap-2 text-sm">
          <div className="flex gap-3">
            <span className="text-muted-foreground w-12 shrink-0">Answer:</span>
            {isDiagram ? (
              <div className="relative border border-border rounded-md w-full max-w-sm overflow-hidden group bg-background">
                <DiagramEditor value={a.answer} readOnly height={140} />
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 bg-background/90 text-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm hover:bg-muted"
                  onClick={() => setExpandedDiagram({ title: 'Student Answer', value: a.answer })}
                  aria-label="Expand Diagram"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className={`text-foreground whitespace-pre-line ${isIdent ? 'uppercase' : ''}`}>
                {answerDisplay || <span className="text-muted-foreground italic">No answer</span>}
              </span>
            )}
          </div>
          
          {keyDisplay && !isDiagram && (
            <div className="flex gap-3">
              <span className="text-muted-foreground w-12 shrink-0">Key:</span>
              <div className="flex flex-col gap-1 w-full min-w-0">
                <span className={`font-medium text-foreground whitespace-pre-line ${isIdent ? 'uppercase' : ''}`}>
                  {keyDisplay}
                </span>
                {!isMatching && a.possibleAnswers && a.possibleAnswers.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Also accepted:{' '}
                    <span className={isIdent ? 'uppercase' : ''}>
                      {a.possibleAnswers.map(pa => formatReviewAnswerText(a.questionType, pa)).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-card text-card-foreground shadow-lg border border-border flex flex-col overflow-hidden sm:rounded-lg animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
          <div className="flex flex-col min-w-0 pr-4">
            <h2 id="exam-review-title" className="text-base font-semibold text-foreground tracking-tight truncate">
              Review Answers
            </h2>
            <p className="text-xs text-muted-foreground truncate">{examTitle}</p>
          </div>
          <button 
            type="button" 
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0" 
            onClick={onClose} 
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-background z-10">
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-muted text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            disabled={studentIndex <= 0}
            onClick={() => selectStudent(studentIndex - 1)}
            aria-label="Previous student"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex-1 max-w-sm">
            <select
              className="w-full h-8 pl-3 pr-8 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
              value={studentIndex}
              onChange={(e) => selectStudent(Number(e.target.value))}
            >
              {queue.map((s, idx) => (
                <option key={s.sessionId} value={idx}>
                  {s.studentName} ({s.schoolId || '—'})
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-muted text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            disabled={studentIndex >= queue.length - 1}
            onClick={() => selectStudent(studentIndex + 1)}
            aria-label="Next student"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {showScore && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/50 border border-border shrink-0">
              <span className="text-sm font-semibold">{sessionMeta.percentage}%</span>
              {sessionMeta.rank != null && (
                <span className="text-xs text-muted-foreground border-l border-border pl-1.5">Rank #{sessionMeta.rank}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground animate-pulse">Loading submission...</p>
            </div>
          ) : !currentStudent ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No submissions found.</p>
            </div>
          ) : answers.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No answers recorded for this session.</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <p className="text-sm font-medium text-muted-foreground">
                  {answers.length} question{answers.length === 1 ? '' : 's'}
                </p>
                {reviewedCount < answers.length && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {reviewedCount} / {answers.length} manually checked
                  </p>
                )}
              </div>
              <ul className="m-0 p-0 list-none">
                {answers.map((a, idx) => (
                  <AnswerItem 
                    key={a.id} 
                    a={a} 
                    idx={idx} 
                    savingId={savingId} 
                    gradeAnswer={gradeAnswer} 
                    setExpandedDiagram={setExpandedDiagram} 
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {expandedDiagram && (
        <div className="fixed inset-0 z-[250] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setExpandedDiagram(null)}>
          <div className="bg-card shadow-lg w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-border rounded-lg animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold tracking-tight">{expandedDiagram.title}</h3>
              <button
                type="button"
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setExpandedDiagram(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative bg-background">
              <DiagramEditor value={expandedDiagram.value} readOnly height="100%" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
