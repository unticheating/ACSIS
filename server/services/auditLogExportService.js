import PDFDocument from 'pdfkit'
import { listExamAuditLogsFilteredQuery, listInstitutionAuditLogsFilteredQuery } from '../repositories/teacherActivityRepository.js'
import { getMemberDisplayNameQuery } from '../repositories/examResultsRepository.js'
import { getPool } from '../db.js'
import {
  formatAuditDetails,
  formatAuditSectionLabel,
  labelForAuditEvent,
  colorsForAuditEvent,
} from '../lib/examAuditEventLabels.js'
import {
  CONTENT_WIDTH,
  MARGIN,
  drawReportHeader,
  ensureSpace,
  setFont,
  stampReportFooters,
} from '../lib/pdfReportBranding.js'

const ROW_PAD = 5
const ACTION_COL_INDEX = 1
const ACTION_BADGE_HEIGHT = 14
const ACTION_BADGE_PAD_X = 5

function formatPdfDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatFilterDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function describeFilters(filters = {}) {
  const parts = []
  if (filters.eventType) parts.push(`Action: ${labelForAuditEvent(filters.eventType)}`)
  if (filters.teacherName) parts.push(`User: ${filters.teacherName}`)
  if (filters.examTitle) parts.push(`Quiz: ${filters.examTitle}`)
  if (filters.subjectLabel) parts.push(`Subject: ${filters.subjectLabel}`)
  if (filters.sectionLabel) parts.push(`Section: ${filters.sectionLabel}`)
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? formatFilterDate(filters.dateFrom) : 'any'
    const to = filters.dateTo ? formatFilterDate(filters.dateTo) : 'any'
    parts.push(`Date: ${from} to ${to}`)
  }
  if (filters.search) parts.push(`Search: "${filters.search}"`)
  return parts.length ? parts.join(' · ') : 'All entries (no filters applied)'
}

function auditColWidths(includeTeacher = false) {
  const fractions = includeTeacher
    ? [0.11, 0.15, 0.13, 0.15, 0.12, 0.34]
    : [0.14, 0.19, 0.18, 0.14, 0.35]
  const widths = fractions.map((f) => Math.floor(CONTENT_WIDTH * f))
  const remainder = CONTENT_WIDTH - widths.reduce((sum, w) => sum + w, 0)
  widths[widths.length - 1] += remainder
  return widths
}

function drawTableHeader(doc, colWidths, labels) {
  const headerY = doc.y
  const headerHeight = 22
  doc.save()
  doc.rect(MARGIN, headerY, CONTENT_WIDTH, headerHeight).fill('#f3f4f6')
  doc.restore()

  setFont(doc, 'bold')
  doc.fontSize(8).fillColor('#374151')
  let x = MARGIN
  labels.forEach((label, index) => {
    doc.text(label, x + ROW_PAD, headerY + 7, {
      width: colWidths[index] - ROW_PAD * 2,
      lineBreak: false,
    })
    x += colWidths[index]
  })
  doc.y = headerY + headerHeight + 4
}

function measureActionBadgeWidth(doc, label) {
  setFont(doc, 'bold')
  doc.fontSize(7)
  return doc.widthOfString(label) + ACTION_BADGE_PAD_X * 2
}

function drawActionBadge(doc, x, y, maxWidth, eventType, label) {
  const colors = colorsForAuditEvent(eventType)
  const innerWidth = Math.max(0, maxWidth - ROW_PAD * 2)
  const badgeWidth = Math.min(measureActionBadgeWidth(doc, label), innerWidth)
  const badgeX = x + ROW_PAD
  const badgeY = y + ROW_PAD

  doc
    .roundedRect(badgeX, badgeY, badgeWidth, ACTION_BADGE_HEIGHT, 7)
    .fillColor(colors.bg)
    .fill()
    .strokeColor(colors.border)
    .lineWidth(0.5)
    .stroke()

  setFont(doc, 'bold')
  doc.fontSize(7).fillColor(colors.text)
  doc.text(label, badgeX + ACTION_BADGE_PAD_X, badgeY + 3.5, {
    width: badgeWidth - ACTION_BADGE_PAD_X * 2,
    lineBreak: false,
  })
}

function drawTableRow(doc, colWidths, cells, eventType = null) {
  const actionLabel = eventType ? labelForAuditEvent(eventType) : null

  const heights = cells.map((cell, index) => {
    if (index === ACTION_COL_INDEX && eventType) {
      return ACTION_BADGE_HEIGHT + ROW_PAD * 2
    }
    return (
      doc.heightOfString(String(cell || '—'), {
        width: colWidths[index] - ROW_PAD * 2,
        align: 'left',
      }) + ROW_PAD * 2
    )
  })
  const rowHeight = Math.max(...heights, 12 + ROW_PAD * 2)
  ensureSpace(doc, rowHeight + 8)
  const rowY = doc.y

  let x = MARGIN
  cells.forEach((cell, index) => {
    if (index === ACTION_COL_INDEX && eventType) {
      drawActionBadge(doc, x, rowY, colWidths[index], eventType, actionLabel)
    } else {
      setFont(doc, 'regular')
      doc.fontSize(8).fillColor('#111827')
      doc.text(String(cell || '—'), x + ROW_PAD, rowY + ROW_PAD, {
        width: colWidths[index] - ROW_PAD * 2,
        align: 'left',
      })
    }
    x += colWidths[index]
  })

  doc
    .moveTo(MARGIN, rowY + rowHeight)
    .lineTo(MARGIN + CONTENT_WIDTH, rowY + rowHeight)
    .strokeColor('#e5e7eb')
    .lineWidth(0.5)
    .stroke()

  doc.y = rowY + rowHeight + 2
}

async function buildAuditLogsPdfBuffer({
  logs,
  generatorName,
  filters,
  generatedAt = new Date(),
  teacherLogoBase64,
  departmentName,
  title = 'Exam audit logs',
  includeTeacher = false,
}) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))

  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  drawReportHeader(doc, {
    exam: { title },
    cls: {},
    generatorName,
    generatedAt,
    teacherLogoBase64,
    departmentName,
    compact: true,
    subtitleLines: [
      `${describeFilters(filters)} · ${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`,
    ],
  })

  const colWidths = auditColWidths(includeTeacher)
  const headers = includeTeacher
    ? ['Date', 'Action', 'User', 'Quiz', 'Section', 'Details']
    : ['Date', 'Action', 'Quiz', 'Section', 'Details']
  drawTableHeader(doc, colWidths, headers)

  if (logs.length === 0) {
    setFont(doc, 'regular')
    doc.fontSize(9).fillColor('#6b7280')
    doc.text('No audit log entries match the current filters.', MARGIN, doc.y)
  } else {
    for (const log of logs) {
      const cells = includeTeacher
        ? [
            formatPdfDate(log.occurredAt),
            labelForAuditEvent(log.eventType),
            log.teacherName || '—',
            log.examTitle || '—',
            formatAuditSectionLabel(log),
            formatAuditDetails(log),
          ]
        : [
            formatPdfDate(log.occurredAt),
            labelForAuditEvent(log.eventType),
            log.examTitle || '—',
            formatAuditSectionLabel(log),
            formatAuditDetails(log),
          ]
      drawTableRow(doc, colWidths, cells, log.eventType)
    }
  }

  stampReportFooters(doc)
  doc.end()
  return done
}

export async function exportTeacherActivityLogsService(teacherMemberId, filters = {}) {
  try {
    const logs = await listExamAuditLogsFilteredQuery(teacherMemberId, {
      limit: 500,
      eventType: filters.eventType || '',
      examId: filters.examId || '',
      sectionKey: filters.sectionKey || '',
      subjectKey: filters.subjectKey || '',
      search: filters.search || '',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
    })

    const teacherInfo = await getMemberDisplayNameQuery(teacherMemberId)
    const pdf = await buildAuditLogsPdfBuffer({
      logs,
      generatorName: teacherInfo.name,
      filters,
      generatedAt: new Date(),
      teacherLogoBase64: filters.teacherLogoBase64,
      departmentName: filters.departmentName,
    })

    const stamp = new Date().toISOString().slice(0, 10)
    return {
      ok: true,
      contentType: 'application/pdf',
      filename: `acsis-audit-logs-${stamp}.pdf`,
      body: pdf,
      count: logs.length,
    }
  } catch (err) {
    console.error('[auditLogExportService.exportTeacherActivityLogs]', err)
    return { ok: false, status: 500, error: 'Failed to export audit logs.' }
  }
}

async function getInstitutionName(institutionId) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT institution_name FROM institutions WHERE institution_id = $1 LIMIT 1`,
    [institutionId],
  )
  return rows[0]?.institution_name || 'Institution'
}

export async function exportAdminActivityLogsService(institutionId, filters = {}) {
  try {
    const logs = await listInstitutionAuditLogsFilteredQuery(institutionId, {
      limit: 500,
      eventType: filters.eventType || '',
      examId: filters.examId || '',
      sectionKey: filters.sectionKey || '',
      teacherMemberId: filters.teacherMemberId || '',
      search: filters.search || '',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
    })

    const institutionName = await getInstitutionName(institutionId)
    const pdf = await buildAuditLogsPdfBuffer({
      logs,
      generatorName: institutionName,
      filters,
      generatedAt: new Date(),
      title: 'Institution audit trail',
      includeTeacher: true,
    })

    const stamp = new Date().toISOString().slice(0, 10)
    return {
      ok: true,
      contentType: 'application/pdf',
      filename: `acsis-institution-audit-${stamp}.pdf`,
      body: pdf,
      count: logs.length,
    }
  } catch (err) {
    console.error('[auditLogExportService.exportAdminActivityLogs]', err)
    return { ok: false, status: 500, error: 'Failed to export audit trail.' }
  }
}
