import { getExamsByClassIdQuery } from '../repositories/examRepository.js'
import { getStudentSessionsForExamsQuery } from '../repositories/examSessionRepository.js'
import {
  checkEnrollment,
  enrollStudent,
  findClassByAccessCode,
  getEnrolledClasses as getClassesRepo,
  getStudentMember,
  unenrollStudent,
} from '../repositories/studentRepository.js'

export async function enrollByAccessCode(memberId, code) {
  const trimmed = String(code || '').trim()
  if (!trimmed) {
    return { ok: false, error: 'Class code is required.' }
  }

  const student = await getStudentMember(memberId)
  if (!student || student.role !== 'student') {
    return { ok: false, error: 'Only students can join a class with a class code.' }
  }

  const targetClass = await findClassByAccessCode(trimmed)
  if (!targetClass) {
    return { ok: false, error: 'Invalid or inactive class code.' }
  }

  if (targetClass.institution_id !== student.institution_id) {
    return { ok: false, error: 'This class code does not belong to your school.' }
  }

  const isEnrolled = await checkEnrollment(memberId, targetClass.class_id)
  if (isEnrolled) {
    return { ok: true, already: true, className: targetClass.class_name }
  }

  await enrollStudent(memberId, targetClass.class_id)
  return { ok: true, already: false, className: targetClass.class_name }
}

export async function getEnrolledClasses(memberId) {
  const classes = await getClassesRepo(memberId)
  const withExams = await Promise.all(
    classes.map(async (c) => {
      const exams = await getExamsByClassIdQuery(c.id, true)
      if (!exams.length) return { ...c, exams }
      const examIds = exams.map((e) => e.id)
      const sessions = await getStudentSessionsForExamsQuery(examIds, memberId)
      const byExam = new Map(sessions.map((s) => [Number(s.exam_id), s]))
      const enriched = exams.map((exam) => {
        const sess = byExam.get(Number(exam.id))
        if (!sess) return exam
        return {
          ...exam,
          sessionStatus: sess.status,
          percentage: sess.percentage != null ? Number(sess.percentage) : null,
        }
      })
      return { ...c, exams: enriched }
    }),
  )
  return withExams
}

export async function unenrollFromClass(memberId, classId) {
  const enrolled = await checkEnrollment(memberId, classId)
  if (!enrolled) {
    return { ok: false, status: 404, error: 'You are not enrolled in this class.' }
  }
  await unenrollStudent(memberId, classId)
  return { ok: true }
}
