import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Clock, Plus, Shuffle, Trash2, ArrowLeft, GripVertical, CheckCircle2, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card.jsx'
import { Label } from '@/components/ui/label.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { COPY } from '@/lib/examFlowUi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'

const HOURS = [0, 1, 2, 3, 4]
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function emptyMc() {
  return { opt1: '', opt2: '', opt3: '', opt4: '', correct: '' }
}

function newSection(index = 1) {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: `Set ${index}`,
    description: '',
    questions: [],
  }
}

const INITIAL_EXAM_SECTION = newSection(1)

export default function TeacherCreateExamPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const classesQuery = searchParams.get('classes') || ''
  const [selectedClass, setSelectedClass] = useState(searchParams.get('classId') || (classesQuery ? classesQuery.split(',')[0] : ''))
  const [createForClasses, setCreateForClasses] = useState(classesQuery ? classesQuery.split(',') : [])
  const preselectedCourse = searchParams.get('course') || ''

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
  const [examDescription, setExamDescription] = useState('')
  const [examPassword, setExamPassword] = useState('')
  const [duration, setDuration] = useState('')

  const [questionType, setQuestionType] = useState('multiple')
  const [questionText, setQuestionText] = useState('')
  const [mc, setMc] = useState(emptyMc)
  const [identAnswer, setIdentAnswer] = useState('')
  const [tfAnswer, setTfAnswer] = useState('')

  const [sections, setSections] = useState([INITIAL_EXAM_SECTION])
  const [activeSectionId, setActiveSectionId] = useState(INITIAL_EXAM_SECTION.id)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleChoices, setShuffleChoices] = useState(false)
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
      acsisToastError('Please enter a question.')
      return
    }

    let correctAnswer = ''
    let options = []

    if (questionType === 'multiple') {
      const opts = [mc.opt1, mc.opt2, mc.opt3, mc.opt4].map((o) => o.trim())
      if (opts.some((o) => !o)) {
        acsisToastError('Please fill in all multiple-choice options.')
        return
      }
      if (!mc.correct) {
        acsisToastError('Please select the correct answer.')
        return
      }
      correctAnswer = opts[Number(mc.correct) - 1]
      options = opts
    } else if (questionType === 'identification') {
      const ident = identAnswer.trim()
      if (!ident) {
        acsisToastError('Please enter the identification answer.')
        return
      }
      correctAnswer = ident
    } else if (questionType === 'truefalse') {
      if (!tfAnswer) {
        acsisToastError('Please select True or False.')
        return
      }
      correctAnswer = tfAnswer === 'true' ? 'True' : 'False'
    }

    const typeLabel = questionType === 'multiple' ? 'multiple-choice' : questionType

    setSections((prev) =>
      prev.map((sec) =>
        sec.id === activeSectionId
          ? {
              ...sec,
              questions: [
                ...sec.questions,
                {
                  id: Date.now(),
                  type: typeLabel,
                  question: text,
                  options,
                  correctAnswer,
                },
              ],
            }
          : sec,
      ),
    )
    resetQuestionForm()
  }

  async function deleteQuestion(sectionId, questionId) {
    const ok = await confirm({
      title: 'Delete question?',
      description: 'This question will be removed from the set.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, questions: sec.questions.filter((q) => q.id !== questionId) }
          : sec,
      ),
    )
  }

  function shuffleSectionQuestions(sectionId) {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, questions: [...sec.questions].sort(() => Math.random() - 0.5) }
          : sec,
      ),
    )
  }

  function updateSection(sectionId, patch) {
    setSections((prev) => prev.map((sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec)))
  }

  function addSection() {
    setSections((prev) => {
      const next = newSection(prev.length + 1)
      setActiveSectionId(next.id)
      return [...prev, next]
    })
  }

  async function removeSection(sectionId) {
    if (sections.length <= 1) {
      acsisToastError('You need at least one question set.')
      return
    }
    const ok = await confirm({
      title: 'Remove this set?',
      description: 'All questions in this set will be deleted.',
      confirmLabel: 'Remove set',
      destructive: true,
    })
    if (!ok) return
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId)
      if (activeSectionId === sectionId) {
        setActiveSectionId(next[0]?.id)
      }
      return next
    })
  }

  const totalQuestions = useMemo(
    () => sections.reduce((n, s) => n + s.questions.length, 0),
    [sections],
  )

  useEffect(() => {
    resetQuestionForm()
  }, [activeSectionId, resetQuestionForm])

  function saveTimeLimit() {
    const totalMinutes = selectedHours * 60 + selectedMinutes
    setDuration(totalMinutes > 0 ? String(totalMinutes) : '')
    setTimeModalOpen(false)
  }

  async function createExam() {
    const title = examTitle.trim()
    const dur = Number(duration)
    if (!selectedClass) {
      acsisToastError('No class is available.')
      return
    }
    if (!title) {
      acsisToastError('Please enter an exam title.')
      return
    }
    if (!dur || dur < 1) {
      acsisToastError('Please set a valid time limit.')
      return
    }
    if (totalQuestions === 0) {
      acsisToastError('Please add at least one question.')
      return
    }

    const payload = {
      title,
      description: examDescription.trim(),
      duration: dur,
      sections: sections.map((sec) => ({
        title: sec.title.trim() || 'Set',
        description: sec.description.trim(),
        questions: sec.questions.map(({ type, question, options, correctAnswer }) => ({
          type,
          question,
          options,
          correctAnswer,
        })),
      })),
      shuffleQuestions,
      shuffleChoices,
    }
    const pw = examPassword.trim()
    if (pw) payload.password = pw

    setIsSubmitting(true)
    try {
      // Create for primary selectedClass
      const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create exam.')
      }
      const createdIds = [data.examId]

      // If createForClasses includes additional class ids, duplicate exam for them
      const other = createForClasses.filter((id) => String(id) !== String(selectedClass))
      for (const clsId of other) {
        try {
          const r = await apiFetch(`/api/teacher/classes/${clsId}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const d = await r.json()
          if (r.ok) createdIds.push(d.examId)
        } catch (e) {
          console.error('Failed to duplicate exam for class', clsId, e)
        }
      }

      const codeMsg = data.code ? ` Exam code: ${data.code}.` : ''
      acsisToastSuccess(
        `Exam "${title}" saved for ${createdIds.length} class(es) (${totalQuestions} questions, ${sections.length} set(s)).${codeMsg} Publish from the class page when ready.`,
      )
      // Redirect to the class dashboard for the selected class
      navigate(`/teacher/my-classes/${selectedClass}`)
    } catch (err) {
      acsisToastError(err.message)
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

  const addQuestionForm = (
    <div className="border-t-2 border-dashed border-blue-200 bg-blue-50/30 p-5 space-y-6">
      <p className="text-sm font-semibold text-gray-900">Add question to this set</p>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2 md:col-span-1">
          <Label>Question Type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
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
            className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 min-h-[80px]"
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>
      </div>
      <div className="pt-2 border-t border-gray-200/80">{optionsBlock}</div>
      <button
        type="button"
        onClick={addQuestion}
        className="flex items-center justify-center gap-2 rounded-md bg-blue-600 border border-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 w-full md:w-auto"
      >
        <Plus size={16} />
        Save question
      </button>
    </div>
  )

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
              <Label className="text-sm font-semibold text-gray-700">Exam Description (Optional)</Label>
              <textarea 
                placeholder="Brief instructions or summary"
                value={examDescription} 
                onChange={(e) => setExamDescription(e.target.value)} 
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[60px]"
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

            <div className="space-y-2">
              <Label htmlFor="exam-password" className="text-sm font-semibold text-gray-700">
                Exam password <span className="font-normal text-gray-500">(optional)</span>
              </Label>
              <input
                id="exam-password"
                type="text"
                maxLength={20}
                autoComplete="off"
                placeholder="Leave blank for open lobby"
                value={examPassword}
                onChange={(e) => setExamPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              />
              <p className="text-xs text-gray-500 leading-relaxed">{COPY.examPassword}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{COPY.classAccessCode}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Per-student shuffle</p>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Shuffle questions within each set (sets stay in order)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleChoices}
                  onChange={(e) => setShuffleChoices(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Shuffle choices within each question (MCQ / True-False)
              </label>
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
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Question sets</h2>
              <p className="text-sm text-gray-500 mt-1">
                {sections.length} {sections.length === 1 ? 'set' : 'sets'} · {totalQuestions}{' '}
                {totalQuestions === 1 ? 'question' : 'questions'}
              </p>
            </div>
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Layers size={16} />
              Add set
            </button>
          </div>

          <div className="space-y-10">
            {sections.map((sec, secIndex) => {
              let qOffset = 0
              for (let i = 0; i < secIndex; i++) qOffset += sections[i].questions.length
              return (
                <div key={sec.id} className="space-y-4">
                  <Card
                    className={`border shadow-sm overflow-hidden ${
                      activeSectionId === sec.id ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
                    }`}
                  >
                    <CardHeader className="pb-3 bg-gray-50/80 border-b border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">Set title</Label>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                              placeholder={`Set ${secIndex + 1}`}
                              className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 uppercase tracking-wide">
                              Instructions for students
                            </Label>
                            <textarea
                              rows={2}
                              value={sec.description}
                              onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                              placeholder="e.g. Write True or False. If False, write the correct answer."
                              className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[72px]"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveSectionId(sec.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                              activeSectionId === sec.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {activeSectionId === sec.id ? 'Adding here' : 'Add questions here'}
                          </button>
                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => void removeSection(sec.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 rounded-md hover:bg-red-50"
                            >
                              Remove set
                            </button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {sec.questions.length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {sec.questions.length > 1 && (
                            <div className="px-5 py-2 bg-gray-50 flex justify-end">
                              <button
                                type="button"
                                onClick={() => shuffleSectionQuestions(sec.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                              >
                                <Shuffle size={14} />
                                Shuffle this set
                              </button>
                            </div>
                          )}
                          {sec.questions.map((q, index) => (
                            <div key={q.id} className="flex group">
                              <div className="w-12 bg-gray-50 flex flex-col items-center justify-center text-gray-400 border-r border-gray-100 shrink-0 py-4">
                                <span className="text-xs font-bold text-gray-500">{qOffset + index + 1}</span>
                                <GripVertical size={16} className="opacity-50" />
                              </div>
                              <div className="flex-1 p-5">
                                <div className="flex justify-between items-start gap-4">
                                  <h3 className="font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                                    {q.question}
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => void deleteQuestion(sec.id, q.id)}
                                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 shrink-0"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                                <div className="mt-3">
                                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                    {q.type === 'multiple-choice'
                                      ? 'Multiple Choice'
                                      : q.type === 'truefalse'
                                        ? 'True/False'
                                        : 'Identification'}
                                  </span>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                                  <span className="font-medium">Answer:</span>
                                  <span className="text-gray-900 font-semibold">{q.correctAnswer}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {activeSectionId === sec.id
                        ? addQuestionForm
                        : sec.questions.length === 0 && (
                            <p className="p-5 text-sm text-gray-500">
                              Click <span className="font-medium">Add questions here</span> to add questions to this set.
                            </p>
                          )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>

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
      {ConfirmDialog}
    </div>
  )
}
