import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Label } from '@/components/ui/label.jsx'
import { addExamToClass, CLASSES_CHANGED_EVENT, ensureClassesMigrated, getClasses } from '@/lib/classesExams.js'
import '../../pages/teacher-ui/create_exam.css'

const HOURS = [0, 1, 2, 3, 4]
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function emptyMc() {
  return { opt1: '', opt2: '', opt3: '', opt4: '', correct: '' }
}

export default function TeacherCreateExamPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [classesTick, setClassesTick] = useState(0)

  useEffect(() => {
    ensureClassesMigrated()
  }, [])

  useEffect(() => {
    const fn = () => setClassesTick((t) => t + 1)
    window.addEventListener(CLASSES_CHANGED_EVENT, fn)
    return () => window.removeEventListener(CLASSES_CHANGED_EVENT, fn)
  }, [])

  const classes = useMemo(() => {
    ensureClassesMigrated()
    return getClasses()
  }, [classesTick])

  const firstId = classes[0]?.id ?? ''
  const qp = searchParams.get('classId')
  const classId = classes.some((c) => String(c.id) === String(qp)) ? String(qp) : String(firstId)

  useEffect(() => {
    if (classId && String(searchParams.get('classId')) !== classId) {
      setSearchParams({ classId }, { replace: true })
    }
  }, [classId, searchParams, setSearchParams])

  const [examTitle, setExamTitle] = useState('')
  const [duration, setDuration] = useState('')
  const [subject, setSubject] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [section, setSection] = useState('')

  const [questionType, setQuestionType] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [mc, setMc] = useState(emptyMc)
  const [identAnswer, setIdentAnswer] = useState('')
  const [tfAnswer, setTfAnswer] = useState('')

  const [questions, setQuestions] = useState([])

  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [selectedHours, setSelectedHours] = useState(1)
  const [selectedMinutes, setSelectedMinutes] = useState(0)

  const resetMc = useCallback(() => {
    setMc(emptyMc())
  }, [])

  const clearExamDetails = useCallback(() => {
    setExamTitle('')
    setDuration('')
    setSubject('')
    setYearLevel('')
    setSection('')
  }, [])

  const resetQuestionForm = useCallback(() => {
    setQuestionText('')
    setQuestionType('')
    resetMc()
    setIdentAnswer('')
    setTfAnswer('')
  }, [resetMc])

  const resetAll = useCallback(() => {
    setQuestions([])
    clearExamDetails()
    resetQuestionForm()
  }, [clearExamDetails, resetQuestionForm])

  function addQuestion() {
    const text = questionText.trim()
    if (!text) {
      window.alert('Please enter a question.')
      return
    }
    if (!questionType) {
      window.alert('Please select a question type.')
      return
    }

    let correctAnswer = ''
    let options = []

    if (questionType === 'multiple') {
      const opts = [mc.opt1, mc.opt2, mc.opt3, mc.opt4].map((o) => o.trim())
      if (opts.some((o) => !o)) {
        window.alert('Please fill in all multiple-choice options.')
        return
      }
      if (!mc.correct) {
        window.alert('Please select the correct answer.')
        return
      }
      correctAnswer = opts[Number(mc.correct) - 1]
      options = opts
    } else if (questionType === 'identification') {
      const ident = identAnswer.trim()
      if (!ident) {
        window.alert('Please enter the identification answer.')
        return
      }
      correctAnswer = ident
    } else if (questionType === 'truefalse') {
      if (!tfAnswer) {
        window.alert('Please select True or False.')
        return
      }
      correctAnswer = tfAnswer === 'true' ? 'True' : 'False'
    }

    const typeLabel = questionType === 'multiple' ? 'multiple-choice' : questionType

    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: typeLabel,
        question: text,
        options,
        correctAnswer,
      },
    ])
    resetQuestionForm()
  }

  function deleteQuestion(id) {
    if (!window.confirm('Delete this question?')) return
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  function shuffleQuestions() {
    setQuestions((prev) => [...prev].sort(() => Math.random() - 0.5))
  }

  function saveTimeLimit() {
    const totalMinutes = selectedHours * 60 + selectedMinutes
    setDuration(totalMinutes > 0 ? String(totalMinutes) : '')
    setTimeModalOpen(false)
  }

  function createExam() {
    const title = examTitle.trim()
    const dur = Number(duration)
    if (!classId) {
      window.alert('No class is available. Ask an administrator to add a class under Admin → Classes.')
      return
    }
    if (!title) {
      window.alert('Please enter an exam title.')
      return
    }
    if (!dur || dur < 1) {
      window.alert('Please set a valid time limit.')
      return
    }
    if (!subject || !yearLevel || !section) {
      window.alert('Please select subject, year level, and section.')
      return
    }
    if (questions.length === 0) {
      window.alert('Please add at least one question.')
      return
    }

    const ok = addExamToClass(classId, {
      id: Date.now(),
      title,
      questionCount: questions.length,
      duration: dur,
      status: 'Draft',
      subject,
      yearLevel,
      section,
      questions,
    })
    if (!ok) {
      window.alert('Could not save to the selected class. Try picking another class or refresh the page.')
      return
    }
    window.alert(`Exam "${title}" created successfully with ${questions.length} questions.`)
    resetAll()
  }

  const hourLabel = (h) => (h === 0 ? '00' : String(h))

  const optionsBlock = useMemo(() => {
    if (questionType === 'multiple') {
      return (
        <>
          <div className="form-group">
            <label htmlFor="opt1">Options</label>
            {['opt1', 'opt2', 'opt3', 'opt4'].map((key, idx) => (
              <input
                key={key}
                id={`mc-${key}`}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={mc[key]}
                onChange={(e) => setMc((m) => ({ ...m, [key]: e.target.value }))}
                style={{ marginTop: idx === 0 ? 0 : 12 }}
                aria-label={`Option ${idx + 1}`}
              />
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="correct-answer">Correct Answer</label>
            <select
              id="correct-answer"
              value={mc.correct}
              onChange={(e) => setMc((m) => ({ ...m, correct: e.target.value }))}
            >
              <option value="">Select correct answer</option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
              <option value="4">Option 4</option>
            </select>
          </div>
        </>
      )
    }
    if (questionType === 'identification') {
      return (
        <div className="form-group">
          <label htmlFor="ident-answer">Correct Answer</label>
          <input
            id="ident-answer"
            type="text"
            placeholder="Enter correct answer"
            value={identAnswer}
            onChange={(e) => setIdentAnswer(e.target.value)}
          />
        </div>
      )
    }
    if (questionType === 'truefalse') {
      return (
        <div className="form-group">
          <label htmlFor="tf-answer">Correct Answer</label>
          <select id="tf-answer" value={tfAnswer} onChange={(e) => setTfAnswer(e.target.value)}>
            <option value="">Select answer</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )
    }
    return null
  }, [identAnswer, mc, questionType, tfAnswer])

  const selectedClass = classes.find((c) => String(c.id) === String(classId))

  return (
    <div className="acsis-view acsis-create-exam">
      <h1 className="page-title">Create New Examination</h1>

      <Card className="mb-6 w-full border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Class</CardTitle>
          <CardDescription>
            Exams are saved under a class (academic year and semester are set on the class in Admin → Classes).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="exam-class">Select class</Label>
          <select
            id="exam-class"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={classId}
            disabled={classes.length === 0}
            onChange={(e) => setSearchParams({ classId: e.target.value }, { replace: true })}
          >
            {classes.length === 0 ? <option value="">No classes</option> : null}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.academicYear} · {c.semester}
              </option>
            ))}
          </select>
          {selectedClass ? (
            <p className="text-sm text-muted-foreground">
              Saving to: <strong className="text-foreground">{selectedClass.name}</strong> ({selectedClass.academicYear},{' '}
              {selectedClass.semester})
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="card">
        <h2 className="section-title">Exam Details</h2>
        <div className="form-grid">
          <div className="form-group full">
            <label htmlFor="exam-title">Exam Title</label>
            <input id="exam-title" type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Select subject</option>
              <option>Data Structures (CS101)</option>
              <option>Networking II (CS604)</option>
              <option>Introduction to Java (CS432)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="time-limit">Time Limit (minutes)</label>
            <div className="time-input-group">
              <input
                id="time-limit"
                type="number"
                min={1}
                readOnly
                value={duration}
                onClick={() => setTimeModalOpen(true)}
                onFocus={() => setTimeModalOpen(true)}
                aria-haspopup="dialog"
              />
              <span className="time-icon" aria-hidden>
                <Clock size={22} strokeWidth={2} />
              </span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="year-level">Year Level</label>
            <select id="year-level" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
              <option value="">Select year level</option>
              <option>1st Year</option>
              <option>2nd Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="section">Section</label>
            <select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">Select section</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
              <option>D</option>
              <option>E</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Add Question</h2>
        <div className="form-group">
          <label htmlFor="question-type">Question Type</label>
          <select
            id="question-type"
            value={questionType}
            onChange={(e) => {
              setQuestionType(e.target.value)
              resetMc()
              setIdentAnswer('')
              setTfAnswer('')
            }}
          >
            <option value="">Select question type</option>
            <option value="multiple">Multiple Choice</option>
            <option value="identification">Identification</option>
            <option value="truefalse">True / False</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="question-text">Question</label>
          <textarea
            id="question-text"
            rows={3}
            className="question-textarea"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>
        {optionsBlock}
        <button type="button" className="add-btn" onClick={addQuestion}>
          <Plus size={20} strokeWidth={2} aria-hidden />
          Add Question
        </button>
      </div>

      {questions.length > 0 ? (
        <div className="card" id="questions-list-card">
          <div className="questions-header">
            <h2>
              Questions (<span id="question-count">{questions.length}</span>)
            </h2>
            <button type="button" className="shuffle-btn" onClick={shuffleQuestions}>
              <Shuffle size={20} strokeWidth={2} aria-hidden />
              Shuffle
            </button>
          </div>
          <div id="questions-list">
            {questions.map((q) => (
              <div key={q.id} className="question-item">
                <div className="question-text">{q.question}</div>
                <div className="meta">
                  Type: {q.type}
                  <br />
                  Answer: <span className="correct-answer">{q.correctAnswer}</span>
                </div>
                <div className="actions">
                  <button type="button" className="edit-btn" onClick={() => window.alert('Edit functionality coming soon...')} aria-label="Edit question">
                    <Pencil size={20} strokeWidth={2} aria-hidden />
                  </button>
                  <button type="button" className="delete-btn" onClick={() => deleteQuestion(q.id)} aria-label="Delete question">
                    <Trash2 size={20} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button type="button" className="create-exam-btn" onClick={createExam}>
        Create Exam
      </button>

      <div
        id="time-picker-modal"
        className="modal"
        style={{ display: timeModalOpen ? 'flex' : 'none' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-picker-title"
      >
        <div className="modal-content">
          <h3 id="time-picker-title">Select Time Limit (minutes)</h3>
          <div className="time-picker-grid">
            <div className="column">
              <div className="picker-label">Hours</div>
              <div id="hours-list" className="number-list">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    role="button"
                    tabIndex={0}
                    className={selectedHours === h ? 'selected' : ''}
                    onClick={() => setSelectedHours(h)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedHours(h)
                    }}
                  >
                    {hourLabel(h)}
                  </div>
                ))}
              </div>
            </div>
            <div className="column">
              <div className="picker-label">Minutes</div>
              <div id="minutes-list" className="number-list">
                {MINUTES.map((m) => (
                  <div
                    key={m}
                    role="button"
                    tabIndex={0}
                    className={selectedMinutes === m ? 'selected' : ''}
                    onClick={() => setSelectedMinutes(m)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedMinutes(m)
                    }}
                  >
                    {m < 10 ? `0${m}` : String(m)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-buttons">
            <button type="button" className="cancel-btn" onClick={() => setTimeModalOpen(false)}>
              CANCEL
            </button>
            <button type="button" className="save-btn" onClick={saveTimeLimit}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
