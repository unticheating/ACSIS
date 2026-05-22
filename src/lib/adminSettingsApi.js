import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchAdminSettings() {
  const res = await apiFetch('/api/admin/settings')
  return parseJson(res)
}

/** @param {number} themeId */
export async function updateInstitutionTheme(themeId) {
  const res = await apiFetch('/api/admin/settings/theme', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeId }),
  })
  return parseJson(res)
}

/**
 * @param {{ institutionName?: string, acronym?: string, maxWarnings?: number, logo?: string | null }} payload
 */
export async function updateInstitutionProfile(payload) {
  const res = await apiFetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}
