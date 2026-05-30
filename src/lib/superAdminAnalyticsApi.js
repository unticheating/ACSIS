import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchSuperAdminAnalytics() {
  const res = await apiFetch('/api/super-admin/analytics')
  return parseJson(res)
}

export async function fetchInstitutionAdmins(institutionId) {
  const res = await apiFetch(`/api/super-admin/analytics/institutions/${institutionId}/admins`)
  const data = await parseJson(res)
  return data.admins || []
}

/**
 * @param {number} institutionId
 * @param {{ firstName: string, lastName: string, email: string, password: string, schoolId?: string, middleName?: string }} payload
 */
export async function createInstitutionAdmin(institutionId, payload) {
  const res = await apiFetch(`/api/super-admin/analytics/institutions/${institutionId}/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  return data.user
}
