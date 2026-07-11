import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchAdminMonitoring() {
  const res = await apiFetch('/api/admin/monitoring')
  return parseJson(res)
}

export async function fetchAdminAuditLogs(params = {}) {
  const qs = new URLSearchParams()
  qs.set('limit', String(params.limit ?? 500))
  if (params.search) qs.set('search', params.search)
  if (params.eventType) qs.set('eventType', params.eventType)
  if (params.examId) qs.set('examId', params.examId)
  if (params.sectionKey) qs.set('sectionKey', params.sectionKey)
  if (params.teacherMemberId) qs.set('teacherMemberId', params.teacherMemberId)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  const res = await apiFetch(`/api/admin/monitoring/audit-logs?${qs.toString()}`)
  return parseJson(res)
}

export async function exportAdminAuditLogs(filters = {}) {
  const res = await apiFetch('/api/admin/monitoring/audit-logs/export', {
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
  const filename = match?.[1] || 'acsis-institution-audit.pdf'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
