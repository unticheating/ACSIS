import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchAdminViolations() {
  const res = await apiFetch('/api/admin/violations')
  return parseJson(res)
}

export async function fetchAdminViolationDetail(sessionId) {
  const res = await apiFetch(`/api/admin/violations/${sessionId}`)
  return parseJson(res)
}

export async function issueViolationTicket(sessionId) {
  const res = await apiFetch(`/api/admin/violations/${sessionId}/ticket`, {
    method: 'POST',
  })
  return parseJson(res)
}

export function formatViolationDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function violationStatusClass(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '-')
}

export function formatViolationDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
}
