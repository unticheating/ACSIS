import { EXAMS_STORAGE_KEY, generateExamCode } from './teacherExams.js'

const CLASS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** @returns {string} */
export function generateClassAccessCode() {
  let code = ''
  for (let i = 0; i < 8; i += 1) {
    code += CLASS_CODE_CHARS[Math.floor(Math.random() * CLASS_CODE_CHARS.length)]
  }
  return code
}

export const CLASSES_STORAGE_KEY = 'acsis.classes'

/** Same-tab updates (native `storage` only fires in other tabs). */
export const CLASSES_CHANGED_EVENT = 'acsis-classes-changed'

function notifyClassesChanged() {
  window.dispatchEvent(new Event(CLASSES_CHANGED_EVENT))
}

/** @typedef {{ id: string | number, title: string, code?: string, questionCount?: number, duration?: number, status?: string, subject?: string, yearLevel?: string, section?: string, questions?: unknown[] }} Exam */

/** @typedef {{ id: string, name: string, academicYear: string, semester: string, accessCode?: string, exams: Exam[] }} ClassGroup */

function defaultClass(/** @type {Exam[]} */ exams = []) {
  return {
    id: 'class_default',
    name: 'Default class',
    academicYear: 'A.Y. 2025-2026',
    semester: '1st Semester',
    accessCode: 'ACSIS-DEFAULT',
    exams,
  }
}

/** Backfill `accessCode` on older stored classes (run from UI mount). */
export function ensureClassAccessCodes() {
  ensureClassesMigrated()
  const raw = localStorage.getItem(CLASSES_STORAGE_KEY)
  if (!raw) return
  let classes
  try {
    classes = JSON.parse(raw)
  } catch {
    return
  }
  if (!Array.isArray(classes)) return
  let changed = false
  const next = classes.map((c) => {
    const existing = (c.accessCode && String(c.accessCode).trim()) || ''
    if (existing) return { ...c, accessCode: existing.toUpperCase(), exams: Array.isArray(c.exams) ? c.exams : [] }
    changed = true
    const code = String(c.id) === 'class_default' ? 'ACSIS-DEFAULT' : generateClassAccessCode()
    return { ...c, accessCode: code, exams: Array.isArray(c.exams) ? c.exams : [] }
  })
  if (changed) {
    localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(next))
    notifyClassesChanged()
  }
}

/** Case-insensitive match for student enrollment. */
export function findClassByAccessCode(raw) {
  ensureClassesMigrated()
  const q = String(raw || '').trim().toUpperCase()
  if (!q) return null
  return getClasses().find((c) => String(c.accessCode || '').trim().toUpperCase() === q) ?? null
}

export function getClasses() {
  try {
    const raw = localStorage.getItem(CLASSES_STORAGE_KEY)
    if (!raw) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p.map((c) => ({
      ...c,
      exams: Array.isArray(c.exams) ? c.exams.map(e => {
        if (e.id === 'exam_def_1' && !e.description) {
          return { ...e, description: 'This quiz covers the OSI model, basic networking concepts, and typical protocol analysis using Wireshark.' }
        }
        if (e.id === 'exam_def_2' && !e.description) {
          return { ...e, description: 'Comprehensive midterm exam covering chapters 1 through 5. Password is required to enter.' }
        }
        return e
      }) : []
    })) : []
  } catch {
    return []
  }
}

export function saveClasses(/** @type {ClassGroup[]} */ classes) {
  localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes))
  notifyClassesChanged()
}

/** One-time migration from flat teacherExams; also repairs empty `acsis.classes` array. */
export function ensureClassesMigrated() {
  const raw = localStorage.getItem(CLASSES_STORAGE_KEY)
  if (raw != null && raw !== '') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p) && p.length > 0) return
    } catch {
      /* fall through */
    }
  }
  let legacy = []
  try {
    const raw = localStorage.getItem(EXAMS_STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      legacy = Array.isArray(p)
        ? p.map((e) => {
            if (e.id === 'exam_def_1')
              return {
                ...e,
                description: 'This quiz covers the OSI model, basic networking concepts, and typical protocol analysis using Wireshark.',
              }
            if (e.id === 'exam_def_2')
              return {
                ...e,
                description: 'Comprehensive midterm exam covering chapters 1 through 5. Password is required to enter.',
              }
            return e
          })
        : []
    }
  } catch {
    legacy = []
  }
  saveClasses([defaultClass(legacy)])
}

export function getClassById(id) {
  ensureClassesMigrated()
  return getClasses().find((c) => String(c.id) === String(id)) ?? null
}

export function addClass({ name, academicYear, semester, accessCode }) {
  ensureClassesMigrated()
  const classes = getClasses()
  const id = `class_${Date.now()}`
  const code =
    accessCode && String(accessCode).trim()
      ? String(accessCode).trim().toUpperCase()
      : generateClassAccessCode()
  classes.push({
    id,
    name: name.trim(),
    academicYear: academicYear.trim(),
    semester: semester.trim(),
    accessCode: code,
    exams: [],
  })
  saveClasses(classes)
  return id
}

export function updateClassMeta(classId, patch) {
  ensureClassesMigrated()
  const classes = getClasses().map((c) =>
    String(c.id) === String(classId) ? { ...c, ...patch, exams: c.exams || [] } : c,
  )
  saveClasses(classes)
}

export function deleteClass(classId) {
  ensureClassesMigrated()
  const next = getClasses().filter((c) => String(c.id) !== String(classId))
  if (next.length === 0) {
    saveClasses([defaultClass([])])
  } else {
    saveClasses(next)
  }
}

export function addExamToClass(classId, /** @type {Omit<Exam, 'code'> & { code?: string }} */ exam) {
  ensureClassesMigrated()
  const classes = getClasses()
  const idx = classes.findIndex((c) => String(c.id) === String(classId))
  if (idx === -1) return false
  const full = {
    ...exam,
    id: exam.id ?? Date.now(),
    code: exam.code || generateExamCode(),
  }
  const exams = [full, ...(classes[idx].exams || [])]
  classes[idx] = { ...classes[idx], exams }
  saveClasses(classes)
  return true
}

export function updateExamInClass(classId, examId, patch) {
  ensureClassesMigrated()
  const classes = getClasses().map((c) => {
    if (String(c.id) !== String(classId)) return c
    const exams = (c.exams || []).map((e) => (String(e.id) === String(examId) ? { ...e, ...patch } : e))
    return { ...c, exams }
  })
  saveClasses(classes)
}

export function deleteExamFromClass(classId, examId) {
  ensureClassesMigrated()
  const classes = getClasses().map((c) => {
    if (String(c.id) !== String(classId)) return c
    return { ...c, exams: (c.exams || []).filter((e) => String(e.id) !== String(examId)) }
  })
  saveClasses(classes)
}

export function getExamInClass(classId, examId) {
  const c = getClassById(classId)
  if (!c) return null
  const exam = (c.exams || []).find((e) => String(e.id) === String(examId))
  if (!exam) return null
  return { classGroup: c, exam }
}

/** Flat list for dashboards */
export function getAllExamsWithClassMeta() {
  ensureClassesMigrated()
  return getClasses().flatMap((c) =>
    (c.exams || []).map((e) => ({
      ...e,
      classId: c.id,
      className: c.name,
      academicYear: c.academicYear,
      semester: c.semester,
    })),
  )
}
