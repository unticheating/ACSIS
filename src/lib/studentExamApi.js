import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function joinStudentExam(classId, examId, password) {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return parseJson(res)
}

export async function fetchStudentExamSession(classId, examId) {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/session`)
  return parseJson(res)
}

export async function stampStudentExamSessionStart(classId, examId) {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/session/start`, {
    method: 'POST',
  })
  return parseJson(res)
}

export async function logExamCheating(classId, examId, eventType, details) {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/cheating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, details }),
  })
  return parseJson(res)
}

export async function lockStudentExam(classId, examId, reason = 'time_up') {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return parseJson(res)
}

export async function saveExamAnswer(classId, examId, { questionId, answerText, choiceId }) {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, answerText, choiceId }),
  })
  return parseJson(res)
}

export async function submitExamAnswers(classId, examId, answers) {
  const res = await apiFetch(`/api/student/classes/${classId}/exams/${examId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  return parseJson(res)
}
