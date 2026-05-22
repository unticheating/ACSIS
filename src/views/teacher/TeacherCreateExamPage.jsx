import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Clock, Plus, Shuffle, Trash2, ArrowLeft, GripVertical, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card.jsx'
import { Label } from '@/components/ui/label.jsx'
import { apiFetch } from '@/lib/apiFetch.js'

const HOURS = [0, 1, 2, 3, 4]
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function emptyMc() {
  return { opt1: '', opt2: '', opt3: '', opt4: '', correct: '' }
}

export default function TeacherCreateExamPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClass, setSelectedClass] = useState(searchParams.get('classId') || '')

  useEffect(() => {
    apiFetch('/api/teacher/classes')
      .then((res) => res.json())
      .then(data => {
        setClasses(data)
        setLoadingClasses(false)
        if (!selectedClass && data.length > 0) {
          setSelectedClass(String(data[0].id))
        }
      })
      .catch(err => {
        console.error(err)
        setLoadingClasses(false)
      })
  }, [])

  const [examTitle, setExamTitle] = useState('')
  const [duration, setDuration] = useState('')

  const [questionType, setQuestionType] = useState('multiple')
  const [questionText, setQuestionText] = useState('')
  const [mc, setMc] = useState(emptyMc)
  const [identAnswer, setIdentAnswer] = useState('')
  const [tfAnswer, setTfAnswer] = useState('')

  const [questions, setQuestions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [selectedHours, setSelectedHours] = useState(1)
  const [selectedMinutes, setSelectedMinutes] = useState(0)

  const resetMc = useCallback(() => setMc(emptyMc()), [])

  const resetQuestionForm = useCallback(() => {
    setQuestionText('')
    setQuestionType('multiple')
    resetMc()
    setIdentAnswer('')
    setTfAnswer('')
  }, [resetMc])

  function addQuestion() {
    const text = questionText.trim()
    if (!text) {
      window.alert('Please enter a question.')
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

  async function createExam() {
    const title = examTitle.trim()
    const dur = Number(duration)
    if (!selectedClass) return window.alert('No class is available.')
    if (!title) return window.alert('Please enter an exam title.')
    if (!dur || dur < 1) return window.alert('Please set a valid time limit.')
    if (questions.length === 0) return window.alert('Please add at least one question.')

    const payload = {
      title,
      duration: dur,
      questions,
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create exam.')
      }
      const code = data.code ? `\n\nExam code for students: ${data.code}` : ''
      window.alert(
        `Exam "${title}" saved with ${questions.length} questions.${code}\n\nPublish the exam from the class page so students can enter the code.`,
      )
      navigate(`/teacher/my-classes/${selectedClass}`)
    } catch (err) {
      window.alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hourLabel = (h) => (h === 0 ? '00' : String(h))

  const optionsBlock = useMemo(() => {
    if (questionType === 'multiple') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Options</Label>
            {['opt1', 'opt2', 'opt3', 'opt4'].map((key, idx) => (
              <input
                key={key}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={mc[key]}
                onChange={(e) => setMc((m) => ({ ...m, [key]: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            ))}
          </div>
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <select
              value={mc.correct}
              onChange={(e) => setMc((m) => ({ ...m, correct: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
            >
              <option value="">Select correct answer</option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
              <option value="4">Option 4</option>
            </select>
          </div>
        </div>
      )
    }
    if (questionType === 'identification') {
      return (
        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <input
            type="text"
            placeholder="Enter exact correct answer"
            value={identAnswer}
            onChange={(e) => setIdentAnswer(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
          />
        </div>
      )
    }
    if (questionType === 'truefalse') {
      return (
        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <select 
            value={tfAnswer} 
            onChange={(e) => setTfAnswer(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
          >
            <option value="">Select True or False</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )
    }
    return null
  }, [identAnswer, mc, questionType, tfAnswer])

  const selectedClassObj = classes.find((c) => String(c.id) === String(selectedClass))

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* LEFT SIDEBAR - EXAM DETAILS */}
      <aside className="w-full md:w-[320px] lg:w-[380px] bg-white border-r border-gray-200 md:h-screen md:sticky top-0 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <Link to={selectedClass ? `/teacher/my-classes/${selectedClass}` : '/teacher/my-classes'} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Create Exam</h1>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Target Class</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {loadingClasses ? (
                  <option value="">Loading classes...</option>
                ) : classes.length === 0 ? (
                  <option value="">No classes available</option>
                ) : (
                  <>
                    <option value="" disabled>Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.academicYear} - {c.semester})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Exam Title</Label>
              <input 
                type="text" 
                placeholder="e.g. Midterm Examination"
                value={examTitle} 
                onChange={(e) => setExamTitle(e.target.value)} 
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Time Limit (minutes)</Label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Set time limit"
                  readOnly
                  value={duration}
                  onClick={() => setTimeModalOpen(true)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                />
                <Clock className="absolute right-3 top-2.5 text-gray-400" size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button 
            type="button" 
            onClick={createExam}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Exam...' : 'Finish & Save Exam'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT - QUESTIONS BUILDER */}
      <main className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Questions</h2>
              <p className="text-sm text-gray-500 mt-1">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'} added to this exam
              </p>
            </div>
            {questions.length > 1 && (
              <button 
                type="button" 
                onClick={shuffleQuestions}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                <Shuffle size={16} />
                Shuffle Order
              </button>
            )}
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => (
              <Card key={q.id} className="border border-gray-200 shadow-sm overflow-hidden group bg-white">
                <div className="flex items-stretch">
                  <div className="w-12 bg-gray-50 flex flex-col items-center justify-center text-gray-400 border-r border-gray-100 shrink-0">
                    <span className="text-xs font-bold mb-1 text-gray-500">{index + 1}</span>
                    <GripVertical size={16} className="opacity-50 group-hover:opacity-100 cursor-move" />
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">{q.question}</h3>
                      <button 
                        type="button" 
                        onClick={() => deleteQuestion(q.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {q.type === 'multiple-choice' ? 'Multiple Choice' : q.type === 'truefalse' ? 'True/False' : 'Identification'}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                        <span className="font-medium">Answer:</span>
                        <span className="text-gray-900 font-semibold">{q.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-dashed border-gray-300 shadow-none bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Add New Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-1">
                  <Label>Question Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
                    value={questionType}
                    onChange={(e) => {
                      setQuestionType(e.target.value)
                      resetQuestionForm()
                      setQuestionType(e.target.value)
                    }}
                  >
                    <option value="multiple">Multiple Choice</option>
                    <option value="identification">Identification</option>
                    <option value="truefalse">True / False</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Question Text</Label>
                  <textarea
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 min-h-[80px]"
                    placeholder="Enter your question here..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                {optionsBlock}
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 border-t border-gray-100 p-4">
              <button 
                type="button" 
                onClick={addQuestion}
                className="flex items-center justify-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 w-full md:w-auto"
              >
                <Plus size={16} />
                Save Question to List
              </button>
            </CardFooter>
          </Card>

        </div>
      </main>

      {/* TIME PICKER MODAL */}
      {timeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-xl border-0 animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-xl">Set Time Limit</CardTitle>
              <CardDescription>How long should students have to complete this exam?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 h-[200px]">
                <div className="flex-1 flex flex-col border rounded-md overflow-hidden">
                  <div className="bg-gray-50 text-xs font-bold text-center py-2 border-b text-gray-500 uppercase tracking-wider">Hours</div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHours(h)}
                        className={`w-full py-2 px-3 text-center text-sm rounded-md transition-colors ${selectedHours === h ? 'bg-blue-600 text-white font-bold shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        {hourLabel(h)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col border rounded-md overflow-hidden">
                  <div className="bg-gray-50 text-xs font-bold text-center py-2 border-b text-gray-500 uppercase tracking-wider">Minutes</div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMinutes(m)}
                        className={`w-full py-2 px-3 text-center text-sm rounded-md transition-colors ${selectedMinutes === m ? 'bg-blue-600 text-white font-bold shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        {m < 10 ? `0${m}` : String(m)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 bg-gray-50 py-4 border-t">
              <button 
                type="button" 
                onClick={() => setTimeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={saveTimeLimit}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm"
              >
                Set Time Limit
              </button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
