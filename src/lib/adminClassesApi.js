import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchAdminClasses() {
  const res = await apiFetch('/api/admin/classes')
  return parseJson(res)
}

export async function createAdminClass(payload) {
  const res = await apiFetch('/api/admin/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function updateAdminClass(classId, payload) {
  const res = await apiFetch(`/api/admin/classes/${classId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function deleteAdminClass(classId) {
  const res = await apiFetch(`/api/admin/classes/${classId}`, { method: 'DELETE' })
  return parseJson(res)
}

export function examStatusLabel(status) {
  const s = String(status || 'draft').toLowerCase()
  if (s === 'open' || s === 'active') return 'Active'
  if (s === 'waiting') return 'Waiting'
  if (s === 'closed') return 'Closed'
  return 'Draft'
}

/** CSS modifier for `.exam-status-badge.status-{name}` */
export function examStatusBadgeClass(status) {
  const s = String(status || 'draft').toLowerCase()
  if (s === 'open' || s === 'active') return 'open'
  if (s === 'closed') return 'closed'
  if (s === 'waiting') return 'waiting'
  if (s === 'archived') return 'archived'
  return 'draft'
}
