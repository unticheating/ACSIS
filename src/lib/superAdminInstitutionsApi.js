import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchSuperAdminInstitutions() {
  const res = await apiFetch('/api/super-admin/institutions')
  const data = await parseJson(res)
  return data.institutions || []
}

export async function fetchSuperAdminThemes() {
  const res = await apiFetch('/api/super-admin/institutions/themes')
  const data = await parseJson(res)
  return data.themes || []
}

/**
 * @param {{
 *   institutionName: string
 *   acronym: string
 *   logo?: string | null
 *   themeId: number
 *   maxWarnings?: number
 *   admin?: { firstName: string, lastName: string, email: string, password: string, schoolId?: string }
 * }} payload
 */
export async function createSuperAdminInstitution(payload) {
  const res = await apiFetch('/api/super-admin/institutions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  return data.institution
}
