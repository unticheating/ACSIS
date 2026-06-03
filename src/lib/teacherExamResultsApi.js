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
