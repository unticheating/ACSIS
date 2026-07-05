import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Clock, Plus, Shuffle, Trash2, ArrowLeft, GripVertical, Layers, ImageIcon, X, Pencil, Copy, Calculator, Settings, Eye, EyeOff, Printer } from 'lucide-react'
import { Label } from '@/components/ui/label.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { apiFetch } from '@/lib/apiFetch.js'
import { formatSemesterLabel } from '@/lib/sectionLabel.js'
import { sumExamTotalPoints } from '@/lib/examPoints.js'
import { COPY } from '@/lib/examFlowUi.js'
import {
  getScrollableParent,
  isDocumentScrollRoot,
  lockPageScroll,
  scrollElementToViewportOffset,
} from '@/lib/preservePageScroll.js'
import {
  buildExamSectionsPayload,
  isPersistedEntityId,
  newLocalQuestionId,
} from '@/lib/examContentPayload.js'
import { mapExamToBuilderState, newSection } from '@/lib/mapExamToBuilder.js'
import {
  apiTypeFromFormType,
  formTypeFromQuestionType,
  identificationDisplayFromQuestion,
  joinIdentificationAnswersList,
  labelForFormType,
  labelForQuestionType,
  questionMatchesSectionType,
  syncSectionTitles,
} from '@/lib/questionTypes.js'
import { boilerplateInstructionsForFormType } from '@/lib/examSectionInstructions.js'
import SectionQuestionTypePicker from '@/components/exam/SectionQuestionTypePicker.jsx'
import { QuestionTypeIcon } from '@/components/exam/QuestionTypeIcon.jsx'
import ExamQuestionAnswerPresentation, {
  buildAnswerExplanationField,
  buildIdentificationQuestionFields,
} from '@/components/teacher/ExamQuestionAnswerPresentation.jsx'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { exportExamPaper } from '@/lib/teacherExamGradingApi.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Editor from '@monaco-editor/react'
import { MONACO_EXAM_EDITOR_OPTIONS } from '@/lib/monacoExamEditor.js'
import { DateTimePicker } from '@/components/ui/date-time-picker.jsx'
import MatchingPairEditor from '@/components/exam/MatchingPairEditor.jsx'
import DiagramEditor from '@/components/exam/DiagramEditor.jsx'
import {
  emptyMatchingPair,
  matchingPairsFromQuestion,
  normalizeMatchingPairs,
  serializeMatchingPairs,
} from '@/lib/matchingQuestion.js'
import { DEFAULT_DIAGRAM_VARIANT, emptyDiagramData } from '@/lib/diagramQuestion.js'
import '../../pages/teacher-ui/create_exam.css'

function emptyMatchingPairsState() {
  return [emptyMatchingPair()]
}

function emptyMc() {
  return { opt1: '', opt2: '', opt3: '', opt4: '', correct: '' }
}

const INITIAL_EXAM_SECTION = newSection(1)

export default function TeacherCreateExamPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  
  const [classes, setClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const classesQuery = searchParams.get('classes') || ''
  const editExamIdParam = searchParams.get('examId') || ''
  const isEditMode = Boolean(editExamIdParam)
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

  useEffect(() => {
    if (!editExamIdParam || !selectedClass) {
      setLoadingEditExam(false)
      return undefined
    }

    let cancelled = false
    async function loadExamForEdit() {
      setLoadingEditExam(true)
      try {
        const res = await apiFetch(`/api/teacher/classes/${selectedClass}/exams/${editExamIdParam}`)
        if (!res.ok) throw new Error('Failed to load exam for editing.')
        const exam = await res.json()
        if (cancelled) return

        const { sections: loadedSections, description } = mapExamToBuilderState(exam)
        setExamId(String(exam.id))
        setExamTitle(exam.title || '')
        setExamDescription(description)
        setSections(loadedSections)
        setActiveSectionId(loadedSections[0]?.id || INITIAL_EXAM_SECTION.id)
        const initialSection = loadedSections[0]
        if (initialSection?.questionType) {
          setQuestionType(initialSection.questionType)
        } else {
          const lastQuestion = loadedSections.flatMap((s) => s.questions).at(-1)
          if (lastQuestion) {
            setQuestionType(formTypeFromQuestionType(lastQuestion.type))
          }
        }
        setShuffleQuestions(!!exam.shuffleQuestions)
        setShuffleChoices(!!exam.shuffleChoices)
        setScheduledStart(exam.scheduledStart || '')
        setScheduledEnd(exam.scheduledEnd || '')
        setIsAutoPublish(!!exam.isAutoPublish)
        setLastSaved(new Date())
      } catch (err) {
        if (!cancelled) {
          acsisToastError(err instanceof Error ? err.message : 'Failed to load exam.')
        }
      } finally {
        if (!cancelled) setLoadingEditExam(false)
      }
    }

    void loadExamForEdit()
    return () => {
      cancelled = true
    }
  }, [editExamIdParam, selectedClass])

  const [examTitle, setExamTitle] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [examPassword, setExamPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [isAutoPublish, setIsAutoPublish] = useState(false)

  const [questionType, setQuestionType] = useState('multiple')
  const [questionText, setQuestionText] = useState('')
  const [questionPoints, setQuestionPoints] = useState(1)
  const [mc, setMc] = useState(emptyMc)
  const [identAcceptableAnswers, setIdentAcceptableAnswers] = useState('')
  const [identPresentationAnswer, setIdentPresentationAnswer] = useState('')
  const [answerExplanation, setAnswerExplanation] = useState('')
  const [tfAnswer, setTfAnswer] = useState('')
  const [codingAnswer, setCodingAnswer] = useState('')
  const [codingLanguage, setCodingLanguage] = useState('javascript')
  const [matchingPairs, setMatchingPairs] = useState(emptyMatchingPairsState)
  const [essayRubric, setEssayRubric] = useState('')
  const [diagramVariant, setDiagramVariant] = useState(DEFAULT_DIAGRAM_VARIANT)
  const [diagramReference, setDiagramReference] = useState(emptyDiagramData())
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

  const [examId, setExamId] = useState(editExamIdParam || null)
  const [loadingEditExam, setLoadingEditExam] = useState(Boolean(editExamIdParam))
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [composingQuestionSectionId, setComposingQuestionSectionId] = useState(null)
  const [editingQuestion, setEditingQuestion] = useState(/** @type {{ sectionId: string, questionId: string } | null} */ (null))
  const editPanelRef = useRef(null)
  const scrollSpyPausedRef = useRef(false)
  const scrollSpyPauseTimerRef = useRef(null)
  const scrollSpyRafRef = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isPrintingPaper, setIsPrintingPaper] = useState(false)
  const [draggingQuestionType, setDraggingQuestionType] = useState(/** @type {string | null} */ (null))

  // Bulk Points Modal States
  const [bulkPointsOpen, setBulkPointsOpen] = useState(false)
  const [bulkSectionId, setBulkSectionId] = useState(null)
  const [bulkPointsValue, setBulkPointsValue] = useState('')

  const resetMc = useCallback(() => setMc(emptyMc()), [])

  const resetAnswerFields = useCallback(() => {
    resetMc()
    setIdentAcceptableAnswers('')
    setIdentPresentationAnswer('')
    setAnswerExplanation('')
    setTfAnswer('')
    setCodingAnswer('')
    setCodingLanguage('javascript')
    setMatchingPairs(emptyMatchingPairsState())
    setEssayRubric('')
    setDiagramVariant(DEFAULT_DIAGRAM_VARIANT)
    setDiagramReference(emptyDiagramData())
  }, [resetMc])

  const resetQuestionForm = useCallback(() => {
    setQuestionText('')
    setQuestionPoints(1)
    resetAnswerFields()
    setQuestionImage(null)
    setEditingQuestion(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [resetAnswerFields])

  function cancelComposeQuestion() {
    setComposingQuestionSectionId(null)
    resetQuestionForm()
  }

  function beginAddQuestion(sectionId) {
    pauseScrollSpy()
    setActiveSectionId(sectionId)
    const section = sections.find((sec) => sec.id === sectionId)
    if (section?.questionType) setQuestionType(section.questionType)
    setEditingQuestion(null)
    resetQuestionForm()
    setComposingQuestionSectionId(sectionId)
  }

  function beginEditQuestion(sectionId, q) {
    const formType = formTypeFromQuestionType(q.type)
    setActiveSectionId(sectionId)
    setComposingQuestionSectionId(null)
    setEditingQuestion({ sectionId, questionId: String(q.id) })
    setQuestionType(formType)
    setQuestionText(q.question || '')

    if (formType === 'multiple') {
      const opts = q.options || []
      const correctIdx = opts.findIndex((opt) => opt === q.correctAnswer)
      setMc({
        opt1: opts[0] || '',
        opt2: opts[1] || '',
        opt3: opts[2] || '',
        opt4: opts[3] || '',
        correct: correctIdx >= 0 ? String(correctIdx + 1) : '',
      })
      setQuestionPoints(q.points || 1)
      setIdentAcceptableAnswers('')
      setIdentPresentationAnswer('')
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer('')
      setCodingAnswer('')
      setCodingLanguage('javascript')
    } else if (formType === 'identification') {
      setQuestionPoints(q.points || 1)
      resetMc()
      const { acceptable, presentation } = identificationDisplayFromQuestion(q)
      setIdentAcceptableAnswers(joinIdentificationAnswersList(acceptable))
      setIdentPresentationAnswer(presentation)
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer('')
      setCodingAnswer('')
      setCodingLanguage('javascript')
    } else if (formType === 'truefalse') {
      setQuestionPoints(q.points || 1)
      resetMc()
      setIdentAcceptableAnswers('')
      setIdentPresentationAnswer('')
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer(q.correctAnswer === 'True' ? 'true' : q.correctAnswer === 'False' ? 'false' : '')
      setCodingAnswer('')
      setCodingLanguage('javascript')
    } else if (formType === 'coding') {
      setQuestionPoints(q.points || 1)
      resetMc()
      setIdentAcceptableAnswers('')
      setIdentPresentationAnswer('')
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer('')
      setCodingLanguage(q.options?.[0] || q.language || 'javascript')
      setCodingAnswer(q.correctAnswer || '')
      setMatchingPairs(emptyMatchingPairsState())
      setEssayRubric('')
      setDiagramVariant(DEFAULT_DIAGRAM_VARIANT)
      setDiagramReference(emptyDiagramData())
    } else if (formType === 'matching') {
      setQuestionPoints(q.points || 1)
      resetMc()
      setIdentAcceptableAnswers('')
      setIdentPresentationAnswer('')
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer('')
      setCodingAnswer('')
      setCodingLanguage('javascript')
      setMatchingPairs(matchingPairsFromQuestion(q).length ? matchingPairsFromQuestion(q) : emptyMatchingPairsState())
      setEssayRubric('')
      setDiagramVariant(DEFAULT_DIAGRAM_VARIANT)
      setDiagramReference(emptyDiagramData())
    } else if (formType === 'essay') {
      setQuestionPoints(q.points || 1)
      resetMc()
      setIdentAcceptableAnswers('')
      setIdentPresentationAnswer('')
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer('')
      setCodingAnswer('')
      setCodingLanguage('javascript')
      setMatchingPairs(emptyMatchingPairsState())
      setEssayRubric(q.correctAnswer || '')
      setDiagramVariant(DEFAULT_DIAGRAM_VARIANT)
      setDiagramReference(emptyDiagramData())
    } else if (formType === 'diagramming') {
      setQuestionPoints(q.points || 1)
      resetMc()
      setIdentAcceptableAnswers('')
      setIdentPresentationAnswer('')
      setAnswerExplanation(q.answerExplanation || '')
      setTfAnswer('')
      setCodingAnswer('')
      setCodingLanguage('javascript')
      setMatchingPairs(emptyMatchingPairsState())
      setEssayRubric('')
      setDiagramVariant(q.diagramVariant || q.options?.[0] || DEFAULT_DIAGRAM_VARIANT)
      setDiagramReference(q.diagramReference || q.correctAnswer || emptyDiagramData())
    }

    setQuestionImage(q.imageUrl || null)
    if (imageInputRef.current) imageInputRef.current.value = ''

    window.requestAnimationFrame(() => {
      editPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  useEffect(() => {
    if (!editingQuestion) return undefined
    const timer = window.setTimeout(() => {
      editPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [editingQuestion])

  function cancelEditQuestion() {
    resetQuestionForm()
    setComposingQuestionSectionId(null)
  }

  function saveQuestion() {
    const text = questionText.trim()
    if (!text) {
      acsisToastError('Please enter a question.')
      return
    }

    const targetSectionForAdd =
      sections.find((sec) => sec.id === composingQuestionSectionId) ||
      sections.find((sec) => sec.id === activeSectionId) ||
      sections[sections.length - 1] ||
      null
    const effectiveQuestionType = editingQuestion
      ? questionType
      : targetSectionForAdd?.questionType || questionType

    let correctAnswer = ''
    let options = []

    if (effectiveQuestionType === 'multiple') {
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
    } else if (effectiveQuestionType === 'identification') {
      const identFields = buildIdentificationQuestionFields(
        identAcceptableAnswers,
        identPresentationAnswer,
        answerExplanation,
      )
      if (!identFields.correctAnswer) {
        acsisToastError('Enter at least one acceptable answer (comma-separated).')
        return
      }
      correctAnswer = identFields.correctAnswer
    } else if (effectiveQuestionType === 'truefalse') {
      if (!tfAnswer) {
        acsisToastError('Please select True or False.')
        return
      }
      correctAnswer = tfAnswer === 'true' ? 'True' : 'False'
    } else if (effectiveQuestionType === 'coding') {
      const code = codingAnswer.trim()
      if (!code) {
        acsisToastError('Please provide an expected solution or boilerplate code.')
        return
      }
      correctAnswer = code
      options = [codingLanguage]
    } else if (effectiveQuestionType === 'matching') {
      const pairs = normalizeMatchingPairs(matchingPairs)
      if (pairs.length < 2) {
        acsisToastError('Add at least two matching pairs.')
        return
      }
      correctAnswer = serializeMatchingPairs(pairs)
      options = []
    } else if (effectiveQuestionType === 'essay') {
      correctAnswer = essayRubric.trim() || 'Manual grading required'
      options = []
    } else if (effectiveQuestionType === 'diagramming') {
      correctAnswer = diagramReference
      options = [diagramVariant]
    }

    const typeLabel = apiTypeFromFormType(effectiveQuestionType)
    const normalizedMatching =
      effectiveQuestionType === 'matching' ? normalizeMatchingPairs(matchingPairs) : []
    const questionPayload = {
      type: typeLabel,
      question: text,
      points: Number(questionPoints) || 1,
      options,
      correctAnswer,
      imageUrl: questionImage || null,
      ...(effectiveQuestionType === 'identification'
        ? buildIdentificationQuestionFields(
            identAcceptableAnswers,
            identPresentationAnswer,
            answerExplanation,
          )
        : buildAnswerExplanationField(answerExplanation)),
      ...(effectiveQuestionType === 'matching'
        ? { matchingPairs: normalizedMatching, correctAnswer: serializeMatchingPairs(normalizedMatching) }
        : {}),
      ...(effectiveQuestionType === 'essay' ? { correctAnswer: essayRubric.trim() || 'Manual grading required' } : {}),
      ...(effectiveQuestionType === 'diagramming'
        ? {
            diagramVariant,
            diagramReference,
            options: [diagramVariant],
            correctAnswer: diagramReference,
          }
        : {}),
    }

    if (editingQuestion) {
      const sourceSection = sections.find((sec) => sec.id === editingQuestion.sectionId)
      const targetFormType = questionType

      if (sourceSection?.questionType === targetFormType) {
        setSections((prev) =>
          prev.map((sec) =>
            sec.id === editingQuestion.sectionId
              ? {
                  ...sec,
                  questions: sec.questions.map((q) =>
                    String(q.id) === String(editingQuestion.questionId)
                      ? { ...q, ...questionPayload }
                      : q,
                  ),
                }
              : sec,
          ),
        )
      } else {
        const targetSection = findSectionForFormType(sections, targetFormType)
        if (!targetSection) {
          acsisToastError(`Add a ${labelForFormType(targetFormType)} set before moving this question.`)
          return
        }

        setSections((prev) => {
          let next = prev.map((sec) =>
            sec.id === editingQuestion.sectionId
              ? {
                  ...sec,
                  questions: sec.questions.filter(
                    (q) => String(q.id) !== String(editingQuestion.questionId),
                  ),
                }
              : sec,
          )

          next = next.map((sec) =>
            sec.id === targetSection.id
              ? {
                  ...sec,
                  questions: [
                    ...sec.questions,
                    {
                      id: editingQuestion.questionId,
                      ...questionPayload,
                    },
                  ],
                }
              : sec,
          )

          return next
        })
        setActiveSectionId(targetSection.id)
      }
      acsisToastSuccess('Question updated.')
    } else {
      const targetSection = sections.find((sec) => sec.id === activeSectionId) || sections[sections.length - 1]
      if (!targetSection) {
        acsisToastError('Select a question set first.')
        return
      }
      if (!questionMatchesSectionType(typeLabel, targetSection.questionType)) {
        acsisToastError(`This set only accepts ${labelForFormType(targetSection.questionType)} questions.`)
        return
      }

      setSections((prev) =>
        prev.map((sec) =>
          sec.id === targetSection.id
            ? {
                ...sec,
                questions: [
                  ...sec.questions,
                  {
                    id: newLocalQuestionId(),
                    ...questionPayload,
                  },
                ],
              }
            : sec,
        ),
      )
    }

    resetQuestionForm()
    setComposingQuestionSectionId(null)
  }

  async function deleteQuestion(sectionId, questionId) {
    const ok = await confirm({
      title: 'Delete question?',
      description:
        isEditMode && isPersistedEntityId(questionId)
          ? 'If students already answered this question, the server will not remove it when you save. Edit the question instead, or remove only unanswered questions.'
          : 'This question will be removed from the set.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    if (editingQuestion && String(editingQuestion.questionId) === String(questionId)) {
      resetQuestionForm()
      setComposingQuestionSectionId(null)
    }
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, questions: sec.questions.filter((q) => String(q.id) !== String(questionId)) }
          : sec,
      ),
    )
  }

  function duplicateQuestion(sectionId, questionId) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec
        const source = sec.questions.find((q) => String(q.id) === String(questionId))
        if (!source) return sec
        const copy = {
          ...source,
          id: newLocalQuestionId(),
          options: Array.isArray(source.options) ? [...source.options] : source.options,
        }
        const nextQuestions = [...sec.questions]
        const index = nextQuestions.findIndex((q) => String(q.id) === String(questionId))
        nextQuestions.splice(index + 1, 0, copy)
        return { ...sec, questions: nextQuestions }
      }),
    )
    acsisToastSuccess('Question duplicated.')
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

  function applySectionPoints(sectionId, value) {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, questions: sec.questions.map((q) => ({ ...q, points: value })) }
          : sec,
      ),
    )
  }

  const handleBulkPointsClick = (sectionId) => {
    setBulkSectionId(sectionId)
    setBulkPointsValue('')
    setBulkPointsOpen(true)
  }

  const confirmBulkPoints = () => {
    const parsed = Number(bulkPointsValue)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      acsisToastError('Please enter a valid number greater than 0.')
      return
    }
    if (bulkSectionId == null) {
      acsisToastError('No section selected for bulk point assignment.')
      return
    }
    applySectionPoints(bulkSectionId, parsed)
    setBulkPointsOpen(false)
    setBulkSectionId(null)
    setBulkPointsValue('')
    acsisToastSuccess(`All questions in this set are now ${parsed} points.`)
  }

  function updateSection(sectionId, patch) {
    setSections((prev) => prev.map((sec) => (sec.id === sectionId ? { ...sec, ...patch } : sec)))
  }

  function findSectionForFormType(sectionList, formType) {
    return sectionList.find((sec) => sec.questionType === formType) || null
  }

  function changeSectionQuestionType(sectionId, nextType) {
    const section = sections.find((sec) => sec.id === sectionId)
    if (!section) return
    if (section.questions.length > 0) {
      acsisToastError('Remove all questions from this set before changing its type.')
      return
    }
    setSections((prev) =>
      syncSectionTitles(
        prev.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                questionType: nextType,
                description: boilerplateInstructionsForFormType(nextType),
              }
            : sec,
        ),
      ),
    )
  }

  function addSection() {
    setSections((prev) => {
      const next = newSection(prev.length + 1)
      setActiveSectionId(next.id)
      setComposingQuestionSectionId(null)
      return syncSectionTitles([...prev, next])
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
      const next = syncSectionTitles(prev.filter((s) => s.id !== sectionId))
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

  const totalPoints = useMemo(
    () =>
      sections.reduce(
        (sectionTotal, sec) =>
          sectionTotal + sec.questions.reduce((questionTotal, q) => questionTotal + Number(q.points || 1), 0),
        0,
      ),
    [sections],
  )

  const activeSection = useMemo(
    () => sections.find((sec) => sec.id === activeSectionId) || sections[0] || null,
    [sections, activeSectionId],
  )

  function getSectionAnchorElement(sectionId) {
    return document.querySelector(`#set-${sectionId} .exam-builder-panel--meta`)
      || document.getElementById(`set-${sectionId}`)
  }

  function getScrollSpyOffset() {
    const examHeader = document.querySelector('.exam-builder-page__header')
    if (!examHeader) return 96
    const { top, height } = examHeader.getBoundingClientRect()
    return top + height + 12
  }

  function pauseScrollSpy(durationMs = 1200) {
    scrollSpyPausedRef.current = true
    if (scrollSpyPauseTimerRef.current) {
      window.clearTimeout(scrollSpyPauseTimerRef.current)
    }
    scrollSpyPauseTimerRef.current = window.setTimeout(() => {
      scrollSpyPausedRef.current = false
      scrollSpyPauseTimerRef.current = null
    }, durationMs)
  }

  const syncOutlineFromScroll = useCallback(() => {
    if (scrollSpyPausedRef.current || composingQuestionSectionId || editingQuestion) return
    if (!sections.length) return

    const offset = getScrollSpyOffset()
    let nextId = sections[0].id

    for (const sec of sections) {
      const el = getSectionAnchorElement(sec.id)
      if (!el) continue
      if (el.getBoundingClientRect().top <= offset + 8) {
        nextId = sec.id
      } else {
        break
      }
    }

    setActiveSectionId((prev) => (prev === nextId ? prev : nextId))
  }, [sections, composingQuestionSectionId, editingQuestion])

  useEffect(() => {
    const scheduleSync = () => {
      if (scrollSpyRafRef.current != null) return
      scrollSpyRafRef.current = window.requestAnimationFrame(() => {
        scrollSpyRafRef.current = null
        syncOutlineFromScroll()
      })
    }

    const sectionEls = sections
      .map((sec) => getSectionAnchorElement(sec.id))
      .filter(Boolean)

    const scrollRoot = sectionEls[0] ? getScrollableParent(sectionEls[0]) : document.documentElement
    const observer =
      sectionEls.length > 0
        ? new IntersectionObserver(() => scheduleSync(), {
            root: isDocumentScrollRoot(scrollRoot) ? null : scrollRoot,
            rootMargin: `-${getScrollSpyOffset()}px 0px -50% 0px`,
            threshold: [0, 0.1, 0.5, 1],
          })
        : null

    sectionEls.forEach((el) => observer?.observe(el))
    scheduleSync()

    const passiveOpts = { passive: true }
    scrollRoot.addEventListener('scroll', scheduleSync, passiveOpts)
    window.addEventListener('resize', scheduleSync, passiveOpts)

    return () => {
      observer?.disconnect()
      scrollRoot.removeEventListener('scroll', scheduleSync, passiveOpts)
      window.removeEventListener('resize', scheduleSync, passiveOpts)
      if (scrollSpyRafRef.current != null) {
        window.cancelAnimationFrame(scrollSpyRafRef.current)
        scrollSpyRafRef.current = null
      }
      if (scrollSpyPauseTimerRef.current) {
        window.clearTimeout(scrollSpyPauseTimerRef.current)
        scrollSpyPauseTimerRef.current = null
      }
    }
  }, [syncOutlineFromScroll, sections])

  useEffect(() => {
    if (!settingsOpen) return undefined
    return lockPageScroll()
  }, [settingsOpen])

  function activateSection(sectionId) {
    pauseScrollSpy()
    if (sectionId !== activeSectionId) {
      if (editingQuestion) {
        cancelEditQuestion()
      } else {
        resetQuestionForm()
      }
    }
    setActiveSectionId(sectionId)
    setComposingQuestionSectionId(null)
    const section = sections.find((sec) => sec.id === sectionId)
    if (section?.questionType) {
      setQuestionType(section.questionType)
    }
  }

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
          sections: buildExamSectionsPayload(sections),
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
            // Removed refresh from server: fetching and setting sections here
            // caused infinite autosave loops and unmounted the inline editor
            // for newly added questions because local IDs were replaced.
          } else {
            const data = await res.json().catch(() => ({}))
            acsisToastError(data.error || 'Could not save exam changes.')
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
      sections: buildExamSectionsPayload(sections),
      shuffleQuestions,
      shuffleChoices,
      scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      isAutoPublish,
      status: 'draft',
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
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update exam.')
        }
      }
      
      const createdIds = [mainExamId]

      const other = isEditMode ? [] : createForClasses.filter((id) => String(id) !== String(selectedClass))
      const copyResults = await Promise.allSettled(
        other.map(async (clsId) => {
          const r = await apiFetch(`/api/teacher/classes/${clsId}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const d = await r.json().catch(() => ({}))
          if (!r.ok) {
            throw new Error(d.error || `Failed to duplicate exam for class ${clsId}`)
          }
          return d.examId
        }),
      )

      const failedCopies = copyResults.filter((result) => result.status === 'rejected')
      const successfulCopies = copyResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)

      createdIds.push(...successfulCopies.filter(Boolean))
      if (failedCopies.length > 0) {
        console.error('Failed to duplicate exam for classes:', failedCopies)
      }

      const codeMsg = examCode ? ` Exam password: ${examCode}.` : ''
      acsisToastSuccess(
        isEditMode
          ? `Exam "${title}" updated (${totalQuestions} questions, ${sections.length} set(s)).${codeMsg}`
          : `Exam "${title}" saved for ${createdIds.length} class(es) (${totalQuestions} questions, ${sections.length} set(s)).${codeMsg} Publish from the class page when ready.`,
      )
      if (isEditMode && mainExamId) {
        navigate(`/teacher/my-classes/${selectedClass}/exams/${mainExamId}`)
      } else {
        navigate(`/teacher/my-classes/${selectedClass}`)
      }
    } catch (err) {
      acsisToastError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function normalizeDroppableSectionId(droppableId) {
    return String(droppableId).replace(/^outline-/, '')
  }

  function onDragStart(start) {
    const sourceSectionId = normalizeDroppableSectionId(start.source.droppableId)
    const sourceSection = sections.find((sec) => String(sec.id) === sourceSectionId)
    const question = sourceSection?.questions[start.source.index]
    setDraggingQuestionType(question ? formTypeFromQuestionType(question.type) : null)
  }

  function onDragEnd(result) {
    setDraggingQuestionType(null)
    if (!result.destination) return
    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    const sourceSectionId = normalizeDroppableSectionId(result.source.droppableId)
    const destSectionId = normalizeDroppableSectionId(result.destination.droppableId)
    const isOutlineDest = String(result.destination.droppableId).startsWith('outline-')

    if (sourceSectionId === destSectionId && !isOutlineDest) {
      if (sourceIndex === destinationIndex) return
      setSections((prev) =>
        prev.map((sec) => {
          if (String(sec.id) !== sourceSectionId) return sec
          const newQuestions = Array.from(sec.questions)
          const [moved] = newQuestions.splice(sourceIndex, 1)
          newQuestions.splice(destinationIndex, 0, moved)
          return { ...sec, questions: newQuestions }
        })
      )
    } else {
      setSections((prev) => {
        const next = [...prev]
        const sourceSecIndex = next.findIndex((s) => String(s.id) === sourceSectionId)
        const destSecIndex = next.findIndex((s) => String(s.id) === destSectionId)
        if (sourceSecIndex === -1 || destSecIndex === -1) return prev

        const sourceSec = { ...next[sourceSecIndex], questions: [...next[sourceSecIndex].questions] }
        const destSec = { ...next[destSecIndex], questions: [...next[destSecIndex].questions] }

        const [moved] = sourceSec.questions.splice(sourceIndex, 1)
        if (
          sourceSectionId !== destSectionId &&
          !questionMatchesSectionType(moved.type, destSec.questionType)
        ) {
          acsisToastError(`Move questions only between sets of the same type (${labelForFormType(destSec.questionType)}).`)
          return prev
        }

        const destIndex = isOutlineDest ? destSec.questions.length : destinationIndex
        destSec.questions.splice(destIndex, 0, moved)

        next[sourceSecIndex] = sourceSec
        next[destSecIndex] = destSec
        return next
      })
    }
  }

  const hourLabel = (h) => (h === 0 ? '00' : String(h))

  const optionsBlock = useMemo(() => {
    if (questionType === 'multiple') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Options</Label>
            <p className="text-xs text-muted-foreground">
              Select the radio button next to the correct option.
            </p>
            {['opt1', 'opt2', 'opt3', 'opt4'].map((key, idx) => {
              const optionNum = idx + 1
              const isCorrect = String(mc.correct) === String(optionNum)
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mc-correct"
                    id={`mc-correct-${optionNum}`}
                    value={String(optionNum)}
                    checked={isCorrect}
                    onChange={() => setMc((m) => ({ ...m, correct: String(optionNum) }))}
                    className="h-4 w-4 shrink-0 accent-emerald-600"
                    aria-label={`Mark option ${optionNum} as correct`}
                  />
                  <Input
                    type="text"
                    placeholder={`Option ${optionNum}`}
                    value={mc[key]}
                    onChange={(e) => setMc((m) => ({ ...m, [key]: e.target.value }))}
                    className={
                      isCorrect
                        ? 'flex-1 border-2 shadow-sm transition-all !border-emerald-500 !bg-emerald-50 !text-emerald-950 dark:!border-[1px] dark:!border-emerald-400 dark:!bg-emerald-900/50 dark:!text-emerald-100'
                        : 'flex-1 border border-input transition-all'
                    }
                    style={
                      isCorrect
                        ? {
                            backgroundColor: isCorrect ? '#10b981' : undefined,
                            boxShadow: isCorrect ? '0 0 0 1px #18af4f' : undefined,
                          }
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    if (questionType === 'identification') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Acceptable answers (comma-separated)</Label>
            <Input
              type="text"
              placeholder="e.g. PARIS, PARIS FRANCE, FRANCE"
              value={identAcceptableAnswers}
              onChange={(e) => setIdentAcceptableAnswers(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Separate each valid answer with a comma. All are counted correct when grading.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Presentation answer</Label>
            <Input
              type="text"
              placeholder="Answer shown in the answer key (ultimate answer)"
              value={identPresentationAnswer}
              onChange={(e) => setIdentPresentationAnswer(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              spellCheck={false}
              style={{ textTransform: 'uppercase' }}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the first acceptable answer.
            </p>
          </div>
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
                options={MONACO_EXAM_EDITOR_OPTIONS}
              />
            </div>
          </div>
        </div>
      )
    }
    if (questionType === 'matching') {
      return (
        <div className="space-y-2">
          <Label>Matching pairs</Label>
          <MatchingPairEditor pairs={matchingPairs} onChange={setMatchingPairs} />
        </div>
      )
    }
    if (questionType === 'essay') {
      return (
        <div className="space-y-2">
          <Label>Sample answer / rubric (optional)</Label>
          <textarea
            rows={6}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[140px]"
            placeholder="Optional rubric or sample answer for manual grading..."
            value={essayRubric}
            onChange={(e) => setEssayRubric(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Essay questions are graded manually by the teacher.</p>
        </div>
      )
    }
    if (questionType === 'diagramming') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Diagram type</Label>
            <select
              value={diagramVariant}
              onChange={(e) => setDiagramVariant(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="flowchart">Flowchart</option>
              <option value="erd">ERD (Entity Relationship)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Reference Diagram</Label>
            <DiagramEditor
              variant={diagramVariant}
              value={diagramReference}
              onChange={setDiagramReference}
              height={500}
            />
            <p className="text-xs text-muted-foreground">
              This diagram will be used as the reference answer when presenting the exam.
            </p>
          </div>
        </div>
      )
    }
    return null
  }, [
    diagramReference,
    diagramVariant,
    essayRubric,
    identAcceptableAnswers,
    identPresentationAnswer,
    matchingPairs,
    mc,
    questionType,
    tfAnswer,
    codingAnswer,
    codingLanguage,
  ])

  const renderQuestionForm = (isEditing, composeSection = null) => (
    <div className={`exam-builder-panel__body space-y-6${isEditing ? ' exam-builder-inline-editor__body' : ''}`}>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-2">
          <div className="grid grid-cols-2 gap-6">
            {isEditing ? (
              <div className="space-y-2">
                <Label>Question Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={questionType}
                  onChange={(e) => {
                    setQuestionType(e.target.value)
                    resetAnswerFields()
                  }}
                >
                  <option value="multiple">Multiple Choice</option>
                  <option value="identification">Identification</option>
                  <option value="truefalse">True / False</option>
                  <option value="coding">Coding / Scripting</option>
                  <option value="matching">Matching</option>
                  <option value="essay">Essay / Paragraph</option>
                  <option value="diagramming">Diagramming</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Question Type</Label>
                <div className="exam-builder-set-type-locked flex h-10 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                  <QuestionTypeIcon
                    formType={composeSection?.questionType || activeSection?.questionType || questionType}
                    size={16}
                    className="text-primary"
                  />
                  <span>
                    {labelForFormType(composeSection?.questionType || activeSection?.questionType || questionType)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                value={questionPoints}
                onChange={(e) => setQuestionPoints(Number(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Question Text</Label>
            <textarea
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px]"
              placeholder="Enter your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (ev) => setQuestionImage(ev.target.result)
                      reader.readAsDataURL(file)
                      break;
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Image Attachment */}
        <div className="space-y-2 md:col-span-1">
          <Label className="flex items-center gap-1.5">
            <ImageIcon size={14} className="text-muted-foreground" />
            Attach Image <span className="font-normal text-muted-foreground">(max 2 MB)</span>
          </Label>
          {questionImage ? (
            <div className="relative inline-block w-full">
              <img
                src={questionImage}
                alt="Question attachment"
                className="max-h-48 max-w-full w-full rounded-lg border border-border object-contain bg-muted"
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
              className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all h-[calc(100%-1.5rem)] min-h-[140px]"
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  if (file.size > 2 * 1024 * 1024) {
                    acsisToastError('Image must be smaller than 2 MB.')
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = (ev) => setQuestionImage(ev.target.result)
                  reader.readAsDataURL(file)
                }
              }}
            >
              <div className="text-center">
                <ImageIcon size={24} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Drop image here</p>
                <p className="text-xs text-muted-foreground/80 mt-1">or click to browse</p>
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
      </div>

      <div className="pt-4 exam-builder-options-divider">{optionsBlock}</div>
      <div className="space-y-2">
        <Label>Explain (optional)</Label>
        <textarea
          className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Why this is the correct answer — shown on the exam Questions tab"
          value={answerExplanation}
          onChange={(e) => setAnswerExplanation(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={saveQuestion} className="w-full md:w-auto">
          {isEditing ? <Pencil size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
          {isEditing ? 'Update question' : 'Save question'}
        </Button>
        {isEditing ? (
          <Button type="button" variant="outline" onClick={cancelEditQuestion} className="w-full md:w-auto">
            Cancel edit
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={cancelComposeQuestion} className="w-full md:w-auto">
            Cancel
          </Button>
        )}
      </div>
    </div>
  )

  const backHref = isEditMode && examId
    ? `/teacher/my-classes/${selectedClass}/exams/${examId}`
    : selectedClass
      ? `/teacher/my-classes/${selectedClass}`
      : '/teacher/my-classes'

  function handlePreview() {
    const payload = buildExamSectionsPayload(sections)
    const flatQuestions = payload.flatMap((sec) => sec.questions.map(q => ({ ...q, sectionId: sec.id, sectionTitle: sec.title, sectionDescription: sec.description })))
    const previewData = {
      title: examTitle || 'Untitled Exam',
      description: examDescription,
      scheduledStart: new Date().toISOString(),
      scheduledEnd: null,
      status: 'open',
      sections: payload,
      questions: flatQuestions
    }
    localStorage.setItem('examPreviewData', JSON.stringify(previewData))
    window.open('/student/exam/session?classId=preview&examId=preview', '_blank')
  }

  async function handlePrintPaper() {
    if (!selectedClass) {
      acsisToastError('Select a target class before printing.')
      return
    }
    if (!examId) {
      acsisToastError('Save the exam draft first, then print the paper.')
      return
    }
    if (totalQuestions === 0) {
      acsisToastError('Add at least one question before printing.')
      return
    }

    setIsPrintingPaper(true)
    try {
      await exportExamPaper(selectedClass, examId, {
        teacherLogoBase64: localStorage.getItem('acsis_teacher_logo') || undefined,
        departmentName: localStorage.getItem('acsis_department_name') || undefined,
      })
      acsisToastSuccess('Exam paper PDF downloaded.')
    } catch (err) {
      acsisToastError(err instanceof Error ? err.message : 'Failed to generate exam paper PDF.')
    } finally {
      setIsPrintingPaper(false)
    }
  }

  if (loadingEditExam) {
    return (
      <div className="flex items-center justify-center h-full min-h-[320px] p-8 text-muted-foreground">
        Loading exam…
      </div>
    )
  }

  return (
    <div className="exam-builder-page acsis-create-exam flex flex-col min-h-[calc(100vh-64px)]">
      {/* TOP HEADER */}
      <header className="exam-builder-page__header border-b border-border px-6 py-4 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="rounded-full text-muted-foreground hover:text-foreground shrink-0">
            <Link to={backHref}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground line-clamp-1 max-w-[400px]">
              {examTitle || (isEditMode ? 'Edit exam' : 'Exam Builder')}
            </h1>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {sections.length} {sections.length === 1 ? 'set' : 'sets'} · {totalQuestions}{' '}
              {totalQuestions === 1 ? 'question' : 'questions'}
            </p>
            {isSaving ? (
              <span className="text-xs font-medium text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-full animate-pulse whitespace-nowrap">Saving...</span>
            ) : lastSaved ? (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                {isEditMode ? 'Changes saved' : 'Draft saved'}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={handlePreview} title="Preview Student View" className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8">
            <Eye size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Exam Settings" className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8">
            <Settings size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handlePrintPaper()}
            disabled={isPrintingPaper || totalQuestions === 0}
            title="Print exam paper (PDF)"
            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <Printer size={18} className={isPrintingPaper ? 'animate-pulse' : ''} />
          </Button>
        </div>
      </header>

      {/* SETTINGS OVERLAY */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-card border-l border-border shadow-2xl transform transition-transform duration-300 z-[9999] flex flex-col ${settingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={18} />
            Exam Settings
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)} className="rounded-full">
            <X size={20} />
          </Button>
        </div>
        
        <div className="p-6 flex-1 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Target Class</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isEditMode || loadingClasses}
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
                        {c.name} ({c.academicYear} - {formatSemesterLabel(c.semester)})
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

            <div className="exam-builder-card bg-primary/5 border-primary/20 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Calculator size={16} />
                  Blueprint Summary
                </div>
              </div>
              <div className="grid gap-3 text-sm text-foreground">
                <div className="flex items-center justify-between rounded-md bg-background/80 p-3 border border-primary/10">
                  <span>Total questions</span>
                  <span className="font-semibold">{totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-background/80 p-3 border border-primary/10">
                  <span>Total points</span>
                  <span className="font-semibold">{totalPoints}</span>
                </div>
              </div>
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
              <div className="relative">
                <Input
                  id="exam-password"
                  type={showPassword ? 'text' : 'password'}
                  maxLength={20}
                  autoComplete="new-password"
                  placeholder={isEditMode ? 'Leave blank to keep current password' : 'Leave blank for open lobby'}
                  value={examPassword}
                  onChange={(e) => setExamPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex="-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isEditMode ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Change the exam password from the exam detail page after publishing.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground leading-relaxed">{COPY.examPassword}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{COPY.classAccessCode}</p>
            </div>

            <div className="space-y-4 pt-5 mt-2 border-t border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Exam Scheduling</p>
                <p className="text-xs text-muted-foreground mt-1">If set, the exam will strictly start and end at these times.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    Start Time
                  </Label>
                  <DateTimePicker
                    value={scheduledStart ? new Date(scheduledStart) : undefined}
                    onChange={(date) => setScheduledStart(date ? date.toISOString() : '')}
                    placeholder="Select start date & time"
                    className="w-full"
                    disablePast
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    End Time
                  </Label>
                  <DateTimePicker
                    value={scheduledEnd ? new Date(scheduledEnd) : undefined}
                    onChange={(date) => setScheduledEnd(date ? date.toISOString() : '')}
                    placeholder="Select end date & time"
                    className="w-full"
                    disablePast
                    minDateTime={scheduledStart ? new Date(scheduledStart) : undefined}
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

      </div>
      {settingsOpen && <div className="fixed inset-0 bg-black/20 z-[9998] backdrop-blur-sm transition-opacity" onClick={() => setSettingsOpen(false)} />}

      {/* MAIN CONTENT - QUESTIONS BUILDER */}
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="exam-builder-page__body flex flex-1 items-start">
        {/* SIDEBAR OUTLINE */}
        <aside className="exam-builder-page__outline w-56 lg:w-64 hidden md:block shrink-0 self-start overflow-y-auto">
          <div className="p-6">
            <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wider">Exam Outline</h3>
            <ul className="space-y-1">
              {sections.map((sec) => {
                const questionCount = sec.questions.length
                const setPoints = sumExamTotalPoints(sec.questions)
                const isEmpty = questionCount === 0
                const sectionFormType = sec.questionType || 'multiple'
                const canAcceptDrag =
                  draggingQuestionType == null || draggingQuestionType === sectionFormType
                return (
                <Droppable
                  key={sec.id}
                  droppableId={`outline-${sec.id}`}
                  isDropDisabled={draggingQuestionType != null && !canAcceptDrag}
                >
                  {(provided, snapshot) => (
                <li
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="list-none"
                >
                  <a
                    href={`#set-${sec.id}`}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                      activeSectionId === sec.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }${isEmpty ? ' exam-builder-outline-item--empty' : ''}${
                      snapshot.isDraggingOver && canAcceptDrag ? ' exam-builder-outline-item--drop-target' : ''
                    }${
                      draggingQuestionType && !canAcceptDrag ? ' exam-builder-outline-item--drop-disabled' : ''
                    }${
                      draggingQuestionType && canAcceptDrag && !snapshot.isDraggingOver
                        ? ' exam-builder-outline-item--drop-ready'
                        : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      const sectionId = sec.id
                      activateSection(sectionId)
                      window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                          const el = getSectionAnchorElement(sectionId)
                          if (el) {
                            scrollElementToViewportOffset(el, getScrollSpyOffset(), 'smooth')
                          }
                        })
                      })
                    }}
                  >
                    <span className="line-clamp-2">
                      {sec.title || labelForFormType(sec.questionType)}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium opacity-80">
                      {snapshot.isDraggingOver && canAcceptDrag
                        ? 'Release to move question here'
                        : isEmpty
                          ? draggingQuestionType && canAcceptDrag
                            ? 'Drop question here'
                            : 'No questions yet'
                          : `${questionCount} ${questionCount === 1 ? 'question' : 'questions'} · ${setPoints} ${setPoints === 1 ? 'pt' : 'pts'}`}
                    </span>
                  </a>
                  {provided.placeholder}
                </li>
                  )}
                </Droppable>
                )
              })}
            </ul>
          </div>
        </aside>

        <main className="exam-builder flex-1 p-6 md:p-8 lg:p-12 min-w-0">
          <div className="max-w-5xl mx-auto space-y-8">
          
            <div className="exam-builder-sets">
              {sections.map((sec, secIndex) => {
                let qOffset = 0
                for (let i = 0; i < secIndex; i++) qOffset += sections[i].questions.length
                const isActiveSet = activeSectionId === sec.id
                return (
                  <div key={sec.id} id={`set-${sec.id}`} className="exam-builder-set">
                    <section
                      className={`exam-builder-panel exam-builder-panel--meta${isActiveSet ? ' exam-builder-panel--active' : ''}`}
                    >
                      <div className="exam-builder-panel__head">
                        <div className="exam-builder-set-head">
                          <p className="exam-builder-panel__eyebrow">Question set {secIndex + 1}</p>
                          <SectionQuestionTypePicker
                            value={sec.questionType || 'multiple'}
                            onChange={(nextType) => changeSectionQuestionType(sec.id, nextType)}
                            disabled={sec.questions.length > 0}
                            className="exam-builder-set-head__type"
                          />
                          {sec.questions.length > 0 ? (
                            <p className="exam-builder-set-head__hint">
                              Type is locked while this set has questions.
                            </p>
                          ) : null}
                        </div>
                        <div className="exam-builder-panel__actions">
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
                      <div className="exam-builder-panel__body exam-builder-panel__body--meta">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Instructions for students
                          </Label>
                          <textarea
                            rows={2}
                            value={sec.description}
                            onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                            placeholder={boilerplateInstructionsForFormType(sec.questionType || 'multiple')}
                            className="exam-builder-field flex w-full rounded-md bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[72px]"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="exam-builder-panel exam-builder-panel--questions">
                      <div className="exam-builder-panel__head">
                        <div>
                          <p className="exam-builder-panel__title">Questions</p>
                          <p className="exam-builder-panel__subtitle">
                            {sec.questions.length}{' '}
                            {sec.questions.length === 1 ? 'question' : 'questions'} in this set
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {sec.questions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleBulkPointsClick(sec.id)}
                              className="exam-builder-shuffle-btn"
                            >
                              Set all points
                            </button>
                          )}
                          {sec.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => shuffleSectionQuestions(sec.id)}
                              className="exam-builder-shuffle-btn"
                            >
                              <Shuffle size={14} />
                              Shuffle
                            </button>
                          )}
                          {!editingQuestion && composingQuestionSectionId !== sec.id ? (
                            <button
                              type="button"
                              onClick={() => beginAddQuestion(sec.id)}
                              className="exam-builder-shuffle-btn exam-builder-shuffle-btn--primary"
                            >
                              <Plus size={14} />
                              Add question
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="exam-builder-panel__body exam-builder-panel__body--questions">
                        <Droppable
                          droppableId={String(sec.id)}
                          isDropDisabled={
                            draggingQuestionType != null &&
                            draggingQuestionType !== (sec.questionType || 'multiple')
                          }
                        >
                          {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`exam-builder-question-list${
                                sec.questions.length === 0 ? ' exam-builder-question-list--empty' : ''
                              }${snapshot.isDraggingOver ? ' exam-builder-question-list--drop-target' : ''}`}
                            >
                              {sec.questions.length === 0 && (
                                <p
                                  className={`exam-builder-empty-hint${
                                    snapshot.isDraggingOver ? ' exam-builder-empty-hint--drop' : ''
                                  }`}
                                >
                                  {snapshot.isDraggingOver
                                    ? 'Release to move question to this set'
                                    : `Drag ${labelForFormType(sec.questionType)} questions here from another set of the same type`}
                                </p>
                              )}
                              {sec.questions.map((q, index) => {
                                const isEditingThis =
                                  editingQuestion?.sectionId === sec.id &&
                                  editingQuestion?.questionId === String(q.id)
                                return (
                                <Draggable key={q.id} draggableId={String(q.id)} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      style={provided.draggableProps.style}
                                      className={`exam-builder-question group${
                                        snapshot.isDragging ? ' exam-builder-question--dragging' : ''
                                      }${isEditingThis ? ' exam-builder-question--editing' : ''}`}
                                    >
                                      <div
                                        {...provided.dragHandleProps}
                                        className="exam-builder-question__grip"
                                      >
                                        <span className="exam-builder-question__num">{qOffset + index + 1}</span>
                                        <GripVertical size={16} />
                                      </div>
                                      <div className="exam-builder-question__content">
                                        <div className="flex justify-between items-start gap-4">
                                          <div>
                                            <h3 className="font-medium text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4" title={q.question}>
                                              {q.question}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {q.points ?? 1} pts · {labelForQuestionType(q.type)}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => duplicateQuestion(sec.id, q.id)}
                                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                              aria-label="Duplicate question"
                                            >
                                              <Copy size={17} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => beginEditQuestion(sec.id, q)}
                                              className={`text-muted-foreground hover:text-primary hover:bg-primary/10 transition-opacity ${
                                                isEditingThis
                                                  ? 'text-primary bg-primary/10 opacity-100'
                                                  : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                                              }`}
                                              aria-label="Edit question"
                                              aria-pressed={isEditingThis}
                                            >
                                              <Pencil size={17} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => void deleteQuestion(sec.id, q.id)}
                                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                              aria-label="Delete question"
                                            >
                                              <Trash2 size={18} />
                                            </Button>
                                          </div>
                                        </div>
                                        {q.imageUrl && (
                                          <div className="mt-3">
                                            <img
                                              src={q.imageUrl}
                                              alt="Question image"
                                              className="max-h-40 max-w-full rounded-lg object-contain bg-muted/80"
                                            />
                                          </div>
                                        )}
                                        <div className="mt-3">
                                          <span className="exam-builder-type-badge">
                                            <QuestionTypeIcon type={q.type} size={12} className="mr-1" />
                                            {labelForQuestionType(q.type)}
                                          </span>
                                        </div>
                                        <ExamQuestionAnswerPresentation question={q} className="mt-3" />
                                        {isEditingThis ? (
                                          <div
                                            ref={editPanelRef}
                                            className="exam-builder-inline-editor"
                                          >
                                            <div className="exam-builder-inline-editor__head">
                                              <Pencil size={15} aria-hidden />
                                              <span>Edit question {qOffset + index + 1}</span>
                                            </div>
                                            {renderQuestionForm(true)}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        {composingQuestionSectionId === sec.id && !editingQuestion ? (
                          <section className="exam-builder-panel exam-builder-panel--composer exam-builder-panel--active mt-4">
                            <div className="exam-builder-panel__head">
                              <div>
                                <p className="exam-builder-panel__title">New question</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={cancelComposeQuestion}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                            {renderQuestionForm(false, sec)}
                          </section>
                        ) : null}
                      </div>
                    </section>
                  </div>
                )
              })}
            </div>
          
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={addSection}
              className="gap-2 shadow-sm bg-background hover:bg-muted"
            >
              <Plus size={16} />
              Add new set
            </Button>
          </div>

        </div>
      </main>
      </div>
      </DragDropContext>

      {ConfirmDialog}

      {/* Bulk Points Assignment Modal Dialog */}
      <Dialog open={bulkPointsOpen} onOpenChange={setBulkPointsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Set Bulk Points for Set</DialogTitle>
            <DialogDescription>
              Assign uniform point weights to every item inside this question set. Individual overrides will be overwritten.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-points-input">Points per question</Label>
              <Input
                id="bulk-points-input"
                type="number"
                min="1"
                placeholder="e.g. 2"
                value={bulkPointsValue}
                onChange={(e) => setBulkPointsValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmBulkPoints()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkPointsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBulkPoints}>
              Apply Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
