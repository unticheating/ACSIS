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

/** Single active exam for this teacher (open preferred over waiting lobby). */
export async function fetchTeacherActiveMonitoring() {
  const res = await apiFetch('/api/teacher/classes/monitoring/active')
  return parseJson(res)
}

/** Live detections: enrolled roster merged with sessions and violation logs. */
export async function fetchTeacherMonitoringSnapshot(classId, examId) {
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/monitoring`)
  return parseJson(res)
}

export async function fetchTeacherExamAssignments(classId, examId) {
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/assignments`)
  return parseJson(res)
}

export async function updateTeacherExamAssignments(classId, examId, studentIds) {
  const res = await apiFetch(`/api/teacher/classes/${classId}/exams/${examId}/assignments`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds }),
  })
  return parseJson(res)
}

export async function fetchTeacherActivityLogs(limit = 50) {
  const res = await apiFetch(`/api/teacher/classes/activity-logs?limit=${encodeURIComponent(limit)}`)
  return parseJson(res)
}

export async function exportTeacherActivityLogs(filters = {}) {
  const res = await apiFetch('/api/teacher/classes/activity-logs/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Export failed')
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] || 'acsis-audit-logs.pdf'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Mark a cheating detection as false positive; reduces student strike count. */
export async function dismissTeacherViolation(classId, examId, sessionId, logId) {
  const res = await apiFetch(
    `/api/teacher/classes/${classId}/exams/${examId}/results/${sessionId}/violations/${logId}/dismiss`,
    { method: 'POST' },
  )
  return parseJson(res)
}
