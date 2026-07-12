import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { formatSemesterLabel } from '../lib/termLabel.js'
import { labelForCheatEvent } from '../lib/cheatEventLabels.js'
import {
  CONTENT_WIDTH,
  MARGIN,
  drawReportHeader,
  ensureSpace,
  formatGeneratedStatement,
  setFont,
  stampReportFooters,
} from '../lib/pdfReportBranding.js'
import { getExamWithQuestionsQuery } from '../repositories/examRepository.js'
import { getTeacherClassByIdQuery } from '../repositories/classRepository.js'
import {
  getExamSubmissionStatsQuery,
  getMemberDisplayNameQuery,
  getTopRankedSessionQuery,
  insertReportLogQuery,
  listExamSessionsForExamQuery,
  listCheatingLogsForExamQuery,
} from '../repositories/examResultsRepository.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const plpLogoPath = path.join(__dirname, '../../img/plpupdatedlogo 3.png')

const TABLE_CELL_PAD = 4
const PASS_THRESHOLD = 50

/** Column widths for student results — fills page width; Warnings gets extra space. */
function studentResultsColWidths() {
  const fractions = [0.055, 0.3, 0.135, 0.245, 0.085, 0.12]
  const widths = fractions.map((f) => Math.floor(CONTENT_WIDTH * f))
  const remainder = CONTENT_WIDTH - widths.reduce((sum, w) => sum + w, 0)
  widths[widths.length - 1] += remainder
  return widths
}

function sortSessionsBySurname(sessions) {
  return [...sessions].sort((a, b) => {
    const lastCmp = String(a.lastName || a.studentName || '').localeCompare(
      String(b.lastName || b.studentName || ''),
      undefined,
      { sensitivity: 'base' },
    )
    if (lastCmp !== 0) return lastCmp
    return String(a.firstName || '').localeCompare(String(b.firstName || ''), undefined, {
      sensitivity: 'base',
    })
  })
}

function sortSessionsByRank(sessions) {
  return [...sessions].sort((a, b) => {
    const ra = a.rank != null ? Number(a.rank) : 9999
    const rb = b.rank != null ? Number(b.rank) : 9999
    if (ra !== rb) return ra - rb
    return String(a.studentName || '').localeCompare(String(b.studentName || ''), undefined, {
      sensitivity: 'base',
    })
  })
}

function formatSurnameFirst(session) {
  if (session?.lastName && session?.firstName) {
    return `${session.lastName}, ${session.firstName}`
  }
  return session?.studentName || 'Unknown student'
}

function groupViolationsForExport(violations, sessions) {
  const sessionById = new Map(
    (sessions || []).filter((s) => s.sessionId != null).map((s) => [s.sessionId, s]),
  )
  const map = new Map()

  for (const violation of violations || []) {
    const key = violation.sessionId ?? `${violation.studentName}-${violation.schoolId}`
    const session = violation.sessionId ? sessionById.get(violation.sessionId) : null
    if (!map.has(key)) {
      map.set(key, {
        displayName: session ? formatSurnameFirst(session) : violation.studentName || 'Unknown student',
        schoolId: violation.schoolId || session?.schoolId || '',
        violations: [],
      })
    }
    map.get(key).violations.push(violation)
  }

  const groups = [...map.values()]
  for (const group of groups) {
    group.violations.sort(
      (a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime(),
    )
  }

  groups.sort((a, b) => {
    if (b.violations.length !== a.violations.length) {
      return b.violations.length - a.violations.length
    }
    return String(a.displayName).localeCompare(String(b.displayName), undefined, {
      sensitivity: 'base',
    })
  })

  return groups
}

function sortSessionsForExport(sessions, reportType) {
  if (reportType === 'detailed') return sortSessionsByRank(sessions)
  return sortSessionsBySurname(sessions)
}

function computeScoreDistribution(sessions) {
  const scored = sessions.filter((s) => s.status === 'submitted' && s.percentage != null)
  if (scored.length === 0) return null

  let totalScore = scored[0].totalPoints ? Number(scored[0].totalPoints) : 100
  if (totalScore <= 0 || Number.isNaN(totalScore)) totalScore = 100

  let bucketCount = 10
  if (totalScore < 10) bucketCount = totalScore

  const bucketSize = totalScore / bucketCount
  return Array.from({ length: bucketCount }, (_, i) => {
    const minRaw = Math.ceil(i * bucketSize)
    const maxRaw = i === bucketCount - 1 ? totalScore : Math.ceil((i + 1) * bucketSize) - 1
    const label = minRaw >= maxRaw ? `${minRaw}` : `${minRaw}-${maxRaw}`
    const passed = maxRaw >= totalScore * (PASS_THRESHOLD / 100)
    const count = scored.filter((s) => {
      const r = Number(s.rawScore)
      return r >= minRaw && r <= maxRaw
    }).length
    return { label, count, passed }
  })
}

function drawSectionTitle(doc, title) {
  ensureSpace(doc, 40)
  setFont(doc, 'bold');
  doc.fontSize(11).fillColor('#111827')
  doc.text(title, MARGIN, doc.y)
  doc.moveDown(0.5)
  doc.fillColor('#000')
}

function drawTable(doc, { headers, rows, colWidths }) {
  if (!rows.length) {
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('No records.', MARGIN, doc.y)
    doc.moveDown(0.5)
    return
  }

  const startX = MARGIN
  const headerH = 22
  const rowH = 20
  let y = doc.y

  const drawHeader = () => {
    doc.rect(startX, y, CONTENT_WIDTH, headerH).fill('#f3f4f6')
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9)
    let x = startX + 6
    headers.forEach((label, i) => {
      doc.text(label, x, y + 7, { width: colWidths[i] - TABLE_CELL_PAD * 2, lineBreak: false })
      x += colWidths[i]
    })
    y += headerH
    doc.font('Helvetica').fontSize(8.5)
  }

  drawHeader()

  for (const row of rows) {
    if (y + rowH > doc.page.height - MARGIN - 20) {
      doc.addPage()
      y = MARGIN
      drawHeader()
    }
    let x = startX + 6
    row.forEach((cell, i) => {
      doc.fillColor('#1f2937').text(String(cell ?? '—'), x, y + 5, {
        width: colWidths[i] - TABLE_CELL_PAD * 2,
        lineBreak: false,
      })
      x += colWidths[i]
    })
    doc.strokeColor('#e5e7eb').lineWidth(0.5)
    doc.moveTo(startX, y + rowH).lineTo(startX + CONTENT_WIDTH, y + rowH).stroke()
    y += rowH
  }

  doc.y = y + 10
  doc.fillColor('#000')
}

function drawStatsBlock(doc, sessions) {
  const submittedSessions = sessions.filter(s => s.status === 'submitted' && s.percentage != null);
  let avgScore = '—', highest = '—', lowest = '—', passed = '—', failed = '—';
  if (submittedSessions.length > 0) {
    avgScore = Math.round(submittedSessions.reduce((acc, s) => acc + Number(s.percentage), 0) / submittedSessions.length) + '%';
    highest = Math.max(...submittedSessions.map(s => Number(s.percentage))) + '%';
    lowest = Math.min(...submittedSessions.map(s => Number(s.percentage))) + '%';
    passed = submittedSessions.filter(s => Number(s.percentage) >= 50).length;
    failed = submittedSessions.filter(s => Number(s.percentage) < 50).length;
  }
  
  const summaryLabels = ['Average', 'Highest', 'Lowest', 'Passed', 'Failed'];
  const summaryVals = [avgScore, highest, lowest, passed, failed];
  
  const colW = CONTENT_WIDTH / 5;
  const boxY = doc.y;
  doc.rect(MARGIN, boxY, CONTENT_WIDTH, 44).fillAndStroke('#f9fafb', '#e5e7eb');
  
  setFont(doc, 'bold');
  doc.fillColor('#111827').fontSize(14);
  for (let i = 0; i < 5; i++) {
    doc.text(String(summaryVals[i]), MARGIN + (i * colW), boxY + 10, { width: colW, align: 'center' });
  }
  setFont(doc, 'regular');
  doc.fillColor('#6b7280').fontSize(9);
  for (let i = 0; i < 5; i++) {
    doc.text(summaryLabels[i], MARGIN + (i * colW), boxY + 26, { width: colW, align: 'center' });
  }
  
  doc.y = boxY + 65;
  doc.fillColor('#000');
}

function drawScoreDistributionChart(doc, sessions) {
  const buckets = computeScoreDistribution(sessions)
  if (!buckets?.length) return

  drawSectionTitle(doc, 'Score distribution')
  ensureSpace(doc, 170)

  const chartX = MARGIN
  const chartY = doc.y
  const chartWidth = CONTENT_WIDTH
  const chartHeight = 110
  const barGap = 3
  const barCount = buckets.length
  const barWidth = Math.max(8, (chartWidth - barGap * (barCount - 1)) / barCount)
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)
  const baselineY = chartY + chartHeight

  doc.strokeColor('#e5e7eb').lineWidth(0.5)
  doc.moveTo(chartX, baselineY).lineTo(chartX + chartWidth, baselineY).stroke()

  buckets.forEach((bucket, i) => {
    const barH = bucket.count > 0 ? (bucket.count / maxCount) * (chartHeight - 16) : 0
    const x = chartX + i * (barWidth + barGap)
    const y = baselineY - barH
    doc.fillColor(bucket.passed ? '#22c55e' : '#ef4444')
    if (barH > 0) {
      doc.rect(x, y, barWidth, barH).fill()
    }
    setFont(doc, 'regular')
    doc.fontSize(7).fillColor('#6b7280')
    doc.text(bucket.label, x, baselineY + 5, { width: barWidth, align: 'center', lineBreak: false })
  })

  setFont(doc, 'regular')
  doc.fontSize(8).fillColor('#6b7280')
  doc.text('Green = passed (50%+)   Red = failed (<50%)', chartX, baselineY + 22, {
    width: chartWidth,
    align: 'right',
  })

  doc.y = baselineY + 38
  doc.fillColor('#000')
}

function reviewStatusLabel(s) {
  if (s.status !== 'submitted') return '—'
  return s.reviewComplete ? 'Manually reviewed' : 'Auto-graded'
}

function scoreLabelForPdf(s) {
  if (s.status === 'submitted' && s.percentage != null) {
    return `${s.percentage}% (${s.rawScore}/${s.totalPoints})`
  }
  return '—'
}

function drawStudentResultsTable(doc, sessions, reportType) {
  const sectionTitle =
    reportType === 'detailed' ? 'Student results (by score rank)' : 'Student results (surname A–Z)'
  drawSectionTitle(doc, sectionTitle)

  const rows = sortSessionsForExport(sessions, reportType).map((s, index) => [
    String(index + 1),
    s.lastName && s.firstName
      ? `${s.lastName}, ${s.firstName}`
      : s.studentName || '—',
    s.schoolId || '—',
    scoreLabelForPdf(s),
    s.rank != null ? `#${s.rank}` : '—',
    String(s.warningCount ?? 0),
  ])

  drawTable(doc, {
    headers: ['No.', 'Student', 'School ID', 'Score', 'Rank', 'Warnings'],
    rows,
    colWidths: studentResultsColWidths(),
  })
}

function drawViolationsGrouped(doc, violations, sessions) {
  const groups = groupViolationsForExport(violations, sessions)
  drawSectionTitle(doc, 'Integrity violations by student')

  if (!groups.length) {
    setFont(doc, 'regular')
    doc.fontSize(10).fillColor('#6b7280').text('No violations logged for this exam.')
    return
  }

  for (const group of groups) {
    ensureSpace(doc, 48 + group.violations.length * 16)
    setFont(doc, 'bold')
    doc.fontSize(10).fillColor('#111827')
    const idPart = group.schoolId ? ` · ${group.schoolId}` : ''
    const eventLabel = group.violations.length === 1 ? 'event' : 'events'
    doc.text(`${group.displayName}${idPart} (${group.violations.length} ${eventLabel})`)

    const rows = group.violations.map((v) => [
      labelForCheatEvent(v.eventType),
      (v.details || '—').slice(0, 90),
      v.occurredAt ? new Date(v.occurredAt).toLocaleString('en-PH') : '—',
    ])

    setFont(doc, 'regular')
    drawTable(doc, {
      headers: ['Event', 'Details', 'When'],
      rows,
      colWidths: [125, 195, 95],
    })
    doc.moveDown(0.6)
  }
}

function addScoreDistributionToExcel(sheet, sessions, styleTableHeader, styleTableRow) {
  const buckets = computeScoreDistribution(sessions)
  if (!buckets?.length) return

  const titleRow = sheet.addRow(['Score distribution'])
  titleRow.font = { bold: true, size: 12, color: { argb: 'FF111827' } }
  sheet.addRow([])

  const headerRow = sheet.addRow(['Score range', 'Students'])
  styleTableHeader(headerRow)
  const firstDataRow = sheet.lastRow.number + 1

  for (const bucket of buckets) {
    const dataRow = sheet.addRow([bucket.label, bucket.count])
    styleTableRow(dataRow)
    const countCell = dataRow.getCell(2)
    countCell.font = {
      size: 10,
      color: { argb: bucket.passed ? 'FF15803D' : 'FFDC2626' },
      bold: true,
    }
  }
  const lastDataRow = sheet.lastRow.number

  sheet.addConditionalFormatting({
    ref: `B${firstDataRow}:B${lastDataRow}`,
    rules: [
      {
        type: 'dataBar',
        priority: 1,
        cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
        color: { argb: 'FF22C55E' },
        gradient: false,
        showValue: true,
      },
    ],
  })

  const noteRow = sheet.addRow([
    '',
    'Bar length shows count relative to the busiest range. Green text = pass (50%+), red = fail (<50%).',
  ])
  noteRow.getCell(2).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
  sheet.mergeCells(`B${noteRow.number}:F${noteRow.number}`)

  sheet.addRow([])
  sheet.addRow([])
}

async function buildExcelBuffer({ exam, cls, sessions, violations, generatorName, generatedAt, reportType, teacherLogoBase64, departmentName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = generatorName;
  workbook.created = generatedAt;
  
  const sheet = workbook.addWorksheet('Performance Report', { 
    views: [{ showGridLines: false }],
    pageSetup: { 
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
    }
  });
  
  if (reportType === 'violations') {
    sheet.getColumn(1).width = 28
    sheet.getColumn(2).width = 36
    sheet.getColumn(3).width = 18
  } else {
    sheet.getColumn(1).width = 6;  // No.
    sheet.getColumn(2).width = 32; // Student
    sheet.getColumn(3).width = 15; // School ID
    sheet.getColumn(4).width = 18; // Score
    sheet.getColumn(5).width = 8;  // Rank
    sheet.getColumn(6).width = 10; // Warnings
  }

  // Row 1: generated at
  const genRow = sheet.addRow([formatGeneratedStatement(generatorName, generatedAt)]);
  genRow.font = { italic: true, size: 9, color: { argb: 'FF888888' } };
  sheet.mergeCells(`A1:F1`);
  genRow.height = 20;

  // Row 2: Institution
  const instRow = sheet.addRow(['', '', 'Institution: Pamantasan ng Lungsod ng Pasig']);
  instRow.font = { bold: true, size: 10, color: { argb: 'FF111827' } };
  sheet.mergeCells(`C2:F2`);
  instRow.getCell(3).alignment = { horizontal: 'right' };
  instRow.height = 25;

  // Row 3: Department
  const deptRow = sheet.addRow(['', '', departmentName ? `Department: ${departmentName}` : '']);
  if (departmentName) {
    deptRow.font = { size: 10, color: { argb: 'FF4B5563' } };
    sheet.mergeCells(`C3:F3`);
    deptRow.getCell(3).alignment = { horizontal: 'right' };
  }
  deptRow.height = 25;

  // Logos (placed at row 1 so they float over A2 and B2)
  let logoXOffset = 0;
  if (fs.existsSync(plpLogoPath)) {
    try {
      const plpLogoId = workbook.addImage({ filename: plpLogoPath, extension: 'png' });
      sheet.addImage(plpLogoId, { tl: { col: 0, row: 1 }, ext: { width: 60, height: 60 } });
      logoXOffset += 1.2; // Use fractional offset to add a nice gap
    } catch(e) {}
  }
  
  if (teacherLogoBase64) {
    try {
      const b64Data = teacherLogoBase64.replace(/^data:image\/\w+;base64,/, "");
      const extMatch = teacherLogoBase64.match(/^data:image\/(\w+);base64,/);
      const ext = extMatch ? extMatch[1] : 'png';
      const teacherLogoId = workbook.addImage({ base64: b64Data, extension: ext });
      sheet.addImage(teacherLogoId, { tl: { col: logoXOffset, row: 1 }, ext: { width: 80, height: 80 } });
    } catch(e) {}
  }

  sheet.addRow([]);

  const titleRow = sheet.addRow([exam.title || 'Untitled Exam']);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF111827' } };
  sheet.mergeCells(`A5:F5`);
  titleRow.alignment = { horizontal: 'center' };
  
  const className = cls.name || cls.courseCode || 'Class'
  const sectionLabel = cls.sectionCode ? ` — ${cls.sectionCode}` : '';
  const dateLabel = exam.scheduledStart ? new Date(exam.scheduledStart).toLocaleDateString('en-US') : (exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('en-US') : '');
  const itemsCount = exam.questions ? exam.questions.length : 0;
  
  const sub1 = sheet.addRow([`${className}${sectionLabel} • AY ${cls.academicYear || ''}, ${formatSemesterLabel(cls.semester)}`]);
  const sub2 = sheet.addRow([`${dateLabel} • ${itemsCount} items`]);
  sub1.font = { size: 10, color: { argb: 'FF6B7280' } };
  sub1.alignment = { horizontal: 'center' };
  sheet.mergeCells(`A${sub1.number}:F${sub1.number}`);
  
  sub2.font = { size: 10, color: { argb: 'FF6B7280' } };
  sub2.alignment = { horizontal: 'center' };
  sheet.mergeCells(`A${sub2.number}:F${sub2.number}`);

  sheet.addRow([]);
  
  const submittedSessions = sessions.filter(s => s.status === 'submitted' && s.percentage != null);
  let avgScore = '—', highest = '—', lowest = '—', passed = '—', failed = '—';
  if (submittedSessions.length > 0) {
    avgScore = Math.round(submittedSessions.reduce((acc, s) => acc + Number(s.percentage), 0) / submittedSessions.length) + '%';
    highest = Math.max(...submittedSessions.map(s => Number(s.percentage))) + '%';
    lowest = Math.min(...submittedSessions.map(s => Number(s.percentage))) + '%';
    passed = submittedSessions.filter(s => Number(s.percentage) >= 50).length;
    failed = submittedSessions.filter(s => Number(s.percentage) < 50).length;
  }
  
  // Summary Block
  const statLabelRow = sheet.addRow(['Average', 'Highest', 'Lowest', 'Passed', 'Failed', '']);
  const statValRow = sheet.addRow([avgScore, highest, lowest, passed, failed, '']);
  
  statLabelRow.font = { size: 10, color: { argb: 'FF6B7280' } };
  statLabelRow.alignment = { horizontal: 'center' };
  
  statValRow.font = { bold: true, size: 14, color: { argb: 'FF111827' } };
  statValRow.alignment = { horizontal: 'center' };
  
  // apply light background to stats block
  for (let col = 1; col <= 5; col++) {
    const cellL = statLabelRow.getCell(col);
    const cellV = statValRow.getCell(col);
    cellL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    cellV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    
    // Add thin border around the stats block
    const border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
    cellL.border = border;
    cellV.border = border;
  }

  sheet.addRow([]);
  sheet.addRow([]);

  // Function to style headers
  const styleTableHeader = (row) => {
    row.font = { bold: true, size: 10, color: { argb: 'FF111827' } };
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  };

  const styleTableRow = (row) => {
    row.font = { size: 10, color: { argb: 'FF1F2937' } };
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  };

  if (reportType !== 'violations') {
    addScoreDistributionToExcel(sheet, sessions, styleTableHeader, styleTableRow)
  }
  
  // Data
  if (reportType === 'violations') {
    const headerTitleRow = sheet.addRow(['Integrity violations by student'])
    headerTitleRow.font = { bold: true, size: 12, color: { argb: 'FF111827' } }
    sheet.addRow([])

    const groups = groupViolationsForExport(violations, sessions)
    for (const group of groups) {
      const idPart = group.schoolId ? ` · ${group.schoolId}` : ''
      const eventLabel = group.violations.length === 1 ? 'event' : 'events'
      const groupRow = sheet.addRow([
        `${group.displayName}${idPart} (${group.violations.length} ${eventLabel})`,
      ])
      groupRow.font = { bold: true, size: 11, color: { argb: 'FF111827' } }
      sheet.mergeCells(`A${groupRow.number}:C${groupRow.number}`)
      groupRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      })

      const headerRow = sheet.addRow(['Event', 'Details', 'When'])
      styleTableHeader(headerRow)

      for (const v of group.violations) {
        const dataRow = sheet.addRow([
          labelForCheatEvent(v.eventType),
          v.details || '—',
          v.occurredAt ? new Date(v.occurredAt).toLocaleString('en-PH') : '—',
        ])
        styleTableRow(dataRow)
      }

      sheet.addRow([])
    }
  } else {
    const resultsTitle =
      reportType === 'detailed' ? 'Student Results (By Score Rank)' : 'Student Results (Surname A–Z)'
    const headerTitleRow = sheet.addRow([resultsTitle]);
    headerTitleRow.font = { bold: true, size: 12, color: { argb: 'FF111827' } };
    sheet.addRow([]);

    const headerRow = sheet.addRow(['No.', 'Student', 'School ID', 'Score', 'Rank', 'Warnings']);
    styleTableHeader(headerRow);

    sortSessionsForExport(sessions, reportType).forEach((s, index) => {
      const scoreLabel = s.status === 'submitted' && s.percentage != null 
        ? `${s.percentage}% (${s.rawScore}/${s.totalPoints})`
        : '—';
      const rankLabel = s.rank != null ? `#${s.rank}` : '—';
      const studentLabel =
        s.lastName && s.firstName ? `${s.lastName}, ${s.firstName}` : s.studentName || '—';
      const dataRow = sheet.addRow([
        index + 1,
        studentLabel,
        s.schoolId || '—',
        scoreLabel,
        rankLabel,
        s.warningCount || 0
      ]);
      styleTableRow(dataRow);
    });
  }

  return await workbook.xlsx.writeBuffer();
}

function buildPdfBuffer({
  exam,
  cls,
  sessions,
  stats,
  top,
  violations,
  generatorName,
  reportTitle,
  reportType,
  generatedAt,
  teacherLogoBase64,
  departmentName
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      drawReportHeader(doc, { exam, cls, generatorName, generatedAt, teacherLogoBase64, departmentName })
      drawStatsBlock(doc, sessions)

      if (reportType !== 'violations') {
        drawScoreDistributionChart(doc, sessions)
      }

      if (reportType === 'violations') {
        drawViolationsGrouped(doc, violations, sessions)
      } else {
        drawStudentResultsTable(doc, sessions, reportType)
      }

      stampReportFooters(doc)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

export async function exportExamReportService(
  classId,
  examId,
  teacherMemberId,
  { format = 'pdf', reportType = 'class_results', teacherLogoBase64, departmentName } = {},
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

    const generatedAt = new Date()

    const [sessions, stats, violations, teacherInfo, top] = await Promise.all([
      listExamSessionsForExamQuery(classId, examId),
      getExamSubmissionStatsQuery(examId),
      listCheatingLogsForExamQuery(examId),
      getMemberDisplayNameQuery(teacherMemberId),
      getTopRankedSessionQuery(examId),
    ])
    const generatorName = teacherInfo.name

    const logType =
      reportType === 'violations'
        ? 'item_analysis'
        : reportType === 'detailed'
          ? 'individual'
          : 'class_results'

    await insertReportLogQuery(examId, teacherMemberId, logType)

    const className = cls.name || cls.courseCode || ''
    const reportTitle = 'Performance Report'

    const topForExport = top
      ? {
          studentName: top.studentName,
          schoolId: top.schoolId,
          percentage: top.percentage != null ? Number(top.percentage) : null,
          rawScore: top.rawScore != null ? Number(top.rawScore) : null,
        }
      : null

    if (format === 'excel') {
      const excelBuffer = await buildExcelBuffer({
        exam,
        cls,
        sessions,
        violations,
        generatorName,
        generatedAt,
        reportType,
        teacherLogoBase64,
        departmentName,
      })

      return {
        ok: true,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `acsis-report-${examId}.xlsx`,
        body: excelBuffer,
      }
    }

    const pdf = await buildPdfBuffer({
      exam,
      cls,
      sessions,
      stats,
      top: topForExport,
      violations,
      generatorName,
      reportTitle,
      reportType,
      generatedAt,
      teacherLogoBase64,
      departmentName,
    })

    return {
      ok: true,
      contentType: 'application/pdf',
      filename: `acsis-report-${examId}-${reportType}.pdf`,
      body: pdf,
    }
  } catch (err) {
    console.error('[examReportService.exportExamReport]', err)
    return { ok: false, status: 500, error: 'Failed to export report.' }
  }
}
