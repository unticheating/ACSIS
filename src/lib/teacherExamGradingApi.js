import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function manualGradeAnswer(classId, examId, sessionId, answerId, payload) {
  const body =
    typeof payload === 'boolean'
      ? { isCorrect: payload }
      : payload && typeof payload === 'object'
        ? payload
        : {}
  const res = await apiFetch(
    `/api/teacher/classes/${classId}/exams/${examId}/results/${sessionId}/answers/${answerId}/grade`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return parseJson(res)
}

export async function releaseExamScores(
  classId,
  examId,
  { sendEmail = true, includeAnswerKey = false, sessionIds = null } = {},
) {
  const body = { sendEmail, includeAnswerKey }
  if (Array.isArray(sessionIds) && sessionIds.length > 0) {
    body.sessionIds = sessionIds
  }
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/release-scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJson(res)
}

export async function exportExamReport(classId, examId, { format = 'pdf', reportType = 'class_results', teacherLogoBase64, departmentName } = {}) {
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/reports/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, reportType, teacherLogoBase64, departmentName }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Export failed')
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] || `acsis-report-${examId}.${format === 'csv' ? 'csv' : 'pdf'}`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportExamPaper(classId, examId, { teacherLogoBase64, departmentName } = {}) {
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/paper/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherLogoBase64, departmentName }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Export failed')
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] || `acsis-exam-paper-${examId}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
