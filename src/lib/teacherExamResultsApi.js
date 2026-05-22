import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchTeacherReportExams() {
  const res = await apiFetch('/api/teacher/classes/reports/exams')
  const data = await parseJson(res)
  return data.exams || []
}

export async function fetchTeacherExamResults(classId, examId) {
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/results`)
  return parseJson(res)
}

export async function fetchTeacherExamSessionDetail(classId, examId, sessionId) {
  const res = await apiFetch(
    `/api/teacher/classes/${classId}/exams/${examId}/results/${sessionId}`,
  )
  return parseJson(res)
}
