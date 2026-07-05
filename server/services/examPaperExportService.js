import PDFDocument from 'pdfkit'
import { formatSemesterLabel } from '../lib/termLabel.js'
import { resolveMatchingPayload } from '../lib/matchingAnswers.js'
import { resolvePrintedSectionInstructions } from '../lib/examSectionInstructions.js'
import {
  drawReportHeader,
  setFont,
  stampReportFooters,
} from '../lib/pdfReportBranding.js'
import { getExamWithQuestionsQuery } from '../repositories/examRepository.js'
import { getTeacherClassByIdQuery } from '../repositories/classRepository.js'
import { getMemberDisplayNameQuery } from '../repositories/examResultsRepository.js'

const LETTER_PAGE_WIDTH = 612
const PAPER_MARGIN = 36
const PAPER_CONTENT_WIDTH = LETTER_PAGE_WIDTH - PAPER_MARGIN * 2
const DIAGRAM_BOX_HEIGHT = 210
const ANSWER_BLANK = '____________'
const MATCHING_ANSWER_BLANK = '____'

function paperEnsureSpace(doc, needed = 48) {
  if (doc.y > doc.page.height - PAPER_MARGIN - needed) {
    doc.addPage()
  }
}

function normalizeQuestionType(type) {
  const raw = String(type || '').toLowerCase()
  if (raw === 'multiple-choice' || raw === 'multiple' || raw === 'mcq') return 'multiple-choice'
  if (raw === 'truefalse' || raw === 'true_false') return 'truefalse'
  return raw || 'identification'
}

function stripMarkup(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function groupQuestionsBySection(exam) {
  const sections = Array.isArray(exam.sections) && exam.sections.length
    ? [...exam.sections].sort((a, b) => Number(a.orderNum || 0) - Number(b.orderNum || 0))
    : [{ id: null, title: 'Questions', description: '' }]

  const grouped = sections.map((section) => ({
    ...section,
    questions: (exam.questions || []).filter((q) => q.sectionId === section.id),
  }))

  const knownIds = new Set(sections.map((s) => s.id))
  const orphans = (exam.questions || []).filter((q) => !q.sectionId || !knownIds.has(q.sectionId))
  if (orphans.length) {
    grouped.push({ id: 'orphan', title: 'Questions', description: '', questions: orphans })
  }

  return grouped.filter((section) => section.questions.length > 0)
}

function drawAnswerLines(doc, lineCount = 8) {
  const lineSpacing = 30
  for (let i = 0; i < lineCount; i++) {
    paperEnsureSpace(doc, lineSpacing + 6)
    doc.moveTo(PAPER_MARGIN + 14, doc.y).lineTo(PAPER_MARGIN + PAPER_CONTENT_WIDTH, doc.y).strokeColor('#d1d5db').stroke()
    doc.y += lineSpacing
  }
}

function drawPaperQuestion(doc, question, number) {
  const type = normalizeQuestionType(question.type)
  const questionText = stripMarkup(question.question) || 'Untitled question'
  const points = Number(question.points || 1)
  const pointsLabel = `(${points} ${points === 1 ? 'pt' : 'pts'})`

  paperEnsureSpace(doc, 72)
  setFont(doc, 'bold')
  doc.fontSize(10).fillColor('#111827')

  let questionLine = `${number}. ${questionText} ${pointsLabel}`
  if (type === 'identification' || type === 'truefalse') {
    questionLine = `${ANSWER_BLANK} ${number}. ${questionText} ${pointsLabel}`
  }

  doc.text(questionLine, PAPER_MARGIN, doc.y, {
    width: PAPER_CONTENT_WIDTH,
  })
  doc.moveDown(0.35)

  setFont(doc, 'regular')
  doc.fontSize(10).fillColor('#1f2937')

  if (type === 'multiple-choice') {
    const options = Array.isArray(question.options) ? question.options : []
    options.forEach((option, index) => {
      paperEnsureSpace(doc, 18)
      const letter = String.fromCharCode(65 + index)
      doc.text(`${letter}. ${stripMarkup(option)}`, PAPER_MARGIN + 14, doc.y, { width: PAPER_CONTENT_WIDTH - 14 })
      doc.moveDown(0.2)
    })
  } else if (type === 'matching') {
    const pairs = resolveMatchingPayload(question)
    const leftItems = pairs.map((pair) => pair.left)
    const rightItems = pairs.map((pair) => pair.right)
    const colWidth = (PAPER_CONTENT_WIDTH - 28) / 2
    const startY = doc.y

    setFont(doc, 'bold')
    doc.fontSize(9).fillColor('#4b5563')
    doc.text('Column A', PAPER_MARGIN + 14, startY, { width: colWidth })
    doc.text('Column B', PAPER_MARGIN + 14 + colWidth + 8, startY, { width: colWidth })
    doc.moveDown(0.5)

    setFont(doc, 'regular')
    doc.fontSize(10).fillColor('#1f2937')
    const rowStartY = doc.y
    leftItems.forEach((item, index) => {
      doc.text(`${MATCHING_ANSWER_BLANK} ${index + 1}. ${item}`, PAPER_MARGIN + 14, rowStartY + index * 16, { width: colWidth })
    })
    rightItems.forEach((item, index) => {
      doc.text(`${String.fromCharCode(65 + index)}. ${item}`, PAPER_MARGIN + 14 + colWidth + 8, rowStartY + index * 16, {
        width: colWidth,
      })
    })
    doc.y = rowStartY + Math.max(leftItems.length, rightItems.length) * 16 + 8
  } else if (type === 'essay') {
    doc.moveDown(0.35)
    drawAnswerLines(doc, 10)
  } else if (type === 'coding') {
    doc.moveDown(0.2)
    doc.fontSize(9).fillColor('#6b7280').text('Write your code below.', PAPER_MARGIN + 14, doc.y)
    doc.moveDown(0.35)
    const boxTop = doc.y
    paperEnsureSpace(doc, 130)
    doc.rect(PAPER_MARGIN + 14, boxTop, PAPER_CONTENT_WIDTH - 14, 110).strokeColor('#d1d5db').stroke()
    doc.y = boxTop + 118
  } else if (type === 'diagramming') {
    doc.moveDown(0.15)
    const boxTop = doc.y
    paperEnsureSpace(doc, DIAGRAM_BOX_HEIGHT + 16)
    doc.rect(PAPER_MARGIN + 14, boxTop, PAPER_CONTENT_WIDTH - 14, DIAGRAM_BOX_HEIGHT).strokeColor('#d1d5db').stroke()
    doc.y = boxTop + DIAGRAM_BOX_HEIGHT + 10
  }

  doc.moveDown(0.55)
  doc.fillColor('#000')
}

function drawStudentInfoBlock(doc) {
  paperEnsureSpace(doc, 48)
  setFont(doc, 'regular')
  doc.fontSize(10).fillColor('#374151')
  doc.text('Name: _________________________________________    Date: _________________', PAPER_MARGIN, doc.y)
  doc.moveDown(0.75)
  doc.text('Score: __________ / __________', PAPER_MARGIN, doc.y)
  doc.moveDown(1)
}

function drawExamPaperBody(doc, exam) {
  drawStudentInfoBlock(doc)

  const description = stripMarkup(exam.description)
  if (description) {
    paperEnsureSpace(doc, 40)
    setFont(doc, 'regular')
    doc.fontSize(10).fillColor('#4b5563')
    doc.text(description, PAPER_MARGIN, doc.y, { width: PAPER_CONTENT_WIDTH })
    doc.moveDown(1)
  }

  const groupedSections = groupQuestionsBySection(exam)
  let questionNumber = 1

  for (const section of groupedSections) {
    paperEnsureSpace(doc, 48)
    setFont(doc, 'bold')
    doc.fontSize(11).fillColor('#111827')
    doc.text(section.title || 'Question Set', PAPER_MARGIN, doc.y, { width: PAPER_CONTENT_WIDTH })
    doc.moveDown(0.25)

    const sectionDescription = resolvePrintedSectionInstructions(section)
    if (sectionDescription) {
      setFont(doc, 'regular')
      doc.fontSize(9).fillColor('#6b7280')
      doc.text(sectionDescription, PAPER_MARGIN, doc.y, { width: PAPER_CONTENT_WIDTH })
      doc.moveDown(0.45)
    } else {
      doc.moveDown(0.2)
    }

    for (const question of section.questions) {
      drawPaperQuestion(doc, question, questionNumber)
      questionNumber += 1
    }

    doc.moveDown(0.35)
  }
}

function buildExamPaperPdfBuffer({
  exam,
  cls,
  generatorName,
  generatedAt,
  teacherLogoBase64,
  departmentName,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      bufferPages: true,
      margins: { top: PAPER_MARGIN, bottom: PAPER_MARGIN, left: PAPER_MARGIN, right: PAPER_MARGIN },
    })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      const className = cls.name || cls.courseCode || 'Class'
      const sectionLabel = cls.sectionCode ? ` — ${cls.sectionCode}` : ''

      drawReportHeader(doc, {
        exam,
        cls,
        generatorName,
        generatedAt,
        teacherLogoBase64,
        departmentName,
        compact: true,
        pageMargin: PAPER_MARGIN,
        pageWidth: LETTER_PAGE_WIDTH,
        subtitleLines: [
          `${className}${sectionLabel} • AY ${cls.academicYear || ''}, ${formatSemesterLabel(cls.semester)}`,
        ],
      })

      drawExamPaperBody(doc, exam)
      stampReportFooters(doc)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

export async function exportExamPaperService(
  classId,
  examId,
  teacherMemberId,
  { teacherLogoBase64, departmentName } = {},
) {
  try {
    const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
    if (!cls) {
      return { ok: false, status: 403, error: 'Access denied.' }
    }

    const exam = await getExamWithQuestionsQuery(classId, examId, false)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    if (!exam.questions?.length) {
      return { ok: false, status: 400, error: 'Add at least one question before printing.' }
    }

    const teacherInfo = await getMemberDisplayNameQuery(teacherMemberId)
    const generatedAt = new Date()
    const pdf = await buildExamPaperPdfBuffer({
      exam,
      cls,
      generatorName: teacherInfo.name,
      generatedAt,
      teacherLogoBase64,
      departmentName,
    })

    const safeTitle = String(exam.title || 'exam')
      .trim()
      .replace(/[^\w\- ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 48) || 'exam'

    return {
      ok: true,
      contentType: 'application/pdf',
      filename: `acsis-exam-paper-${safeTitle}.pdf`,
      body: pdf,
    }
  } catch (err) {
    console.error('[examPaperExportService.exportExamPaper]', err)
    return { ok: false, status: 500, error: 'Failed to generate exam paper PDF.' }
  }
}
