import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Clock, Plus, Shuffle, Trash2, ArrowLeft, GripVertical, CheckCircle2, Layers, ImageIcon, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { COPY } from '@/lib/examFlowUi.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Editor from '@monaco-editor/react'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'

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
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [isAutoPublish, setIsAutoPublish] = useState(false)

  const [questionType, setQuestionType] = useState('multiple')
  const [questionText, setQuestionText] = useState('')
  const [mc, setMc] = useState(emptyMc)
  const [identAnswer, setIdentAnswer] = useState('')
  const [tfAnswer, setTfAnswer] = useState('')
  const [codingAnswer, setCodingAnswer] = useState('')
  const [codingLanguage, setCodingLanguage] = useState('javascript')
  const [questionImage, setQuestionImage] = useState(null) // base64 data URI
  const imageInputRef = useRef(null)

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      acsisToastError('Please select a valid image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      acsisToastError('Image must be smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setQuestionImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const [sections, setSections] = useState([INITIAL_EXAM_SECTION])
  const [activeSectionId, setActiveSectionId] = useState(INITIAL_EXAM_SECTION.id)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleChoices, setShuffleChoices] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [examId, setExamId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [showQuestionForm, setShowQuestionForm] = useState(true)

  const resetMc = useCallback(() => setMc(emptyMc()), [])

  const resetQuestionForm = useCallback(() => {
    setQuestionText('')
    setQuestionType('multiple')
    resetMc()
    setIdentAnswer('')
    setTfAnswer('')
    setCodingAnswer('')
    setCodingLanguage('javascript')
    setQuestionImage(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
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
    } else if (questionType === 'coding') {
      const code = codingAnswer.trim()
      if (!code) {
        acsisToastError('Please provide an expected solution or boilerplate code.')
        return
      }
      correctAnswer = code
      options = [codingLanguage]
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
                  id: String(Date.now()), // ensure string for draggable
                  type: typeLabel,
                  question: text,
                  options,
                  correctAnswer,
                  imageUrl: questionImage || null,
                },
              ],
            }
          : sec,
      ),
    )
    resetQuestionForm()
    setShowQuestionForm(false)
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
      setShowQuestionForm(true)
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

  // Autosave logic
  useEffect(() => {
    const title = examTitle.trim()
    const totalQ = sections.reduce((n, s) => n + s.questions.length, 0)
    if (!title || totalQ === 0) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      try {
        const payload = {
          title,
          description: examDescription.trim(),
          sections: sections.map((sec) => ({
            title: sec.title.trim() || 'Set',
            description: sec.description.trim(),
            questions: sec.questions.map(({ type, question, options, correctAnswer, imageUrl }) => ({
              type,
              question,
              options,
              correctAnswer,
              imageUrl: imageUrl || null,
            })),
          })),
          shuffleQuestions,
          shuffleChoices,
          scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
          isAutoPublish,
        }
        
        if (examPassword.trim()) {
          payload.password = examPassword.trim()
        }

        if (!examId) {
          const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            const data = await res.json()
            setExamId(data.examId)
            setLastSaved(new Date())
          }
        } else {
          const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams/${examId}/content`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            setLastSaved(new Date())
          }
        }
      } catch (err) {
        console.error('Autosave failed:', err)
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [examTitle, examDescription, sections, shuffleQuestions, shuffleChoices, selectedClass, examPassword, examId, scheduledStart, scheduledEnd, isAutoPublish])

  async function createExam() {
    const title = examTitle.trim()
    if (!selectedClass) {
      acsisToastError('No class is available.')
      return
    }
    if (!title) {
      acsisToastError('Please enter an exam title.')
      return
    }
    if (totalQuestions === 0) {
      acsisToastError('Please add at least one question.')
      return
    }

    const payload = {
      title,
      description: examDescription.trim(),
      sections: sections.map((sec) => ({
        title: sec.title.trim() || 'Set',
        description: sec.description.trim(),
        questions: sec.questions.map(({ type, question, options, correctAnswer, imageUrl }) => ({
          type,
          question,
          options,
          correctAnswer,
          imageUrl: imageUrl || null,
        })),
      })),
      shuffleQuestions,
      shuffleChoices,
      scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      isAutoPublish,
    }
    const pw = examPassword.trim()
    if (pw) payload.password = pw

    setIsSubmitting(true)
    try {
      let mainExamId = examId
      let examCode = ''
      if (!mainExamId) {
        const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create exam.')
        mainExamId = data.examId
        examCode = data.code
      } else {
        const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams/${mainExamId}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update exam draft.')
      }
      
      const createdIds = [mainExamId]

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

      const codeMsg = examCode ? ` Exam code: ${examCode}.` : ''
      acsisToastSuccess(
        `Exam "${title}" saved for ${createdIds.length} class(es) (${totalQuestions} questions, ${sections.length} set(s)).${codeMsg} Publish from the class page when ready.`,
      )
      navigate(`/teacher/my-classes/${selectedClass}`)
    } catch (err) {
      acsisToastError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function onDragEnd(result) {
    if (!result.destination) return
    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index
    if (sourceIndex === destinationIndex) return

    const sectionId = result.source.droppableId
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec
        const newQuestions = Array.from(sec.questions)
        const [moved] = newQuestions.splice(sourceIndex, 1)
        newQuestions.splice(destinationIndex, 0, moved)
        return { ...sec, questions: newQuestions }
      })
    )
  }

  const hourLabel = (h) => (h === 0 ? '00' : String(h))

  const optionsBlock = useMemo(() => {
    if (questionType === 'multiple') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Options</Label>
            {['opt1', 'opt2', 'opt3', 'opt4'].map((key, idx) => (
              <Input
                key={key}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={mc[key]}
                onChange={(e) => setMc((m) => ({ ...m, [key]: e.target.value }))}
              />
            ))}
          </div>
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <select
              value={mc.correct}
              onChange={(e) => setMc((m) => ({ ...m, correct: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <Input
            type="text"
            placeholder="Enter exact correct answer"
            value={identAnswer}
            onChange={(e) => setIdentAnswer(e.target.value)}
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select True or False</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )
    }
    if (questionType === 'coding') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Programming Language</Label>
            <select
              value={codingLanguage}
              onChange={(e) => setCodingLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="vb">VB.NET</option>
              <option value="php">PHP</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="xml">XML</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Expected Solution / Boilerplate Code</Label>
            <div className="border border-input rounded-md overflow-hidden h-[300px]">
              <Editor
                height="100%"
                language={codingLanguage}
                theme="vs-dark"
                value={codingAnswer}
                onChange={(val) => setCodingAnswer(val)}
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 14,
                  quickSuggestions: false,
                  suggestOnTriggerCharacters: false,
                  wordBasedSuggestions: "off",
                  parameterHints: { enabled: false }
                }}
              />
            </div>
          </div>
        </div>
      )
    }
    return null
  }, [identAnswer, mc, questionType, tfAnswer, codingAnswer, codingLanguage])

  const addQuestionForm = (
    <div className="border-t border-border bg-muted/30 p-5 space-y-6">
      <p className="text-sm font-semibold text-foreground">Add question to this set</p>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2 md:col-span-1">
          <Label>Question Type</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <option value="coding">Coding / Scripting</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Question Text</Label>
          <textarea
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>
      </div>

      {/* Image Attachment */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <ImageIcon size={14} className="text-muted-foreground" />
          Attach Image <span className="font-normal text-muted-foreground">(optional, max 2 MB)</span>
        </Label>
        {questionImage ? (
          <div className="relative inline-block">
            <img
              src={questionImage}
              alt="Question attachment"
              className="max-h-48 max-w-full rounded-lg border border-border object-contain bg-muted"
            />
            <button
              type="button"
              onClick={() => {
                setQuestionImage(null)
                if (imageInputRef.current) imageInputRef.current.value = ''
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/80 transition-colors"
              aria-label="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => imageInputRef.current?.click()}
          >
            <div className="text-center">
              <ImageIcon size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload an image</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, GIF up to 2MB</p>
            </div>
          </div>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      <div className="pt-4 border-t border-border">{optionsBlock}</div>
      <Button onClick={addQuestion} className="w-full md:w-auto">
        <Plus size={16} className="mr-2" />
        Save question
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row h-full lg:h-[calc(100vh-64px)] bg-background">
      {/* LEFT SIDEBAR - EXAM DETAILS */}
      <aside className="w-full md:w-[320px] lg:w-[380px] bg-card border-r border-border md:h-full overflow-y-auto flex flex-col shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full text-muted-foreground hover:text-foreground">
            <Link to={selectedClass ? `/teacher/my-classes/${selectedClass}` : '/teacher/my-classes'}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create Exam</h1>
        </div>
        
        <div className="p-6 flex-1 space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Target Class</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <Label className="text-sm font-semibold">Exam Title</Label>
              <Input 
                type="text" 
                placeholder="e.g. Midterm Examination"
                value={examTitle} 
                onChange={(e) => setExamTitle(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Exam Description (Optional)</Label>
              <textarea 
                placeholder="Brief instructions or summary"
                value={examDescription} 
                onChange={(e) => setExamDescription(e.target.value)} 
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exam-password" className="text-sm font-semibold">
                Exam password <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="exam-password"
                type="text"
                maxLength={20}
                autoComplete="off"
                placeholder="Leave blank for open lobby"
                value={examPassword}
                onChange={(e) => setExamPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">{COPY.examPassword}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{COPY.classAccessCode}</p>
            </div>

            <div className="space-y-4 pt-5 mt-2 border-t border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Exam Scheduling</p>
                <p className="text-xs text-muted-foreground mt-1">If set, the exam will strictly start and end at these times.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    Start Time
                  </Label>
                  <DateTimePicker
                    value={scheduledStart}
                    onChange={(dateStr) => setScheduledStart(dateStr)}
                    placeholder="Select start date & time"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    End Time
                  </Label>
                  <DateTimePicker
                    value={scheduledEnd}
                    onChange={(dateStr) => setScheduledEnd(dateStr)}
                    placeholder="Select end date & time"
                    className="w-full"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={isAutoPublish}
                  onChange={(e) => setIsAutoPublish(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Auto-publish exam at scheduled start time
              </label>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground">Per-student shuffle</p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Shuffle questions within each set (sets stay in order)
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={shuffleChoices}
                  onChange={(e) => setShuffleChoices(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Shuffle choices within each question (MCQ / True-False)
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-muted/10">
          <Button 
            onClick={createExam}
            disabled={isSubmitting}
            className="w-full py-6 text-md shadow-md acsis-mc-create-btn border-none"
          >
            {isSubmitting ? 'Saving Exam...' : 'Finish & Save Exam'}
          </Button>
        </div>
      </aside>
      {/* MAIN CONTENT - QUESTIONS BUILDER */}
      <main className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-foreground">Exam Builder</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {sections.length} {sections.length === 1 ? 'set' : 'sets'} · {totalQuestions}{' '}
                  {totalQuestions === 1 ? 'question' : 'questions'}
                </p>
                {isSaving ? (
                  <span className="text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">Saving...</span>
                ) : lastSaved ? (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Draft saved</span>
                ) : null}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={addSection}
              className="gap-2 shadow-sm"
            >
              <Layers size={16} />
              Add set
            </Button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-10">
              {sections.map((sec, secIndex) => {
                let qOffset = 0
                for (let i = 0; i < secIndex; i++) qOffset += sections[i].questions.length
                return (
                  <div key={sec.id} className="space-y-4">
                    <Card
                      className={`overflow-hidden transition-shadow ${
                        activeSectionId === sec.id ? 'border-primary ring-1 ring-primary shadow-md' : 'shadow-sm'
                      }`}
                    >
                      <CardHeader className="pb-3 bg-muted/40 border-b border-border">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-3 min-w-0">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Set title</Label>
                              <Input
                                type="text"
                                value={sec.title}
                                onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                                placeholder={`Set ${secIndex + 1}`}
                                className="font-semibold h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                Instructions for students
                              </Label>
                              <textarea
                                rows={2}
                                value={sec.description}
                                onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                                placeholder="e.g. Write True or False. If False, write the correct answer."
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[72px]"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              variant={activeSectionId === sec.id ? 'default' : 'secondary'}
                              size="sm"
                              onClick={() => {
                                setActiveSectionId(sec.id)
                                setShowQuestionForm(true)
                              }}
                            >
                              {activeSectionId === sec.id ? 'Adding here' : 'Add questions here'}
                            </Button>
                            {sections.length > 1 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => void removeSection(sec.id)}
                              >
                                Remove set
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Droppable droppableId={sec.id}>
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="divide-y divide-border"
                            >
                              {sec.questions.length > 1 && (
                                <div className="px-5 py-2 bg-muted/30 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => shuffleSectionQuestions(sec.id)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Shuffle size={14} />
                                    Shuffle this set
                                  </button>
                                </div>
                              )}
                              {sec.questions.map((q, index) => (
                                <Draggable key={q.id} draggableId={q.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      style={provided.draggableProps.style}
                                      className={`flex group bg-background transition-colors ${snapshot.isDragging ? 'shadow-lg ring-1 ring-primary z-50' : ''}`}
                                    >
                                      <div
                                        {...provided.dragHandleProps}
                                        className="w-12 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground border-r border-border shrink-0 py-4 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                                      >
                                        <span className="text-xs font-bold mb-1">{qOffset + index + 1}</span>
                                        <GripVertical size={16} />
                                      </div>
                                      <div className="flex-1 p-5">
                                        <div className="flex justify-between items-start gap-4">
                                          <h3 className="font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                                            {q.question}
                                          </h3>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => void deleteQuestion(sec.id, q.id)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                          >
                                            <Trash2 size={18} />
                                          </Button>
                                        </div>
                                        {q.imageUrl && (
                                          <div className="mt-3">
                                            <img
                                              src={q.imageUrl}
                                              alt="Question image"
                                              className="max-h-40 max-w-full rounded-lg border border-border object-contain bg-muted"
                                            />
                                          </div>
                                        )}
                                        <div className="mt-3">
                                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                            {q.type === 'multiple-choice'
                                              ? 'Multiple Choice'
                                              : q.type === 'truefalse'
                                                ? 'True/False'
                                                : q.type === 'coding'
                                                  ? 'Coding'
                                                  : 'Identification'}
                                          </span>
                                        </div>
                                        <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                          <span className="font-medium shrink-0">Answer:</span>
                                          {q.type === 'coding' ? (
                                            <div className="w-full">
                                              {q.options && q.options[0] && (
                                                <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-primary/10 text-primary rounded">{q.options[0]}</span>
                                              )}
                                              <div className="text-foreground font-mono text-xs whitespace-pre-wrap bg-muted p-2 rounded-md border w-full max-h-32 overflow-y-auto">
                                                {q.correctAnswer}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-foreground font-semibold">{q.correctAnswer}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        {activeSectionId === sec.id ? (
                          showQuestionForm ? (
                            addQuestionForm
                          ) : (
                            <div className="p-5">
                              <Button 
                                variant="outline" 
                                className="w-full border-dashed h-12 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all" 
                                onClick={() => setShowQuestionForm(true)}
                              >
                                <Plus className="mr-2" size={16} /> {sec.questions.length > 0 ? "Add another question" : "Add a question to this set"}
                              </Button>
                            </div>
                          )
                        ) : (
                          sec.questions.length === 0 && (
                            <p className="p-5 text-sm text-muted-foreground text-center italic bg-muted/10">
                              Click <span className="font-medium text-foreground">Add questions here</span> to add questions to this set.
                            </p>
                          )
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </DragDropContext>

        </div>
      </main>

      {ConfirmDialog}
    </div>
  )
}
