import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchAdminUsers() {
  const res = await apiFetch('/api/admin/users')
  return parseJson(res)
}

export async function createAdminUser(payload) {
  const res = await apiFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function updateAdminUser(uid, payload) {
  const res = await apiFetch(`/api/admin/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export function roleLabel(role) {
  if (role === 'faculty') return 'Faculty'
  if (role === 'admin') return 'Administrator'
  return 'Student'
}

export function statusLabel(status) {
  if (status === 'pending') return 'Pending'
  if (status === 'inactive') return 'Inactive'
  return 'Active'
}

export function formatDateCreated(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
}
